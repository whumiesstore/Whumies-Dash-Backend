import { ApiError } from "../utils/ApiError.js";
import { pickValue } from "../utils/normalizeHeader.js";
import {
    getAmazonPaymentRange,
    isDateInsideRange,
    parseDateValue,
    parseNumber,
} from "../utils/reportDate.js";

const PAYMENT_ALIASES = {
    settlementId: ["settlement-id"],
    transactionType: ["type", "transaction-type"],
    orderId: ["order-id", "amazon-order-id", "merchant-order-id"],
    postedDate: ["datetime", "date-time", "posted-date", "posted-date-time", "date"],
    sku: ["sku", "seller-sku"],
    description: ["description"],
    quantityPurchased: ["quantity-purchased", "quantity"],
    marketplace: ["marketplace"],
    accountType: ["account-type"],
    fulfillment: ["fulfillment"],
    orderCity: ["order-city"],
    orderState: ["order-state"],
    orderPostal: ["order-postal"],
    productSales: ["product-sales"],
    shippingCredits: ["shipping-credits"],
    giftWrapCredits: ["gift-wrap-credits"],
    promotionalRebates: ["promotional-rebates"],
    taxWithoutTCS: ["total-sales-tax-liablegst-before-adjusting-tcs"],
    tcsCGST: ["tcs-cgst"],
    tcsSGST: ["tcs-sgst"],
    tcsIGST: ["tcs-igst"],
    tds: ["tds-section-194-o"],
    sellingFees: ["selling-fees"],
    fbaFees: ["fba-fees"],
    otherTransactionFees: ["other-transaction-fees"],
    other: ["other"],
    total: ["total"],
    transactionStatus: ["transaction-status"],
    transactionReleaseDate: ["transaction-release-date"]
};

function getRequiredColumnErrors(firstRow) {
    const required = [
        {
            label: "posted-date/date-time",
            aliases: PAYMENT_ALIASES.postedDate,
        },
        {
            label: "total",
            aliases: PAYMENT_ALIASES.total,
        },
    ];

    return required
        .filter((item) => pickValue(firstRow, item.aliases) === "")
        .map((item) => ({
            field: "paymentsFile",
            message: `Missing required column: ${item.label}`,
        }));
}

export function formatDateForMessage(date, timeZone = "Asia/Kolkata") {
    if (!date) return "";

    return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function isUploadedPaymentRangeValid({
    minReportDate,
    maxReportDate,
    expectedStartDate,
    expectedEndDate,
}) {
    if (!minReportDate || !maxReportDate) return false;

    return minReportDate >= expectedStartDate && maxReportDate <= expectedEndDate;
}

export function parseAmazonPaymentRows(rows, reportMonth, orderIds = []) {
    if (!rows.length) {
        throw new ApiError(400, "Payments report validation failed", [
            {
                field: "paymentsFile",
                message: "Payments report does not contain any rows.",
            },
        ]);
    }

    const requiredColumnErrors = getRequiredColumnErrors(rows[0]);

    if (requiredColumnErrors.length) {
        throw new ApiError(
            400,
            "Payments report validation failed",
            requiredColumnErrors,
        );
    }

    const { startDate, endDate } = getAmazonPaymentRange(reportMonth);
    const orderIdSet = new Set(orderIds);

    const parsedRows = [];
    const warnings = [];

    let minReportDate = null;
    let maxReportDate = null;
    let validDateRowCount = 0;
    let invalidDateRowCount = 0;

    /**
     * First pass:
     * Read date range of uploaded payment report.
     * Do not insert/parse final rows yet.
     */
    rows.forEach((row) => {
        const postedDate = parseDateValue(
            pickValue(row, PAYMENT_ALIASES.postedDate),
        );

        if (!postedDate) {
            invalidDateRowCount += 1;
            return;
        }

        validDateRowCount += 1;

        if (!minReportDate || postedDate < minReportDate) {
            minReportDate = postedDate;
        }

        if (!maxReportDate || postedDate > maxReportDate) {
            maxReportDate = postedDate;
        }
    });

    if (!validDateRowCount) {
        throw new ApiError(400, "Payments report validation failed", [
            {
                field: "paymentsFile",
                code: "NO_VALID_PAYMENT_DATES",
                message: "No valid dates found in payments report.",
                selectedReportMonth: reportMonth,
                expectedStartDate: formatDateForMessage(startDate),
                expectedEndDate: formatDateForMessage(endDate),
            },
        ]);
    }

    if (
        !isUploadedPaymentRangeValid({
            minReportDate,
            maxReportDate,
            expectedStartDate: startDate,
            expectedEndDate: endDate,
        })
    ) {
        throw new ApiError(400, "Payments report validation failed", [
            {
                field: "paymentsFile",
                code: "PAYMENT_DATE_RANGE_MISMATCH",
                message: `Uploaded payments report date range ${formatDateForMessage(
                    minReportDate,
                )} to ${formatDateForMessage(
                    maxReportDate,
                )} is outside the expected payment range ${formatDateForMessage(
                    startDate,
                )} to ${formatDateForMessage(
                    endDate,
                )} for selected report month ${reportMonth}.`,
                selectedReportMonth: reportMonth,
                expectedStartDate: formatDateForMessage(startDate),
                expectedEndDate: formatDateForMessage(endDate),
                uploadedMinReportDate: formatDateForMessage(minReportDate),
                uploadedMaxReportDate: formatDateForMessage(maxReportDate),
            },
        ]);
    }

    if (invalidDateRowCount) {
        warnings.push({
            field: "paymentsFile",
            message: `${invalidDateRowCount} payment rows had invalid posted dates and were ignored.`,
        });
    }

    /**
     * Second pass:
     * Now range is valid, parse rows.
     * Rows with invalid dates are skipped.
     */
    rows.forEach((row, index) => {
        const postedDate = parseDateValue(
            pickValue(row, PAYMENT_ALIASES.postedDate),
        );

        if (!postedDate) {
            warnings.push({
                row: index + 2,
                message: "Skipped row because posted date is invalid.",
            });
            return;
        }

        const totalValue = pickValue(row, PAYMENT_ALIASES.total);
        const total = parseNumber(totalValue);

        if (totalValue === "" || !Number.isFinite(total)) {
            warnings.push({
                row: index + 2,
                message: "Skipped row because total is missing or invalid.",
            });
            return;
        }

        const orderId = String(pickValue(row, PAYMENT_ALIASES.orderId)).trim();

        parsedRows.push({
            settlementId: String(pickValue(row, PAYMENT_ALIASES.settlementId)).trim(),
            transactionType: String(
                pickValue(row, PAYMENT_ALIASES.transactionType),
            ).trim(),
            orderId,
            postedDate,
            sku: String(pickValue(row, PAYMENT_ALIASES.sku)).trim(),
            description: String(pickValue(row, PAYMENT_ALIASES.description)).trim(),
            quantityPurchased: parseNumber(
                pickValue(row, PAYMENT_ALIASES.quantityPurchased),
            ),
            marketplace: String(pickValue(row, PAYMENT_ALIASES.marketplace)).trim(),
            accountType: String(pickValue(row, PAYMENT_ALIASES.accountType)).trim(),
            fulfillment: String(pickValue(row, PAYMENT_ALIASES.fulfillment)).trim(),
            orderCity: String(pickValue(row, PAYMENT_ALIASES.orderCity)).trim(),
            orderState: String(pickValue(row, PAYMENT_ALIASES.orderState)).trim(),
            orderPostal: String(pickValue(row, PAYMENT_ALIASES.orderPostal)).trim(),

            productSales: parseNumber(pickValue(row, PAYMENT_ALIASES.productSales)),
            shippingCredits: parseNumber(
                pickValue(row, PAYMENT_ALIASES.shippingCredits),
            ),
            giftWrapCredits: parseNumber(
                pickValue(row, PAYMENT_ALIASES.giftWrapCredits),
            ),
            promotionalRebates: parseNumber(
                pickValue(row, PAYMENT_ALIASES.promotionalRebates),
            ),

            taxWithoutTCS: parseNumber(
                pickValue(row, PAYMENT_ALIASES.taxWithoutTCS),
            ),
            tcsCGST: parseNumber(pickValue(row, PAYMENT_ALIASES.tcsCGST)),
            tcsSGST: parseNumber(pickValue(row, PAYMENT_ALIASES.tcsSGST)),
            tcsIGST: parseNumber(pickValue(row, PAYMENT_ALIASES.tcsIGST)),
            tds: parseNumber(pickValue(row, PAYMENT_ALIASES.tds)),

            sellingFees: parseNumber(pickValue(row, PAYMENT_ALIASES.sellingFees)),
            fbaFees: parseNumber(pickValue(row, PAYMENT_ALIASES.fbaFees)),
            otherTransactionFees: parseNumber(
                pickValue(row, PAYMENT_ALIASES.otherTransactionFees),
            ),
            other: parseNumber(pickValue(row, PAYMENT_ALIASES.other)),
            total,

            transactionStatus: String(
                pickValue(row, PAYMENT_ALIASES.transactionStatus),
            ).trim(),
            transactionReleaseDate: parseDateValue(
                pickValue(row, PAYMENT_ALIASES.transactionReleaseDate),
            ),

            rawRow: row,
        });
    });

    if (!parsedRows.length) {
        throw new ApiError(400, "Payments report validation failed", [
            {
                field: "paymentsFile",
                code: "NO_VALID_PAYMENT_ROWS",
                message: "No valid payment rows found in payments report.",
                selectedReportMonth: reportMonth,
                expectedStartDate: formatDateForMessage(startDate),
                expectedEndDate: formatDateForMessage(endDate),
                uploadedMinReportDate: formatDateForMessage(minReportDate),
                uploadedMaxReportDate: formatDateForMessage(maxReportDate),
            },
        ]);
    }

    const matchedOrderIds = new Set();

    parsedRows.forEach((row) => {
        if (row.orderId && orderIdSet.has(row.orderId)) {
            matchedOrderIds.add(row.orderId);
        }
    });

    if (orderIdSet.size && matchedOrderIds.size === 0) {
        warnings.push({
            field: "paymentsFile",
            message:
                "No payment rows matched uploaded order IDs. Please verify the settlement report.",
        });
    }

    return {
        parsedRows,
        matchedOrderCount: matchedOrderIds.size,
        unmatchedOrderCount: Math.max(orderIdSet.size - matchedOrderIds.size, 0),
        validationWarnings: warnings,
        uploadedPaymentRange: {
            minReportDate: formatDateForMessage(minReportDate),
            maxReportDate: formatDateForMessage(maxReportDate),
        },
        expectedPaymentRange: {
            startDate: formatDateForMessage(startDate),
            endDate: formatDateForMessage(endDate),
        },
    };
}
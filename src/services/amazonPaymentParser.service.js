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
    postedDate: ["date-time", "posted-date", "posted-date-time", "date"],
    sku: ["sku", "seller-sku"],
    description: ["description"],
    quantityPurchased: ["quantity-purchased", "quantity"],
    marketplace: ["marketplace"],
    accountType: ["account-type"],
    fulfillment: ["fulfillment"],
    orderCity: ["order-city"],
    orderState: ["order-state"],
    productSales: ["product-sales"],
    productSalesTax: ["product-sales-tax"],
    shippingCredits: ["shipping-credits"],
    shippingCreditsTax: ["shipping-credits-tax"],
    giftWrapCredits: ["gift-wrap-credits"],
    giftWrapCreditsTax: ["giftwrap-credits-tax", "gift-wrap-credits-tax"],
    promotionalRebates: ["promotional-rebates"],
    promotionalRebatesTax: ["promotional-rebates-tax"],
    marketplaceWithheldTax: ["marketplace-withheld-tax"],
    sellingFees: ["selling-fees"],
    fbaFees: ["fba-fees"],
    otherTransactionFees: ["other-transaction-fees"],
    other: ["other"],
    total: ["total"],
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

    rows.forEach((row, index) => {
        const postedDate = parseDateValue(pickValue(row, PAYMENT_ALIASES.postedDate));

        if (!postedDate) {
            warnings.push({
                row: index + 2,
                message: "Skipped row because posted date is invalid.",
            });
            return;
        }

        if (!isDateInsideRange(postedDate, startDate, endDate)) {
            warnings.push({
                row: index + 2,
                message: "Skipped row because posted date is outside expected payment range.",
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
            productSales: parseNumber(pickValue(row, PAYMENT_ALIASES.productSales)),
            productSalesTax: parseNumber(
                pickValue(row, PAYMENT_ALIASES.productSalesTax),
            ),
            shippingCredits: parseNumber(
                pickValue(row, PAYMENT_ALIASES.shippingCredits),
            ),
            shippingCreditsTax: parseNumber(
                pickValue(row, PAYMENT_ALIASES.shippingCreditsTax),
            ),
            giftWrapCredits: parseNumber(
                pickValue(row, PAYMENT_ALIASES.giftWrapCredits),
            ),
            giftWrapCreditsTax: parseNumber(
                pickValue(row, PAYMENT_ALIASES.giftWrapCreditsTax),
            ),
            promotionalRebates: parseNumber(
                pickValue(row, PAYMENT_ALIASES.promotionalRebates),
            ),
            promotionalRebatesTax: parseNumber(
                pickValue(row, PAYMENT_ALIASES.promotionalRebatesTax),
            ),
            marketplaceWithheldTax: parseNumber(
                pickValue(row, PAYMENT_ALIASES.marketplaceWithheldTax),
            ),
            sellingFees: parseNumber(pickValue(row, PAYMENT_ALIASES.sellingFees)),
            fbaFees: parseNumber(pickValue(row, PAYMENT_ALIASES.fbaFees)),
            otherTransactionFees: parseNumber(
                pickValue(row, PAYMENT_ALIASES.otherTransactionFees),
            ),
            other: parseNumber(pickValue(row, PAYMENT_ALIASES.other)),
            total: parseNumber(pickValue(row, PAYMENT_ALIASES.total)),
            rawRow: row,
        });
    });

    if (!parsedRows.length) {
        throw new ApiError(400, "Payments report validation failed", [
            {
                field: "paymentsFile",
                message: "No valid payment rows found in expected payment range.",
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
    };
}
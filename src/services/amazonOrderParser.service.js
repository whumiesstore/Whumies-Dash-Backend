import { ApiError } from "../utils/ApiError.js";
import { pickValue } from "../utils/normalizeHeader.js";
import {
    isDateInsideReportMonth,
    parseDateValue,
    parseNumber,
} from "../utils/reportDate.js";

const ORDER_ALIASES = {
    orderId: ["amazon-order-id", "order-id", "amazon-order-number"],
    orderItemId: ["order-item-id", "order-item-code"],
    orderDate: ["purchase-date", "order-date", "date"],
    shipDate: ["ship-date", "shipment-date"],
    sku: ["sku", "seller-sku"],
    asin: ["asin"],
    productName: ["product-name", "item-name", "title"],
    quantity: ["quantity", "quantity-purchased", "qty"],
    itemPrice: ["item-price", "item-total", "price"],
    itemTax: ["item-tax"],
    shippingPrice: ["shipping-price", "shipping-total"],
    shippingTax: ["shipping-tax"],
    giftWrapPrice: ["gift-wrap-price"],
    giftWrapTax: ["gift-wrap-tax"],
    itemPromotionDiscount: ["item-promotion-discount"],
    shipPromotionDiscount: ["ship-promotion-discount"],
    itemStatus: ["item-status", "order-status", "status"],
    fulfillment: ["fulfillment-channel", "fulfillment"],
    salesChannel: ["sales-channel", "marketplace"],
    shipCity: ["ship-city"],
    shipState: ["ship-state", "ship-state-name", "state"],
    shipPostalCode: ["ship-postal-code", "postal-code", "pincode"],
};

function getRequiredColumnErrors(firstRow) {
    const required = [
        {
            field: "orderId",
            label: "order-id",
            aliases: ORDER_ALIASES.orderId,
        },
        {
            field: "orderDate",
            label: "purchase-date/order-date",
            aliases: ORDER_ALIASES.orderDate,
        },
        {
            field: "sku",
            label: "sku",
            aliases: ORDER_ALIASES.sku,
        },
        {
            field: "quantity",
            label: "quantity",
            aliases: ORDER_ALIASES.quantity,
        },
    ];

    return required
        .filter((item) => pickValue(firstRow, item.aliases) === "")
        .map((item) => ({
            field: "ordersFile",
            message: `Missing required column: ${item.label}`,
        }));
}

export function parseAmazonOrdersRows(rows, reportMonth) {
    if (!rows.length) {
        throw new ApiError(400, "Orders report validation failed", [
            {
                field: "ordersFile",
                message: "Orders report does not contain any rows.",
            },
        ]);
    }

    const requiredColumnErrors = getRequiredColumnErrors(rows[0]);

    if (requiredColumnErrors.length) {
        throw new ApiError(
            400,
            "Orders report validation failed",
            requiredColumnErrors,
        );
    }

    const parsedRows = [];
    const warnings = [];
    const duplicateKeys = new Set();
    const seenKeys = new Set();

    rows.forEach((row, index) => {
        const orderId = String(
            pickValue(row, ORDER_ALIASES.orderId),
        ).trim();

        const orderItemId = String(
            pickValue(row, ORDER_ALIASES.orderItemId),
        ).trim();

        const sku = String(pickValue(row, ORDER_ALIASES.sku)).trim();

        const orderDate = parseDateValue(pickValue(row, ORDER_ALIASES.orderDate));
        const quantity = parseNumber(pickValue(row, ORDER_ALIASES.quantity));

        if (!orderId || !sku || !orderDate) {
            warnings.push({
                row: index + 2,
                message: "Skipped row because order ID, SKU, or date is missing.",
            });
            return;
        }

        if (!isDateInsideReportMonth(orderDate, reportMonth)) {
            warnings.push({
                row: index + 2,
                message: "Skipped row because order date is outside selected month.",
            });
            return;
        }

        const itemStatus = String(
            pickValue(row, ORDER_ALIASES.itemStatus),
        ).trim();

        const normalizedStatus = itemStatus.toLowerCase();

        const isCancelled = normalizedStatus.includes("cancel");

        const rowKey = `${orderId}-${orderItemId || sku}`;

        if (seenKeys.has(rowKey)) {
            duplicateKeys.add(rowKey);
            return;
        }

        seenKeys.add(rowKey);

        parsedRows.push({
            orderId,
            orderItemId,
            orderDate,
            shipDate: parseDateValue(pickValue(row, ORDER_ALIASES.shipDate)),
            sku,
            asin: String(pickValue(row, ORDER_ALIASES.asin)).trim(),
            productName: String(pickValue(row, ORDER_ALIASES.productName)).trim(),
            quantity: isCancelled ? 0 : quantity,
            itemPrice: parseNumber(pickValue(row, ORDER_ALIASES.itemPrice)),
            itemTax: parseNumber(pickValue(row, ORDER_ALIASES.itemTax)),
            shippingPrice: parseNumber(pickValue(row, ORDER_ALIASES.shippingPrice)),
            shippingTax: parseNumber(pickValue(row, ORDER_ALIASES.shippingTax)),
            giftWrapPrice: parseNumber(pickValue(row, ORDER_ALIASES.giftWrapPrice)),
            giftWrapTax: parseNumber(pickValue(row, ORDER_ALIASES.giftWrapTax)),
            itemPromotionDiscount: parseNumber(
                pickValue(row, ORDER_ALIASES.itemPromotionDiscount),
            ),
            shipPromotionDiscount: parseNumber(
                pickValue(row, ORDER_ALIASES.shipPromotionDiscount),
            ),
            itemStatus,
            fulfillment: String(pickValue(row, ORDER_ALIASES.fulfillment)).trim(),
            salesChannel: String(pickValue(row, ORDER_ALIASES.salesChannel)).trim(),
            shipCity: String(pickValue(row, ORDER_ALIASES.shipCity)).trim(),
            shipState: String(pickValue(row, ORDER_ALIASES.shipState)).trim(),
            shipPostalCode: String(pickValue(row, ORDER_ALIASES.shipPostalCode)).trim(),
            rawRow: row,
        });
    });

    const validSaleRows = parsedRows.filter((row) => row.quantity > 0);

    if (!validSaleRows.length) {
        throw new ApiError(400, "Orders report validation failed", [
            {
                field: "ordersFile",
                message: "No valid sale rows found in orders report.",
            },
        ]);
    }

    if (duplicateKeys.size) {
        warnings.push({
            field: "ordersFile",
            message: `${duplicateKeys.size} duplicate order-item rows were ignored.`,
        });
    }

    const skuMap = new Map();

    validSaleRows.forEach((row) => {
        const current = skuMap.get(row.sku) || {
            sku: row.sku,
            asin: row.asin,
            productName: row.productName,
            quantitySold: 0,
        };

        current.quantitySold += row.quantity;

        if (!current.productName && row.productName) {
            current.productName = row.productName;
        }

        if (!current.asin && row.asin) {
            current.asin = row.asin;
        }

        skuMap.set(row.sku, current);
    });

    return {
        parsedRows,
        validSaleRows,
        skus: Array.from(skuMap.values()),
        validationWarnings: warnings,
    };
}
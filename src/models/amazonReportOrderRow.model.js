import mongoose from "mongoose";

const amazonReportOrderRowSchema = new mongoose.Schema(
    {
        monthlyReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AmazonMonthlyReport",
            required: true,
            index: true,
        },

        orderId: { type: String, required: true, index: true },
        orderItemId: { type: String, default: "" },

        orderDate: { type: Date, default: null },

        sku: { type: String, required: true, index: true },
        asin: { type: String, default: "" },
        productName: { type: String, default: "" },

        quantity: { type: Number, default: 0 },

        itemPrice: { type: Number, default: 0 },
        itemTax: { type: Number, default: 0 },
        shippingPrice: { type: Number, default: 0 },
        shippingTax: { type: Number, default: 0 },
        giftWrapPrice: { type: Number, default: 0 },
        giftWrapTax: { type: Number, default: 0 },
        itemPromotionDiscount: { type: Number, default: 0 },
        shipPromotionDiscount: { type: Number, default: 0 },

        orderStatus: { type: String, default: "" },
        itemStatus: { type: String, default: "" },
        fulfillment: { type: String, default: "" },
        fulfilledBy: { type: String, default: "" },
        salesChannel: { type: String, default: "" },

        shipCity: { type: String, default: "" },
        shipState: { type: String, default: "" },
        shipPostalCode: { type: String, default: "" },

        isReplacementOrder: { type: Boolean, default: "" },
        originalOrderId: { type: String, default: "" },

        rawRow: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    },
);

amazonReportOrderRowSchema.index({
    monthlyReportId: 1,
    orderId: 1,
    orderItemId: 1,
    sku: 1,
});

export const AmazonReportOrderRow = mongoose.model(
    "AmazonReportOrderRow",
    amazonReportOrderRowSchema,
);
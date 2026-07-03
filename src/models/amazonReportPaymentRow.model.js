import mongoose from "mongoose";

const amazonReportPaymentRowSchema = new mongoose.Schema(
    {
        monthlyReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AmazonMonthlyReport",
            required: true,
            index: true,
        },

        settlementId: { type: String, default: "" },
        transactionType: { type: String, default: "" },
        orderId: { type: String, default: "", index: true },

        postedDate: { type: Date, default: null },

        sku: { type: String, default: "", index: true },
        description: { type: String, default: "" },
        quantityPurchased: { type: Number, default: 0 },

        marketplace: { type: String, default: "" },
        accountType: { type: String, default: "" },
        fulfillment: { type: String, default: "" },
        orderCity: { type: String, default: "" },
        orderState: { type: String, default: "" },
        orderPostal: { type: String, default: "" },

        productSales: { type: Number, default: 0 },
        shippingCredits: { type: Number, default: 0 },
        giftWrapCredits: { type: Number, default: 0 },
        promotionalRebates: { type: Number, default: 0 },
        taxWithoutTCS: { type: Number, default: 0 },
        tcsCGST: { type: Number, default: 0 },
        tcsSGST: { type: Number, default: 0 },
        tcsIGST: { type: Number, default: 0 },
        tds: { type: Number, default: 0 },

        sellingFees: { type: Number, default: 0 },
        fbaFees: { type: Number, default: 0 },
        otherTransactionFees: { type: Number, default: 0 },
        other: { type: Number, default: 0 },

        total: { type: Number, default: 0 },

        transactionStatus: { type: String, default: "" },
        transactionReleaseDate: { type: Date, default: null },

        rawRow: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    },
);

amazonReportPaymentRowSchema.index({
    monthlyReportId: 1,
    orderId: 1,
    sku: 1,
});

export const AmazonReportPaymentRow = mongoose.model(
    "AmazonReportPaymentRow",
    amazonReportPaymentRowSchema,
);
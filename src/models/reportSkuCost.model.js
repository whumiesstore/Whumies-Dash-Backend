import mongoose from "mongoose";

const reportSkuCostSchema = new mongoose.Schema(
    {
        monthlyReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AmazonMonthlyReport",
            required: true,
            index: true,
        },
        sku: {
            type: String,
            required: true,
            index: true,
        },
        productName: {
            type: String,
            default: "",
        },
        asin: {
            type: String,
            default: "",
        },
        fsn: {
            type: String,
            default: "",
        },
        quantitySold: {
            type: Number,
            default: 0,
        },
        productCost: {
            type: Number,
            default: 0,
        },
        productGst: {
            type: Number,
            default: 0,
        },
        packingCost: {
            type: Number,
            default: 0,
        },
        packingGst: {
            type: Number,
            default: 0,
        },
        otherCost: {
            type: Number,
            default: 0,
        },
        totalCostPerUnit: {
            type: Number,
            default: 0,
        },
        totalCogs: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    },
);

reportSkuCostSchema.index(
    {
        monthlyReportId: 1,
        sku: 1,
    },
    {
        unique: true,
    },
);

export const ReportSkuCost = mongoose.model(
    "ReportSkuCost",
    reportSkuCostSchema,
);
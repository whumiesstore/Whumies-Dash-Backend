import mongoose from "mongoose";

const amazonMonthlyReportSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        firmId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Firm",
            required: true,
            index: true,
        },

        reportMonth: {
            type: String,
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: [
                "draft",
                "orders_uploaded",
                "sku_costs_added",
                "payments_uploaded",
                "processing",
                "completed",
                "failed",
            ],
            default: "draft",
            index: true,
        },

        ordersFileOriginalName: {
            type: String,
            default: "",
        },

        paymentsFileOriginalName: {
            type: String,
            default: "",
        },

        ordersUploadedAt: {
            type: Date,
            default: null,
        },

        paymentsUploadedAt: {
            type: Date,
            default: null,
        },

        generatedAt: {
            type: Date,
            default: null,
        },

        summary: {
            netProfit: { type: Number, default: 0 },
            orders: { type: Number, default: 0 },
            roi: { type: Number, default: null },
            returns: { type: Number, default: 0 },
            settlement: { type: Number, default: 0 },
            adSpend: { type: Number, default: 0 },
            cogs: { type: Number, default: 0 },
            sales: { type: Number, default: 0 },
            expenses: { type: Number, default: 0 },
            fees: { type: Number, default: 0 },
        },

        breakdowns: {
            profitLoss: {
                type: mongoose.Schema.Types.Mixed,
                default: {},
            },
            orderSummary: {
                type: mongoose.Schema.Types.Mixed,
                default: {},
            },
            skuWiseBreakdown: {
                type: mongoose.Schema.Types.Mixed,
                default: [],
            },
            orderWiseBreakdown: {
                type: mongoose.Schema.Types.Mixed,
                default: [],
            },
            stateWiseBreakdown: {
                type: mongoose.Schema.Types.Mixed,
                default: [],
            },
        },

        validationWarnings: {
            type: [mongoose.Schema.Types.Mixed],
            default: [],
        },

        failureReason: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    },
);

amazonMonthlyReportSchema.index(
    {
        userId: 1,
        firmId: 1,
        reportMonth: 1,
    },
    {
        unique: true,
    },
);

export const AmazonMonthlyReport = mongoose.model(
    "AmazonMonthlyReport",
    amazonMonthlyReportSchema,
);
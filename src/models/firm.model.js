import mongoose from "mongoose";

const firmSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        firmName: {
            type: String,
            required: true,
            trim: true,
        },

        isPrimary: {
            type: Boolean,
            default: false,
        },

        marketplaces: {
            amazon: {
                type: Boolean,
                default: false,
            },
            flipkart: {
                type: Boolean,
                default: false,
            },
        },
    },
    {
        timestamps: true,
    },
);

firmSchema.index(
    {
        owner: 1,
        firmName: 1,
    },
    {
        unique: true,
    },
);

export const Firm = mongoose.model("Firm", firmSchema);
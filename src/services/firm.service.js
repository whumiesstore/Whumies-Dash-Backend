import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { Firm } from "../models/firm.model.js";

function toSafeFirmObject(firm) {
    return {
        id: firm._id,
        firmName: firm.firmName,
        isPrimary: firm.isPrimary,
        marketplaces: firm.marketplaces,
        createdAt: firm.createdAt,
        updatedAt: firm.updatedAt,
    };
}

export async function createDefaultPrimaryFirm({
    userId,
    firmName,
    sellOnAmazon,
    sellOnFlipkart,
}) {
    const existingPrimaryFirm = await Firm.findOne({
        owner: userId,
        isPrimary: true,
    });

    if (existingPrimaryFirm) {
        return toSafeFirmObject(existingPrimaryFirm);
    }

    const firm = await Firm.create({
        owner: userId,
        firmName,
        isPrimary: true,
        marketplaces: {
            amazon: Boolean(sellOnAmazon),
            flipkart: Boolean(sellOnFlipkart),
        },
    });

    return toSafeFirmObject(firm);
}

export async function getUserFirms({ userId }) {
    const firms = await Firm.find({
        owner: userId,
    }).sort({
        isPrimary: -1,
        createdAt: 1,
    });

    return firms.map(toSafeFirmObject);
}

export async function getUserFirmById({ userId, firmId }) {
    if (!mongoose.Types.ObjectId.isValid(firmId)) {
        throw new ApiError(400, "Invalid firm ID.");
    }

    const firm = await Firm.findOne({
        _id: firmId,
        owner: userId,
    });

    if (!firm) {
        throw new ApiError(404, "Firm not found.");
    }

    return toSafeFirmObject(firm);
}

export async function createUserFirm({
    userId,
    firmName,
    isPrimary = false,
    sellOnAmazon,
    sellOnFlipkart,
}) {
    const existingFirm = await Firm.findOne({
        owner: userId,
        firmName,
    });

    if (existingFirm) {
        throw new ApiError(409, "A firm with this name already exists.");
    }

    if (isPrimary) {
        await Firm.updateMany(
            {
                owner: userId,
            },
            {
                $set: {
                    isPrimary: false,
                },
            },
        );
    }

    const firm = await Firm.create({
        owner: userId,
        firmName,
        isPrimary: Boolean(isPrimary),
        marketplaces: {
            amazon: Boolean(sellOnAmazon),
            flipkart: Boolean(sellOnFlipkart),
        },
    });

    return toSafeFirmObject(firm);
}

export async function updateUserFirm({
    userId,
    firmId,
    firmName,
    isPrimary,
    sellOnAmazon,
    sellOnFlipkart,
}) {
    if (!mongoose.Types.ObjectId.isValid(firmId)) {
        throw new ApiError(400, "Invalid firm ID.");
    }

    const firm = await Firm.findOne({
        _id: firmId,
        owner: userId,
    });

    if (!firm) {
        throw new ApiError(404, "Firm not found.");
    }

    if (firmName !== undefined && firmName !== firm.firmName) {
        const existingFirm = await Firm.findOne({
            owner: userId,
            firmName,
            _id: {
                $ne: firmId,
            },
        });

        if (existingFirm) {
            throw new ApiError(409, "A firm with this name already exists.");
        }

        firm.firmName = firmName;
    }

    if (sellOnAmazon !== undefined || sellOnFlipkart !== undefined) {
        firm.marketplaces = {
            amazon:
                sellOnAmazon !== undefined
                    ? Boolean(sellOnAmazon)
                    : Boolean(firm.marketplaces?.amazon),

            flipkart:
                sellOnFlipkart !== undefined
                    ? Boolean(sellOnFlipkart)
                    : Boolean(firm.marketplaces?.flipkart),
        };
    }

    if (isPrimary === true && !firm.isPrimary) {
        await Firm.updateMany(
            {
                owner: userId,
                _id: {
                    $ne: firmId,
                },
            },
            {
                $set: {
                    isPrimary: false,
                },
            },
        );

        firm.isPrimary = true;
    }

    if (isPrimary === false && firm.isPrimary) {
        const primaryFirmCount = await Firm.countDocuments({
            owner: userId,
            isPrimary: true,
        });

        if (primaryFirmCount <= 1) {
            throw new ApiError(400, "At least one firm must be primary.");
        }

        firm.isPrimary = false;
    }

    await firm.save();

    return toSafeFirmObject(firm);
}

export async function deleteUserFirm({ userId, firmId }) {
    if (!mongoose.Types.ObjectId.isValid(firmId)) {
        throw new ApiError(400, "Invalid firm ID.");
    }

    const firm = await Firm.findOne({
        _id: firmId,
        owner: userId,
    });

    if (!firm) {
        throw new ApiError(404, "Firm not found.");
    }

    if (firm.isPrimary) {
        throw new ApiError(
            400,
            "Primary firm cannot be deleted. Please make another firm primary first.",
        );
    }

    await firm.deleteOne();

    return true;
}

export async function setPrimaryFirm({ userId, firmId }) {
    if (!mongoose.Types.ObjectId.isValid(firmId)) {
        throw new ApiError(400, "Invalid firm ID.");
    }

    const firm = await Firm.findOne({
        _id: firmId,
        owner: userId,
    });

    if (!firm) {
        throw new ApiError(404, "Firm not found.");
    }

    await Firm.updateMany(
        {
            owner: userId,
        },
        {
            $set: {
                isPrimary: false,
            },
        },
    );

    firm.isPrimary = true;
    await firm.save();

    return toSafeFirmObject(firm);
}
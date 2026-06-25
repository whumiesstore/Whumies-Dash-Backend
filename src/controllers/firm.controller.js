import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
    createUserFirm,
    deleteUserFirm,
    getUserFirmById,
    getUserFirms,
    setPrimaryFirm,
    updateUserFirm,
} from "../services/firm.service.js";

export const listFirms = asyncHandler(async (req, res) => {
    const firms = await getUserFirms({
        userId: req.user._id,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { firms }, "Firms fetched successfully"));
});

export const getFirm = asyncHandler(async (req, res) => {
    const firm = await getUserFirmById({
        userId: req.user._id,
        firmId: req.params.firmId,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { firm }, "Firm fetched successfully"));
});

export const createFirm = asyncHandler(async (req, res) => {
    const { firmName, isPrimary, sellOnAmazon, sellOnFlipkart } = req.body;

    const firm = await createUserFirm({
        userId: req.user._id,
        firmName,
        isPrimary,
        sellOnAmazon,
        sellOnFlipkart,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, { firm }, "Firm created successfully"));
});

export const updateFirm = asyncHandler(async (req, res) => {
    const { firmName, isPrimary, sellOnAmazon, sellOnFlipkart } = req.body;

    const firm = await updateUserFirm({
        userId: req.user._id,
        firmId: req.params.firmId,
        firmName,
        isPrimary,
        sellOnAmazon,
        sellOnFlipkart,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { firm }, "Firm updated successfully"));
});

export const deleteFirm = asyncHandler(async (req, res) => {
    await deleteUserFirm({
        userId: req.user._id,
        firmId: req.params.firmId,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Firm deleted successfully"));
});

export const makeFirmPrimary = asyncHandler(async (req, res) => {
    const firm = await setPrimaryFirm({
        userId: req.user._id,
        firmId: req.params.firmId,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { firm }, "Primary firm updated successfully"));
});
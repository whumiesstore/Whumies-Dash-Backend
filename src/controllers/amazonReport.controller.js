import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
    generateAmazonMonthlyReport,
    getAmazonFinalReport,
    getAmazonReportMonths,
    saveAmazonSkuCosts,
    startAmazonReport,
    uploadAmazonOrdersReport,
    uploadAmazonPaymentsReport,
} from "../services/amazonReport.service.js";

export const startAmazonReportSession = asyncHandler(async (req, res) => {
    const { firmId, reportMonth } = req.body;

    const report = await startAmazonReport({
        userId: req.user._id,
        firmId,
        reportMonth,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                reportId: report._id,
                firmId: report.firmId,
                reportMonth: report.reportMonth,
                status: report.status,
            },
            "Report session started.",
        ),
    );
});

export const uploadAmazonOrders = asyncHandler(async (req, res) => {
    const result = await uploadAmazonOrdersReport({
        userId: req.user._id,
        reportId: req.params.reportId,
        file: req.file,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Orders report uploaded successfully."));
});

export const saveSkuCosts = asyncHandler(async (req, res) => {
    const result = await saveAmazonSkuCosts({
        userId: req.user._id,
        reportId: req.params.reportId,
        costs: req.body.costs,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, result, "SKU costs saved successfully."));
});

export const uploadAmazonPayments = asyncHandler(async (req, res) => {
    const result = await uploadAmazonPaymentsReport({
        userId: req.user._id,
        reportId: req.params.reportId,
        file: req.file,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Payments report uploaded successfully.",
        ),
    );
});

export const generateAmazonReport = asyncHandler(async (req, res) => {
    const report = await generateAmazonMonthlyReport({
        userId: req.user._id,
        reportId: req.params.reportId,
        forceRegenerate: Boolean(req.body?.forceRegenerate),
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                reportId: report._id,
                firmId: report.firmId,
                marketplace: "amazon",
                reportMonth: report.reportMonth,
                status: report.status,
                summary: report.summary,
            },
            "Amazon report generated successfully.",
        ),
    );
});

export const listAmazonReportMonths = asyncHandler(async (req, res) => {
    const months = await getAmazonReportMonths({
        userId: req.user._id,
        firmId: req.params.firmId,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                marketplace: "amazon",
                firmId: req.params.firmId,
                months,
            },
            "Amazon report months fetched successfully.",
        ),
    );
});

export const getAmazonReportDetails = asyncHandler(async (req, res) => {
    const report = await getAmazonFinalReport({
        userId: req.user._id,
        firmId: req.params.firmId,
        year: req.params.year,
        month: req.params.month,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, report, "Amazon report fetched successfully."));
});
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { Firm } from "../models/firm.model.js";
import { AmazonMonthlyReport } from "../models/amazonMonthlyReport.model.js";
import { AmazonReportOrderRow } from "../models/amazonReportOrderRow.model.js";
import { AmazonReportPaymentRow } from "../models/amazonReportPaymentRow.model.js";
import { ReportSkuCost } from "../models/reportSkuCost.model.js";
import { parseUploadedFile } from "../utils/fileParser.js";
import { parseAmazonOrdersRows } from "./amazonOrderParser.service.js";
import { parseAmazonPaymentRows } from "./amazonPaymentParser.service.js";
import { calculateAmazonReport } from "./reportCalculation.service.js";
import { roundMoney } from "../utils/reportDate.js";

async function verifyFirmOwnership({ userId, firmId }) {
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

    return firm;
}

async function getOwnedReport({ userId, reportId }) {
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
        throw new ApiError(400, "Invalid report ID.");
    }

    const report = await AmazonMonthlyReport.findOne({
        _id: reportId,
        userId,
    });

    if (!report) {
        throw new ApiError(404, "Report not found.");
    }

    await verifyFirmOwnership({
        userId,
        firmId: report.firmId,
    });

    return report;
}

function getSkuTotalCostPerUnit(cost) {
    return (
        Number(cost.productCost || 0) +
        Number(cost.productGst || 0) +
        Number(cost.packingCost || 0) +
        Number(cost.packingGst || 0) +
        Number(cost.otherCost || 0)
    );
}

export async function startAmazonReport({ userId, firmId, reportMonth }) {
    await verifyFirmOwnership({
        userId,
        firmId,
    });

    /* yyyy-mm */
    if (!/^\d{4}-\d{2}$/.test(reportMonth)) {
        throw new ApiError(400, "Invalid report month. Use YYYY-MM format.");
    }

    const report = await AmazonMonthlyReport.findOneAndUpdate(
        {
            userId,
            firmId,
            reportMonth,
        },
        {
            $setOnInsert: {
                userId,
                firmId,
                reportMonth,
                status: "draft",
            },
        },
        {
            new: true,
            upsert: true,
        },
    );

    return report;
}

export async function uploadAmazonOrdersReport({ userId, reportId, file }) {
    const report = await getOwnedReport({
        userId,
        reportId,
    });

    if (!file) {
        throw new ApiError(400, "Orders report file is required.");
    }

    const rows = parseUploadedFile(file.path, file.originalname);

    const parsed = parseAmazonOrdersRows(rows, report.reportMonth);

    await AmazonReportOrderRow.deleteMany({
        monthlyReportId: report._id,
    });

    await ReportSkuCost.deleteMany({
        monthlyReportId: report._id,
    });

    await AmazonReportPaymentRow.deleteMany({
        monthlyReportId: report._id,
    });

    await AmazonReportOrderRow.insertMany(
        parsed.parsedRows.map((row) => ({
            ...row,
            monthlyReportId: report._id,
        })),
    );

    report.status = "orders_uploaded";
    report.ordersFileOriginalName = file.originalname;
    report.ordersUploadedAt = new Date();
    report.generatedAt = null;
    report.failureReason = "";
    report.summary = {};
    report.breakdowns = {};
    report.validationWarnings = parsed.validationWarnings;

    await report.save();

    const uniqueOrderIds = new Set(
        parsed.validSaleRows.map((row) => row.orderId),
    );

    return {
        reportId: report._id,
        status: report.status,
        totalRows: rows.length,
        totalOrders: uniqueOrderIds.size,
        totalOrderItems: parsed.validSaleRows.length,
        uniqueSkuCount: parsed.skus.length,
        skus: parsed.skus,
        validationWarnings: parsed.validationWarnings,
    };
}

export async function saveAmazonSkuCosts({ userId, reportId, costs }) {
    const report = await getOwnedReport({
        userId,
        reportId,
    });

    if (!Array.isArray(costs) || !costs.length) {
        throw new ApiError(400, "SKU cost validation failed", [
            {
                field: "skuCosts",
                message: "At least one SKU cost row is required.",
            },
        ]);
    }

    const orderRows = await AmazonReportOrderRow.find({
        monthlyReportId: report._id,
        quantity: {
            $gt: 0,
        },
    }).lean();

    if (!orderRows.length) {
        throw new ApiError(400, "Please upload orders report before SKU costs.");
    }

    const skuMap = new Map();

    orderRows.forEach((row) => {
        const current = skuMap.get(row.sku) || {
            sku: row.sku,
            asin: row.asin,
            productName: row.productName,
            quantitySold: 0,
        };

        current.quantitySold += Number(row.quantity || 0);

        skuMap.set(row.sku, current);
    });

    const requiredSkus = Array.from(skuMap.keys());
    const submittedSkuSet = new Set();
    const errors = [];

    costs.forEach((cost, index) => {
        const sku = String(cost.sku || "").trim();

        if (!sku) {
            errors.push({
                field: `costs.${index}.sku`,
                message: "SKU is required.",
            });
            return;
        }

        if (!skuMap.has(sku)) {
            errors.push({
                field: `costs.${index}.sku`,
                message: `Unknown SKU submitted: ${sku}`,
            });
        }

        if (submittedSkuSet.has(sku)) {
            errors.push({
                field: `costs.${index}.sku`,
                message: `Duplicate SKU cost row: ${sku}`,
            });
        }

        submittedSkuSet.add(sku);

        ["productCost", "productGst", "packingCost", "packingGst", "otherCost"].forEach((field) => {
            const value = Number(cost[field] || 0);

            if (!Number.isFinite(value) || value < 0) {
                errors.push({
                    field: `costs.${index}.${field}`,
                    message: `${field} must be a non-negative number.`,
                });
            }
        });

        const totalCostPerUnit = getSkuTotalCostPerUnit(cost);

        if (totalCostPerUnit <= 0) {
            errors.push({
                field: `costs.${index}`,
                message: `Total cost per unit must be greater than 0 for SKU ${sku}.`,
            });
        }
    });

    const missingSkus = requiredSkus.filter((sku) => !submittedSkuSet.has(sku));

    if (missingSkus.length) {
        errors.push({
            field: "skuCosts",
            message: `${missingSkus.length} SKUs are missing product cost.`,
            missingSkus,
        });
    }

    if (errors.length) {
        throw new ApiError(400, "SKU cost validation failed", errors);
    }

    await ReportSkuCost.deleteMany({
        monthlyReportId: report._id,
    });

    const costDocs = costs.map((cost) => {
        const sku = String(cost.sku).trim();
        const skuDetails = skuMap.get(sku);

        const productCost = Number(cost.productCost || 0);
        const productGst = Number(cost.productGst || 0);
        const packingCost = Number(cost.packingCost || 0);
        const packingGst = Number(cost.packingGst || 0);
        const otherCost = Number(cost.otherCost || 0);

        const totalCostPerUnit =
            productCost + productGst + packingCost + packingGst + otherCost;

        const quantitySold = Number(skuDetails.quantitySold || 0);
        const totalCogs = quantitySold * totalCostPerUnit;

        return {
            monthlyReportId: report._id,
            sku,
            productName: skuDetails.productName,
            asin: skuDetails.asin,
            fsn: "",
            quantitySold,
            productCost,
            productGst,
            packingCost,
            packingGst,
            otherCost,
            totalCostPerUnit,
            totalCogs,
        };
    });

    await ReportSkuCost.insertMany(costDocs);

    report.status = "sku_costs_added";
    report.generatedAt = null;
    report.failureReason = "";
    await report.save();

    return {
        reportId: report._id,
        status: report.status,
        skuCostCount: costDocs.length,
        missingSkuCount: 0,
        invalidSkuCostCount: 0,
    };
}

export async function uploadAmazonPaymentsReport({ userId, reportId, file }) {
    const report = await getOwnedReport({
        userId,
        reportId,
    });

    if (!file) {
        throw new ApiError(400, "Payments report file is required.");
    }

    const orderRows = await AmazonReportOrderRow.find({
        monthlyReportId: report._id,
    }).lean();

    if (!orderRows.length) {
        throw new ApiError(400, "Please upload orders report first.");
    }

    const orderIds = Array.from(
        new Set(orderRows.map((row) => row.orderId).filter(Boolean)),
    );

    const rows = parseUploadedFile(file.path, file.originalname);

    const parsed = parseAmazonPaymentRows(rows, report.reportMonth, orderIds);

    await AmazonReportPaymentRow.deleteMany({
        monthlyReportId: report._id,
    });

    await AmazonReportPaymentRow.insertMany(
        parsed.parsedRows.map((row) => ({
            ...row,
            monthlyReportId: report._id,
        })),
    );

    report.status = "payments_uploaded";
    report.paymentsFileOriginalName = file.originalname;
    report.paymentsUploadedAt = new Date();
    report.generatedAt = null;
    report.failureReason = "";
    report.validationWarnings = parsed.validationWarnings;

    await report.save();

    const settlementTotal = parsed.parsedRows.reduce(
        (total, row) => total + Number(row.total || 0),
        0,
    );

    return {
        reportId: report._id,
        status: report.status,
        totalRows: rows.length,
        matchedOrderCount: parsed.matchedOrderCount,
        unmatchedOrderCount: parsed.unmatchedOrderCount,
        settlementTotal: roundMoney(settlementTotal),
        validationWarnings: parsed.validationWarnings,
    };
}

export async function generateAmazonMonthlyReport({
    userId,
    reportId,
    forceRegenerate = false,
}) {
    const report = await getOwnedReport({
        userId,
        reportId,
    });

    if (report.status === "processing") {
        throw new ApiError(409, "Report is already processing.");
    }

    if (report.status === "completed" && !forceRegenerate) {
        return report;
    }

    report.status = "processing";
    await report.save();

    try {
        const orderRows = await AmazonReportOrderRow.find({
            monthlyReportId: report._id,
        }).lean();

        const paymentRows = await AmazonReportPaymentRow.find({
            monthlyReportId: report._id,
        }).lean();

        const skuCosts = await ReportSkuCost.find({
            monthlyReportId: report._id,
        }).lean();

        if (!orderRows.length) {
            throw new ApiError(400, "Orders report is required before generation.");
        }

        if (!paymentRows.length) {
            throw new ApiError(400, "Payments report is required before generation.");
        }

        const orderSkus = new Set(
            orderRows
                .filter((row) => Number(row.quantity || 0) > 0)
                .map((row) => row.sku),
        );

        const costSkus = new Set(skuCosts.map((row) => row.sku));

        const missingCostSkus = Array.from(orderSkus).filter(
            (sku) => !costSkus.has(sku),
        );

        if (missingCostSkus.length) {
            throw new ApiError(400, "SKU cost validation failed", [
                {
                    field: "skuCosts",
                    message: `${missingCostSkus.length} SKUs are missing product cost.`,
                    missingSkus: missingCostSkus,
                },
            ]);
        }

        const calculated = calculateAmazonReport({
            orderRows,
            paymentRows,
            skuCosts,
        });

        report.status = "completed";
        report.summary = calculated.summary;
        report.breakdowns = calculated.breakdowns;
        report.generatedAt = new Date();
        report.failureReason = "";

        await report.save();

        return report;
    } catch (error) {
        report.status = "failed";
        report.failureReason = error.message;
        await report.save();

        throw error;
    }
}

export async function getAmazonReportMonths({ userId, firmId }) {
    await verifyFirmOwnership({
        userId,
        firmId,
    });

    const reports = await AmazonMonthlyReport.find({
        userId,
        firmId
    })
        .sort({
            reportMonth: -1,
        })
        .lean();

    return reports.map((report) => ({
        reportMonth: report.reportMonth,
        status: report.status,
        netProfit: report.summary?.netProfit ?? null,
        orders: report.summary?.orders ?? null,
        roi: report.summary?.roi ?? null,
        returns: report.summary?.returns ?? null,
        settlement: report.summary?.settlement ?? null,
        adSpend: report.summary?.adSpend ?? null,
        cogs: report.summary?.cogs ?? null,
        generatedAt: report.generatedAt,
    }));
}

export async function getAmazonFinalReport({
    userId,
    firmId,
    year,
    month,
}) {
    await verifyFirmOwnership({
        userId,
        firmId,
    });

    const reportMonth = `${year}-${month}`;

    const report = await AmazonMonthlyReport.findOne({
        userId,
        firmId,
        reportMonth,
    }).lean();

    if (!report) {
        throw new ApiError(404, "Report not found.");
    }

    return {
        reportId: report._id,
        firmId: report.firmId,
        marketplace: "amazon",
        reportMonth: report.reportMonth,
        status: report.status,
        summary: report.summary,
        profitLossBreakdown: report.breakdowns?.profitLoss || {},
        orderSummary: report.breakdowns?.orderSummary || {},
        skuWiseBreakdown: report.breakdowns?.skuWiseBreakdown || [],
        orderWiseBreakdown: report.breakdowns?.orderWiseBreakdown || [],
        stateWiseBreakdown: report.breakdowns?.stateWiseBreakdown || [],
        generatedAt: report.generatedAt,
    };
}
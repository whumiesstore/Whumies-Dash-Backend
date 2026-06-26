import { Router } from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { uploadReportFile } from "../middlewares/reportUpload.middleware.js";

import {
    generateAmazonReport,
    getAmazonReportDetails,
    listAmazonReportMonths,
    saveSkuCosts,
    startAmazonReportSession,
    uploadAmazonOrders,
    uploadAmazonPayments,
} from "../controllers/amazonReport.controller.js";

const router = Router();

router.use(protectRoute);

router.post("/amazon/start", startAmazonReportSession);

router.post(
    "/amazon/:reportId/orders",
    uploadReportFile,
    uploadAmazonOrders,
);

router.post("/amazon/:reportId/sku-costs", saveSkuCosts);

router.post(
    "/amazon/:reportId/payments",
    uploadReportFile,
    uploadAmazonPayments,
);

router.post("/amazon/:reportId/generate", generateAmazonReport);

router.get("/:firmId/amazon/months", listAmazonReportMonths);

router.get("/:firmId/amazon/:year/:month", getAmazonReportDetails);

export default router;
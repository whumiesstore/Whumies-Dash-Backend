import { Router } from "express";

import {
    createFirm,
    deleteFirm,
    getFirm,
    listFirms,
    makeFirmPrimary,
    updateFirm,
} from "../controllers/firm.controller.js";

import { protectRoute } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

import {
    createFirmValidator,
    firmIdValidator,
    updateFirmValidator,
} from "../validators/firm.validator.js";

const router = Router();

router.use(protectRoute);

router.get("/", listFirms);

router.post("/", createFirmValidator, validateRequest, createFirm);

router.get("/:firmId", firmIdValidator, validateRequest, getFirm);

router.patch("/:firmId", updateFirmValidator, validateRequest, updateFirm);

router.patch(
    "/:firmId/make-primary",
    firmIdValidator,
    validateRequest,
    makeFirmPrimary,
);

router.delete("/:firmId", firmIdValidator, validateRequest, deleteFirm);

export default router;
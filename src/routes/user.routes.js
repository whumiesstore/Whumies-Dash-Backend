import { Router } from "express";

import {
    changePassword,
    updateProfile,
} from "../controllers/user.controller.js";

import { protectRoute } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

import {
    changePasswordValidator,
    updateProfileValidator,
} from "../validators/user.validator.js";

const router = Router();

router.patch(
    "/profile",
    protectRoute,
    updateProfileValidator,
    validateRequest,
    updateProfile,
);

router.patch(
    "/change-password",
    protectRoute,
    changePasswordValidator,
    validateRequest,
    changePassword,
);

export default router;
import { Router } from "express";

import {
    completeProfile,
    getCurrentUser,
    login,
    logout,
    register,
} from "../controllers/auth.controller.js";

import {
    completeProfileValidator,
    loginValidator,
    registerValidator,
} from "../validators/auth.validator.js";

import { validateRequest } from "../middlewares/validate.middleware.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerValidator, validateRequest, register);

router.post("/login", loginValidator, validateRequest, login);

router.get("/me", protectRoute, getCurrentUser);

router.patch(
    "/complete-profile",
    protectRoute,
    completeProfileValidator,
    validateRequest,
    completeProfile,
);

router.post("/logout", protectRoute, logout);

export default router;
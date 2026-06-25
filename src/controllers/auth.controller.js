import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { getAuthCookieOptions } from "../utils/authToken.js";
import {
    completeUserProfile,
    loginUser,
    registerUser,
} from "../services/auth.service.js";

export const register = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const { user, token } = await registerUser({
        email,
        password,
    });

    res.cookie("authToken", token, getAuthCookieOptions());

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                user,
                needsOnboarding: !user.isProfileComplete,
            },
            "Account created successfully",
        ),
    );
});

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const { user, token } = await loginUser({
        email,
        password,
    });

    res.cookie("authToken", token, getAuthCookieOptions());

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                user,
                needsOnboarding: !user.isProfileComplete,
            },
            "Logged in successfully",
        ),
    );
});

export const completeProfile = asyncHandler(async (req, res) => {
    const { name, businessName, sellOnAmazon, sellOnFlipkart } = req.body;

    const { user, defaultFirm } = await completeUserProfile({
        userId: req.user._id,
        name,
        businessName,
        sellOnAmazon,
        sellOnFlipkart,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                user,
                defaultFirm,
                needsOnboarding: false,
            },
            "Profile completed successfully",
        ),
    );
});

export const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                user: req.user.toSafeObject(),
                needsOnboarding: !req.user.isProfileComplete,
            },
            "Current user fetched successfully",
        ),
    );
});

export const logout = asyncHandler(async (req, res) => {
    res.clearCookie("authToken", getAuthCookieOptions());

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Logged out successfully"));
});
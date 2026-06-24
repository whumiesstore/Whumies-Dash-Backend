import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
    changeUserPassword,
    updateUserProfile,
} from "../services/user.service.js";

export const updateProfile = asyncHandler(async (req, res) => {
    const { name, businessName, sellOnAmazon, sellOnFlipkart } = req.body;

    const user = await updateUserProfile({
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
                needsOnboarding: !user.isProfileComplete,
            },
            "Profile updated successfully",
        ),
    );
});

export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await changeUserPassword({
        userId: req.user._id,
        currentPassword,
        newPassword,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Password changed successfully"));
});
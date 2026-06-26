import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { createDefaultPrimaryFirm } from "./firm.service.js";

export async function updateUserProfile({
    userId,
    name,
    businessName,
    sellOnAmazon,
    sellOnFlipkart,
}) {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    const wasProfileCompleteBeforeUpdate = Boolean(user.isProfileComplete);

    if (name !== undefined) {
        user.name = name;
    }

    if (businessName !== undefined) {
        user.businessName = businessName;
    }

    if (sellOnAmazon !== undefined || sellOnFlipkart !== undefined) {
        user.marketplaces = {
            amazon:
                sellOnAmazon !== undefined
                    ? Boolean(sellOnAmazon)
                    : Boolean(user.marketplaces?.amazon),

            flipkart:
                sellOnFlipkart !== undefined
                    ? Boolean(sellOnFlipkart)
                    : Boolean(user.marketplaces?.flipkart),
        };
    }

    user.isProfileComplete = Boolean(
        user.name &&
        user.businessName &&
        (user.marketplaces?.amazon || user.marketplaces?.flipkart),
    );

    await user.save();

    let defaultFirm = null;

    const becameProfileCompleteNow =
        !wasProfileCompleteBeforeUpdate && user.isProfileComplete;

    if (becameProfileCompleteNow) {
        defaultFirm = await createDefaultPrimaryFirm({
            userId: user._id,
            firmName: user.businessName,
        });
    }

    return {
        user: user.toSafeObject(),
        defaultFirm,
    };
}

export async function changeUserPassword({
    userId,
    currentPassword,
    newPassword,
}) {
    const user = await User.findById(userId).select("+password");

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    const isCurrentPasswordCorrect =
        await user.comparePassword(currentPassword);

    if (!isCurrentPasswordCorrect) {
        throw new ApiError(401, "Current password is incorrect.");
    }

    user.password = newPassword;

    await user.save();

    return true;
}
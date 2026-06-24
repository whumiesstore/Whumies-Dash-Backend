import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { createAuthToken } from "../utils/authToken.js";

export async function registerUser({ email, password }) {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new ApiError(409, "An account with this email already exists.");
    }

    const user = await User.create({
        email,
        password,
    });

    const token = createAuthToken(user._id);

    return {
        user: user.toSafeObject(),
        token,
    };
}

export async function loginUser({ email, password }) {
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
        throw new ApiError(401, "Invalid email or password.");
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid email or password.");
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = createAuthToken(user._id);

    return {
        user: user.toSafeObject(),
        token,
    };
}

export async function completeUserProfile({
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

    user.name = name;
    user.businessName = businessName;
    user.marketplaces = {
        amazon: Boolean(sellOnAmazon),
        flipkart: Boolean(sellOnFlipkart),
    };
    user.isProfileComplete = true;

    await user.save();

    return user.toSafeObject();
}
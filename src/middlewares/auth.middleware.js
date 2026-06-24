import { ApiError } from "../utils/ApiError.js";
import { verifyAuthToken } from "../utils/authToken.js";
import { User } from "../models/user.model.js";

export async function protectRoute(req, res, next) {
    try {
        const token =
            req.cookies?.authToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "You are not logged in.");
        }

        const decoded = verifyAuthToken(token);

        const user = await User.findById(decoded.userId);

        if (!user) {
            throw new ApiError(401, "User no longer exists.");
        }

        req.user = user;
        next();
    } catch (error) {
        next(new ApiError(401, "Invalid or expired session."));
    }
}

export function requireCompleteProfile(req, res, next) {
    if (!req.user?.isProfileComplete) {
        next(new ApiError(403, "Please complete your profile first."));
        return;
    }

    next();
}
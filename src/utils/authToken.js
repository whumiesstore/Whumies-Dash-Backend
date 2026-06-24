import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function createAuthToken(userId) {
    return jwt.sign(
        {
            userId,
        },
        env.jwtSecret,
        {
            expiresIn: env.jwtExpiresIn,
        },
    );
}

export function verifyAuthToken(token) {
    return jwt.verify(token, env.jwtSecret);
}

export function getAuthCookieOptions() {
    return {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: env.isProduction ? "none" : "lax",
        maxAge: env.cookieMaxAgeDays * 24 * 60 * 60 * 1000,
    };
}
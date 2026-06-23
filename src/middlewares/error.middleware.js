import { ApiError } from "../utils/ApiError.js";

export function errorMiddleware(error, req, res, next) {
    console.error("Error:", error);

    if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            details: error.details,
        });
    }

    if (error.name === "MulterError") {
        return res.status(400).json({
            success: false,
            message: "File upload error",
            details: error.message,
        });
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error",
        details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
    });
}
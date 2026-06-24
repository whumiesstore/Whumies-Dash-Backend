import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

export function validateRequest(req, res, next) {
    const errors = validationResult(req);

    if (errors.isEmpty()) {
        next();
        return;
    }

    const details = errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
    }));

    next(new ApiError(400, "Validation failed", details));
}
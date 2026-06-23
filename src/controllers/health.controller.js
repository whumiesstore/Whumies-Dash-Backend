import { ApiResponse } from "../utils/ApiResponse.js";

export function healthCheck(req, res) {
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                status: "ok",
                timestamp: new Date().toISOString(),
            },
            "Backend is healthy",
        ),
    );
}
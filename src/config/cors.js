import { env } from "./env.js";

export const corsOptions = {
    origin(origin, callback) {
        const allowedOrigins = [
            env.frontendUrl,
            "http://localhost:5173",
            "http://localhost:3000",
        ];

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
};
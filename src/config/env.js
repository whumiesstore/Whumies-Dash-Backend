import dotenv from "dotenv";

dotenv.config();

export const env = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || "development",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
    uploadDir: process.env.UPLOAD_DIR || "uploads",
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 25),

    mongodbUri:
        process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/whumies-dash",

    jwtSecret: process.env.JWT_SECRET || "ADcn5flsiQqQB8FVwizn6JOc2IfTFiO0sR5snF9afOD",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    cookieMaxAgeDays: Number(process.env.COOKIE_MAX_AGE_DAYS || 7),
    isProduction: process.env.NODE_ENV === "production",
};
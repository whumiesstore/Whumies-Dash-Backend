import dotenv from "dotenv";

dotenv.config();

export const env = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || "development",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
    uploadDir: process.env.UPLOAD_DIR || "uploads",
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 25),
};
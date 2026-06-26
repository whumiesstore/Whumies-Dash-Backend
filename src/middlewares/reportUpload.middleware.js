import multer from "multer";
import path from "path";
import fs from "fs";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const reportUploadDir = `${env.uploadDir}/reports`;

if (!fs.existsSync(reportUploadDir)) {
    fs.mkdirSync(reportUploadDir, {
        recursive: true,
    });
}

const allowedExtensions = [".csv", ".txt", ".xlsx", ".xls"];

const storage = multer.diskStorage({
    destination(req, file, callback) {
        callback(null, reportUploadDir);
    },

    filename(req, file, callback) {
        const safeName = file.originalname.replace(/\s+/g, "-");
        const uniqueName = `${Date.now()}-${Math.round(
            Math.random() * 1e9,
        )}-${safeName}`;

        callback(null, uniqueName);
    },
});

function fileFilter(req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
        callback(
            new ApiError(
                400,
                "Invalid file type.",
                "Please upload CSV, TXT, XLS, or XLSX file.",
            ),
        );
        return;
    }

    callback(null, true);
}

export const uploadReportFile = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
}).single("file");
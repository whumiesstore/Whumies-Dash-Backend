import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { parse } from "csv-parse/sync";
import { ApiError } from "./ApiError.js";
import { normalizeRowKeys } from "./normalizeHeader.js";

export function parseUploadedFile(filePath, originalName) {
    const ext = path.extname(originalName).toLowerCase();

    if (!fs.existsSync(filePath)) {
        throw new ApiError(400, "Uploaded file not found.");
    }

    const stats = fs.statSync(filePath);

    if (!stats.size) {
        throw new ApiError(400, "Uploaded file is empty.");
    }

    if (ext === ".csv" || ext === ".txt") {
        const content = fs.readFileSync(filePath, "utf8");

        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            bom: true,
            trim: true,
            relax_column_count: true,
        });

        return records.map(normalizeRowKeys);
    }

    if (ext === ".xlsx" || ext === ".xls") {
        const workbook = xlsx.readFile(filePath);
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
            throw new ApiError(400, "Spreadsheet has no sheets.");
        }

        const sheet = workbook.Sheets[firstSheetName];

        const records = xlsx.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false,
        });

        return records.map(normalizeRowKeys);
    }

    throw new ApiError(
        400,
        "Unsupported file type.",
        "Please upload CSV, TXT, XLS, or XLSX file.",
    );
}
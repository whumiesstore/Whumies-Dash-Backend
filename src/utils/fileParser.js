import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { parse } from "csv-parse/sync";
import { ApiError } from "./ApiError.js";
import { normalizeRowKeys } from "./normalizeHeader.js";

function detectDelimiter(content, ext) {
    const firstLine = content.split(/\r?\n/).find((line) => line.trim());

    if (!firstLine) {
        return ",";
    }

    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;

    if (ext === ".txt" && tabCount > 0) {
        return "\t";
    }

    if (tabCount > commaCount && tabCount > semicolonCount) {
        return "\t";
    }

    if (semicolonCount > commaCount) {
        return ";";
    }

    return ",";
}

export function parseUploadedFile(filePath, originalName) {
    const ext = path.extname(originalName).toLowerCase();

    if (!fs.existsSync(filePath)) {
        throw new ApiError(400, "Uploaded file not found.");
    }

    const stats = fs.statSync(filePath);

    if (!stats.size) {
        throw new ApiError(400, "Uploaded file is empty.");
    }

    try {
        if (ext === ".csv" || ext === ".txt") {
            const content = fs.readFileSync(filePath, "utf8");
            const delimiter = detectDelimiter(content, ext);

            const records = parse(content, {
                columns: true,
                skip_empty_lines: true,
                bom: true,
                trim: true,
                delimiter,
                relax_column_count: true,
                relax_quotes: true,
                quote: '"',
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
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(400, "File parsing failed", [
            {
                field: "file",
                message: error.message,
            },
        ]);
    }
}
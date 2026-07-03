import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { ApiError } from "./ApiError.js";
import { normalizeRowKeys } from "./normalizeHeader.js";

function ensureFileExists(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new ApiError(400, "Uploaded file not found.");
    }

    const stats = fs.statSync(filePath);

    if (!stats.size) {
        throw new ApiError(400, "Uploaded file is empty.");
    }
}

function ensureAllowedExtension(originalName, allowedExtensions, fileLabel) {
    const ext = path.extname(originalName).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
        throw new ApiError(
            400,
            `${fileLabel} file type is not supported.`,
            `Please upload ${allowedExtensions.join(", ")} file.`,
        );
    }

    return ext;
}

function readTextFile(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function normalizeHeaderCell(value = "") {
    return String(value)
        .trim()
        .replace(/^\uFEFF/, "")
        .replace(/^"+|"+$/g, "")
        .toLowerCase();
}

function splitCsvHeaderLine(line = "") {
    try {
        const parsed = parse(line, {
            relax_quotes: true,
            trim: true,
            skip_empty_lines: true,
        });

        return parsed?.[0] || [];
    } catch {
        return line.split(",");
    }
}

function findCsvHeaderLineIndexByColumns(content, expectedColumns = []) {
    const lines = content.split(/\r?\n/);

    return lines.findIndex((line) => {
        if (!line.trim()) return false;

        const columns = splitCsvHeaderLine(line).map(normalizeHeaderCell);

        return expectedColumns.every((expectedColumn, index) => {
            return columns[index] === normalizeHeaderCell(expectedColumn);
        });
    });
}

function parseDelimitedContent({
    content,
    delimiter,
    fileLabel,
    headerLineIndex = 0,
}) {
    const lines = content.split(/\r?\n/);
    const usableContent = lines.slice(headerLineIndex).join("\n");
    try {
        const records = parse(usableContent, {
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
    } catch (error) {
        throw new ApiError(400, `${fileLabel} parsing failed`, [
            {
                field: "file",
                message: error.message,
            },
        ]);
    }
}

/**
 * Amazon Orders Report
 * Amazon orders report is usually a .txt file with TAB separated values.
 * Header starts with:
 * amazon-order-id    merchant-order-id    purchase-date ...
 */
export function parseAmazonOrdersFile(filePath, originalName) {
    ensureFileExists(filePath);

    ensureAllowedExtension(
        originalName,
        [".txt"],
        "Amazon orders report",
    );

    const content = readTextFile(filePath);

    return parseDelimitedContent({
        content,
        delimiter: "\t",
        fileLabel: "Amazon orders report",
        headerLineIndex: 0,
    });
}

/**
 * Amazon Payments / Settlement Report
 * Amazon payment CSV may contain instruction/summary lines at the top.
 * Actual data starts from a row like:
 * date/time,settlement id,type,order id,sku,...
 */
export function parseAmazonPaymentsFile(filePath, originalName) {
    ensureFileExists(filePath);

    ensureAllowedExtension(
        originalName,
        [".csv"],
        "Amazon payments report",
    );

    const content = readTextFile(filePath);

    const headerLineIndex = findCsvHeaderLineIndexByColumns(content, [
        "date/time",
        "settlement id",
        "type",
    ]);

    if (headerLineIndex === -1) {
        throw new ApiError(400, "Amazon payments report validation failed", [
            {
                field: "paymentsFile",
                message:
                    "Could not find Amazon payments data header row. Expected first columns: date/time, settlement id, type.",
            },
        ]);
    }

    return parseDelimitedContent({
        content,
        delimiter: ",",
        fileLabel: "Amazon payments report",
        headerLineIndex,
    });
}
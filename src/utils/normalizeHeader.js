export function normalizeHeader(header = "") {
    return String(header)
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, "-")
        .replace(/[^\w-]/g, "")
        .replace(/-+/g, "-");
}

export function normalizeRowKeys(row = {}) {
    const normalized = {};

    Object.entries(row).forEach(([key, value]) => {
        normalized[normalizeHeader(key)] = value;
    });

    return normalized;
}

export function pickValue(row, aliases = []) {
    for (const alias of aliases) {
        const normalizedAlias = normalizeHeader(alias);

        if (
            Object.prototype.hasOwnProperty.call(row, normalizedAlias) &&
            row[normalizedAlias] !== undefined &&
            row[normalizedAlias] !== null &&
            row[normalizedAlias] !== ""
        ) {
            return row[normalizedAlias];
        }
    }

    return "";
}
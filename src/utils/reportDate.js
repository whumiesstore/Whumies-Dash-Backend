export function parseNumber(value) {
    if (value === undefined || value === null || value === "") {
        return 0;
    }

    const cleaned = String(value)
        .replace(/,/g, "")
        .replace(/₹/g, "")
        .replace(/Rs\.?/gi, "")
        .trim();

    const number = Number(cleaned);

    return Number.isFinite(number) ? number : 0;
}

export function parseDateValue(value) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

export function isDateInsideReportMonth(date, reportMonth) {
    if (!date) return false;

    const [year, month] = reportMonth.split("-").map(Number);

    return (
        date.getFullYear() === year &&
        date.getMonth() + 1 === month
    );
}

export function getAmazonPaymentRange(reportMonth) {
    const [year, month] = reportMonth.split("-").map(Number);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 20, 23, 59, 59, 999);

    return {
        startDate,
        endDate,
    };
}

export function isDateInsideRange(date, startDate, endDate) {
    if (!date) return false;

    return date >= startDate && date <= endDate;
}

export function roundMoney(value) {
    return Math.round(Number(value || 0) * 100) / 100;
}
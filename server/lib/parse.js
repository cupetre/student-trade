// Small helpers for turning request input into safe values.
// Route params and FormData fields always arrive as strings ("12"), but
// Prisma's Int columns need real numbers, so every id goes through toId().

function toId(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function toTrimmedString(value, maxLength) {
    if (typeof value !== 'string') return '';
    const s = value.trim();
    return maxLength ? s.slice(0, maxLength) : s;
}

// Prices are stored as Decimal(10, 2): non-negative, at most 99,999,999.99
function toPrice(value) {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n >= 100000000) return null;
    return Math.round(n * 100) / 100;
}

module.exports = { toId, toTrimmedString, toPrice };

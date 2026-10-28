// Error handling in one place.
//
// In a controller you can either answer yourself (res.status(400).json(...))
// or throw an AppError and let the handler below answer:
//     throw new AppError(404, 'Listing not found');
//     throw new AppError(400, 'Please fix the highlighted fields', { fields: { title: 'Too short' } });
// Anything else that's thrown (a bug, a database outage) becomes a 500 with a
// request id the user can quote, and is logged with its full stack.

const logger = require('./logger');
const { databaseErrorCode } = require('./startup');

class AppError extends Error {
    constructor(status, message, { code, fields } = {}) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        this.code = code;
        this.fields = fields;
    }
}

const isProduction = () => process.env.NODE_ENV === 'production';

// Turns any error into { status, body, level }. Exported for tests.
function toErrorResponse(err) {
    if (err instanceof AppError) {
        const body = { error: err.message };
        if (err.code) body.code = err.code;
        if (err.fields) body.fields = err.fields;
        return { status: err.status, body, level: err.status >= 500 ? 'error' : 'warn' };
    }

    // Uploads
    if (err && (err.name === 'MulterError' || err.code === 'BAD_TYPE')) {
        const error = err.code === 'LIMIT_FILE_SIZE' ? 'The photo is too large (max 5 MB)'
            : err.code === 'BAD_TYPE' ? 'Photos must be JPG, PNG or WebP'
            : 'Photo upload failed. Please try again.';
        return { status: 400, body: { error }, level: 'warn' };
    }

    // Request body problems (from express.json)
    if (err && err.type === 'entity.parse.failed') return { status: 400, body: { error: 'Invalid request body' }, level: 'warn' };
    if (err && err.type === 'entity.too.large') return { status: 413, body: { error: 'Request is too large' }, level: 'warn' };

    // Database
    const code = databaseErrorCode(err);
    if (code === 'P2002') return { status: 409, body: { error: 'This already exists.' }, level: 'warn' };
    if (code === 'P2025') return { status: 404, body: { error: 'Not found' }, level: 'warn' };
    if (code === 'P2003') return { status: 400, body: { error: 'Something this refers to does not exist.' }, level: 'warn' };
    if (['P1000', 'P1001', 'P1002', 'P1017'].includes(code) || (err && err.name === 'PrismaClientInitializationError')) {
        return { status: 503, body: { error: 'The database is not reachable right now. Please try again shortly.' }, level: 'error' };
    }

    // Anything else is a bug: never show internals to users in production
    const body = { error: 'Something went wrong on our side. Please try again.' };
    if (!isProduction() && err && err.message) body.debug = err.message;
    return { status: 500, body, level: 'error' };
}

// Unknown /api addresses
function notFound(req, res) {
    res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}`, requestId: req.id });
}

// Express error handler (Express 5 sends rejected async handlers here too)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    const { status, body, level } = toErrorResponse(err);
    const log = req.log || logger;
    if (level === 'error') log.error({ err }, `Unhandled error: ${err && err.message}`);
    else log.warn({ code: err && err.code }, err && err.message);

    if (res.headersSent) return; // too late to answer; it's logged
    res.status(status).json({ ...body, requestId: req.id });
}

// Watches every JSON answer:
//  - remembers the error message of 4xx/5xx answers, so the request log line
//    can say WHY it failed ("→ 403 – Complete your profile first…")
//  - adds the request id to every 5xx answer (also the ones controllers send
//    themselves), so a user can report "ref a1b2c3d4" and you can find it in the log
function attachRequestIdToServerErrors(req, res, next) {
    const json = res.json.bind(res);
    res.json = (body) => {
        const isObject = body && typeof body === 'object' && !Array.isArray(body);
        if (res.locals && res.statusCode >= 400 && isObject && typeof body.error === 'string') {
            res.locals.errorMessage = body.error;
        }
        if (res.statusCode >= 500 && isObject && !body.requestId) {
            return json({ ...body, requestId: req.id });
        }
        return json(body);
    };
    next();
}

module.exports = { AppError, toErrorResponse, notFound, errorHandler, attachRequestIdToServerErrors };

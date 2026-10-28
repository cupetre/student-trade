// One log line per HTTP request, written when the response is finished:
//   GET /api/housing/listings?city=Koper → 200 in 14ms · user 3
//   POST /api/housing/listings/7/contact → 403 in 9ms · user 5 – Complete your profile first…
// 2xx/3xx = info, 4xx = warn (the user did something not allowed / invalid),
// 5xx = error (something broke on our side, look at it).
//
// It also gives every request an id (req.id), sends it back in the
// X-Request-Id response header, and attaches req.log: a logger that adds
// that id to every line a controller writes for this request.

const crypto = require('crypto');
const pinoHttp = require('pino-http');
const logger = require('./logger');

// Requests that would only add noise
function isQuiet(req) {
    const url = req.originalUrl || req.url || '';
    return url === '/api/health' || url.startsWith('/uploads/') || url.startsWith('/socket.io');
}

function describe(req, res, ms) {
    const user = req.user && req.user.id ? ` · user ${req.user.id}` : '';
    const time = typeof ms === 'number' ? ` in ${Math.round(ms)}ms` : '';
    const reason = res.statusCode >= 400 && res.locals && res.locals.errorMessage ? ` – ${res.locals.errorMessage}` : '';
    return `${req.method} ${req.originalUrl || req.url} → ${res.statusCode}${time}${user}${reason}`;
}

const requestLogger = pinoHttp({
    logger: logger.child({ module: 'http' }),

    genReqId(req, res) {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && /^[\w-]{6,64}$/.test(incoming)
            ? incoming
            : crypto.randomBytes(4).toString('hex');
        res.setHeader('X-Request-Id', id);
        return id;
    },

    autoLogging: { ignore: isQuiet },
    customAttributeKeys: { reqId: 'reqId', responseTime: 'ms' },
    quietReqLogger: true, // req.log only adds the request id, not the whole request

    customLogLevel(req, res, err) {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
    customSuccessMessage: (req, res, ms) => describe(req, res, ms),
    // pino-http's own "failed with status code 500" adds nothing; real errors are logged in full by the error handler
    customErrorMessage: (req, res, err) => {
        const extra = err && err.message && !/^failed with status code/.test(err.message) && !res.locals?.errorMessage ? ` – ${err.message}` : '';
        return `${describe(req, res)}${extra}`;
    },

    // Keep the stored request/response small: no headers, no bodies
    serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
    },
    customProps: (req) => (req.user && req.user.id ? { userId: req.user.id } : {}),
});

module.exports = { requestLogger };

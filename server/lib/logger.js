// One shared logger (pino) for the whole server.
//
// How to read the terminal while developing:
//   10:42:07 INFO  [http] GET /api/housing/listings → 200 in 14ms · user 3  (a1b2c3d4)
//   10:42:09 WARN  [http] POST /api/housing/listings/7/contact → 403 in 9ms · user 5
//   10:42:11 ERROR [http] PUT /api/users/edit_profile → 500 in 30ms   + the error and its stack below
// The id in brackets is the request id. Every log line written while handling
// that request carries the same id, and the browser receives it in the
// X-Request-Id header, so you can match a problem in the browser to the server log.
//
// Settings (server/.env):
//   LOG_LEVEL = trace | debug | info | warn | error | fatal | silent
//               default: debug while developing, info in production
//   LOG_SQL   = true  -> also print every database query (debug level)
//   LOG_FILE  = logs/server.log -> also write JSON lines to that file (for searching later)
//
// In production it prints one JSON object per line, which log tools read directly.

const path = require('path');
const pino = require('pino');

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const isTest = env === 'test';
const level = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
const logFile = process.env.LOG_FILE ? path.resolve(__dirname, '..', process.env.LOG_FILE) : null;

// Never write secrets to a log, wherever they show up in a logged object
const redact = {
    paths: [
        'req.headers.authorization', 'req.headers.cookie', 'headers.authorization',
        'password', '*.password', 'hashedpassword', '*.hashedpassword',
        'token', '*.token', 'verification_token_hash', '*.verification_token_hash',
    ],
    censor: '[hidden]',
};

function buildTransport() {
    if (isTest) return undefined; // tests: plain synchronous output (usually silenced)

    const targets = [];
    if (isProduction) {
        targets.push({ target: 'pino/file', level, options: { destination: 1 } }); // JSON to stdout
    } else {
        targets.push({
            target: 'pino-pretty',
            level,
            options: {
                colorize: true,
                translateTime: 'SYS:HH:MM:ss',
                // shown in the message line instead (see messageFormat)
                ignore: 'pid,hostname,module,reqId,req,res,ms,userId',
                messageFormat: '{if module}[{module}] {end}{msg}{if reqId}  ({reqId}){end}',
            },
        });
    }
    if (logFile) {
        targets.push({ target: 'pino/file', level, options: { destination: logFile, mkdir: true } });
    }
    return pino.transport({ targets });
}

const logger = pino({ level, redact, base: undefined }, buildTransport());

// A logger that tags its lines with a module name, e.g. [db], [socket], [startup]
logger.createLogger = (module) => logger.child({ module });

module.exports = logger;

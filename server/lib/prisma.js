// Single shared Prisma Client for the whole server.
//
// Why a singleton: every PrismaClient opens its own connection pool. With a
// watcher restarting the process on every save, creating one per file would
// leak pools until Postgres refuses connections.
//
// Logging: database warnings/errors always go to the log as [db] lines.
// Queries slower than SLOW_QUERY_MS are logged as warnings. Set LOG_SQL=true
// in server/.env to see every query (debug level) while developing.

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const log = logger.createLogger('db');
const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_MS) || 500;
const LOG_SQL = process.env.LOG_SQL === 'true';

function createClient() {
    const client = new PrismaClient({
        log: [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
        ],
    });

    // Query parameters are never logged: they can contain password hashes and personal data
    client.$on('query', (e) => {
        if (e.duration >= SLOW_QUERY_MS) log.warn({ ms: e.duration }, `Slow query (${e.duration}ms): ${e.query}`);
        else if (LOG_SQL) log.debug({ ms: e.duration }, `${e.query}  (${e.duration}ms)`);
    });
    client.$on('warn', (e) => log.warn(e.message));
    // Failed queries are also logged (with the request id) where they happen,
    // so this one stays at debug to avoid printing every failure twice
    client.$on('error', (e) => log.debug(e.message));
    return client;
}

const prisma = global.__prisma || createClient();

if (process.env.NODE_ENV !== 'production') {
    global.__prisma = prisma;
}

module.exports = prisma;

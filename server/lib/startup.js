// What the server prints when it starts: a short summary of the settings
// it's running with (never secrets), and a database check that explains the
// usual problems in plain words instead of a raw Prisma error.

const logger = require('./logger');

const log = logger.createLogger('startup');

function describeDatabaseUrl(url) {
    try {
        const u = new URL(url);
        return `${u.username || '?'}@${u.hostname}:${u.port || 5432}${u.pathname}`;
    } catch {
        return 'not set or invalid';
    }
}

function logConfiguration({ port }) {
    const env = process.env;
    log.info(`Environment: ${env.NODE_ENV || 'development'} · log level: ${logger.level}${env.LOG_SQL === 'true' ? ' · SQL logging on' : ''}${env.LOG_FILE ? ` · also logging to ${env.LOG_FILE}` : ''}`);
    log.info(`Database: ${describeDatabaseUrl(env.DATABASE_URL)}`);
    log.info(`Photos (S3): ${env.AWS_BUCKET_NAME ? `bucket "${env.AWS_BUCKET_NAME}" in ${env.AWS_REGION || '?'}` : 'NOT configured, uploads will fail'}`);
    log.info(`Email: ${env.EMAIL_FROM ? `Amazon SES, sending as ${env.EMAIL_FROM}` : 'dev mode, emails are printed here instead of sent'}`);
    log.info(`Student email domains: ${env.ALLOWED_EMAIL_DOMAINS || 'NONE (nobody can register as a student)'}`);
    log.info(`Housing auto-approve: ${env.HOUSING_AUTO_APPROVE === 'true' ? 'on (listings and landlords go live immediately)' : 'off (you review them first)'}`);
    if (!env.CORS_ORIGIN) log.debug('CORS: any origin (set CORS_ORIGIN in production)');

    if ((env.JWT_SECRET || '').length < 32) log.warn('JWT_SECRET is short. Use at least 32 random characters before going live.');
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) log.warn('AWS keys are missing: photo uploads and SES email will fail.');
    log.debug(`Port ${port}`);
}

// Plain-language hints for the database errors we've actually run into
// Prisma puts the code in err.code (query errors) or err.errorCode (connection
// errors); with some setups only the message says what happened.
function databaseErrorCode(err) {
    if (!err) return null;
    const code = err.code || err.errorCode || null;
    if (code && /^P1/.test(code)) return code; // P1xxx = connection problems
    const message = String(err.message || '');
    if (/authentication failed|password authentication/i.test(message)) return 'P1000';
    if (/can't reach database server|ECONNREFUSED/i.test(message)) return 'P1001';
    if (/database .* does not exist/i.test(message)) return 'P1003';
    return code;
}

function databaseHint(err, url) {
    const where = describeDatabaseUrl(url);
    switch (databaseErrorCode(err)) {
        case 'P1000':
            return `Wrong username or password for ${where}. Check DATABASE_URL against POSTGRES_PASSWORD in docker-compose.yml (a password change needs "docker compose down -v"). A Postgres installed directly on Windows using the same port can also cause this.`;
        case 'P1001':
            return `Can't reach the database at ${where}. Is Docker running? Start it with "docker compose up -d".`;
        case 'P1003':
            return `The database in ${where} doesn't exist. Check the name in DATABASE_URL.`;
        default:
            return `Database check failed: ${String(err && err.message).trim().split('\n').pop()}`;
    }
}

// Tables added by recent features. If one is missing, the schema wasn't pushed.
const EXPECTED_TABLES = ['User', 'HousingListing', 'StudentProfile', 'Tenancy'];

async function checkDatabase(prisma) {
    const url = process.env.DATABASE_URL;
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
        log.error(databaseHint(err, url));
        log.error('The server keeps running, but anything that needs the database will fail until this is fixed.');
        return false;
    }

    try {
        const rows = await prisma.$queryRaw`SELECT table_name::text AS table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        const present = new Set(rows.map(r => r.table_name));
        const missing = EXPECTED_TABLES.filter(t => !present.has(t));
        if (missing.length) {
            log.warn(`Database is reachable, but these tables are missing: ${missing.join(', ')}. Run "npm run prisma:push" in server/.`);
            return false;
        }
    } catch (err) {
        log.debug({ err }, 'could not list tables');
    }

    log.info(`Database connected (${describeDatabaseUrl(url)})`);
    return true;
}

module.exports = { logConfiguration, checkDatabase, databaseHint, databaseErrorCode, describeDatabaseUrl };

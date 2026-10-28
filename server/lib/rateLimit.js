// Minimal in-memory rate limiter (no extra package needed).
//
// Each limiter counts requests per key inside a fixed time window and answers
// 429 once the limit is reached. The key defaults to the client IP, but can be
// customised: on a university network hundreds of students share one IP, so
// login is limited per IP + email rather than per IP alone.
//
// In-memory means counts reset when the server restarts and aren't shared
// between several server processes. That's fine for a single server; switch
// to a Redis-backed limiter once you run more than one instance.

function createRateLimiter({ windowMs, max, message = 'Too many requests. Please try again later.', keyFn }) {
    const hits = new Map(); // key -> { count, resetAt }

    const cleanup = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (entry.resetAt <= now) hits.delete(key);
        }
    }, windowMs);
    if (cleanup.unref) cleanup.unref(); // don't keep the process alive just for this

    function rateLimit(req, res, next) {
        const key = keyFn ? keyFn(req) : req.ip;
        const now = Date.now();
        let entry = hits.get(key);

        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(key, entry);
        }

        entry.count += 1;

        if (entry.count > max) {
            const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
            res.set('Retry-After', String(retryAfterSeconds));
            if (req.log) req.log.warn({ key }, 'rate limit hit');
            return res.status(429).json({ error: message });
        }

        next();
    }

    rateLimit.reset = () => hits.clear();
    return rateLimit;
}

module.exports = { createRateLimiter };

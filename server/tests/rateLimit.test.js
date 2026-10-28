// Run with: npm test   (uses Node's built-in test runner, no extra packages)
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimiter } = require('../lib/rateLimit');

// A tiny fake of Express's req/res, enough for the limiter
function fakeCall(limiter, req = { ip: '1.2.3.4' }) {
    const res = {
        statusCode: 200,
        headers: {},
        body: null,
        set(name, value) { this.headers[name] = value; return this; },
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
    let passed = false;
    limiter(req, res, () => { passed = true; });
    return { passed, res };
}

test('lets requests through up to the limit, then answers 429', () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 3, message: 'slow down' });
    assert.equal(fakeCall(limiter).passed, true);
    assert.equal(fakeCall(limiter).passed, true);
    assert.equal(fakeCall(limiter).passed, true);

    const blocked = fakeCall(limiter);
    assert.equal(blocked.passed, false);
    assert.equal(blocked.res.statusCode, 429);
    assert.deepEqual(blocked.res.body, { error: 'slow down' });
    assert.ok(Number(blocked.res.headers['Retry-After']) > 0);
});

test('counts each key separately', () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 1 });
    assert.equal(fakeCall(limiter, { ip: '1.1.1.1' }).passed, true);
    assert.equal(fakeCall(limiter, { ip: '2.2.2.2' }).passed, true);
    assert.equal(fakeCall(limiter, { ip: '1.1.1.1' }).passed, false);
});

test('a custom key lets a shared campus IP log into different accounts', () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 1, keyFn: (req) => `${req.ip}|${req.body.email}` });
    assert.equal(fakeCall(limiter, { ip: '9.9.9.9', body: { email: 'a@upr.si' } }).passed, true);
    assert.equal(fakeCall(limiter, { ip: '9.9.9.9', body: { email: 'b@upr.si' } }).passed, true);
    assert.equal(fakeCall(limiter, { ip: '9.9.9.9', body: { email: 'a@upr.si' } }).passed, false);
});

test('the window resets', async () => {
    const limiter = createRateLimiter({ windowMs: 30, max: 1 });
    assert.equal(fakeCall(limiter).passed, true);
    assert.equal(fakeCall(limiter).passed, false);
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(fakeCall(limiter).passed, true);
});

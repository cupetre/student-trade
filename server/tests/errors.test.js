// Central error handling: every kind of error gets a sensible status and message
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AppError, toErrorResponse, errorHandler, attachRequestIdToServerErrors } = require('../lib/errors');
const { databaseHint, describeDatabaseUrl } = require('../lib/startup');

function fakeRes() {
    return {
        statusCode: 200, body: undefined, headersSent: false, locals: {},
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test('AppError keeps its status, message, code and fields', () => {
    const r = toErrorResponse(new AppError(400, 'Fix it', { code: 'BAD', fields: { title: 'short' } }));
    assert.equal(r.status, 400);
    assert.deepEqual(r.body, { error: 'Fix it', code: 'BAD', fields: { title: 'short' } });
    assert.equal(r.level, 'warn');
});

test('database errors map to friendly answers', () => {
    assert.equal(toErrorResponse({ code: 'P2002' }).status, 409);
    assert.equal(toErrorResponse({ code: 'P2025' }).status, 404);
    assert.equal(toErrorResponse({ code: 'P1001' }).status, 503);
    assert.equal(toErrorResponse({ name: 'PrismaClientInitializationError' }).status, 503);
});

test('upload and body errors are 4xx, not 500', () => {
    assert.equal(toErrorResponse({ name: 'MulterError', code: 'LIMIT_FILE_SIZE' }).status, 400);
    assert.equal(toErrorResponse({ code: 'BAD_TYPE' }).status, 400);
    assert.equal(toErrorResponse({ type: 'entity.parse.failed' }).status, 400);
    assert.equal(toErrorResponse({ type: 'entity.too.large' }).status, 413);
});

test('unknown errors are 500; details only outside production', () => {
    const dev = toErrorResponse(new Error('x is undefined'));
    assert.equal(dev.status, 500);
    assert.equal(dev.body.debug, 'x is undefined');

    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    assert.equal(toErrorResponse(new Error('secret detail')).body.debug, undefined);
    process.env.NODE_ENV = before;
});

test('the handler answers with the request id', () => {
    const res = fakeRes();
    errorHandler(new Error('boom'), { id: 'abc123', log: { error() {}, warn() {} } }, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.requestId, 'abc123');
});

test('5xx answers from controllers also get the request id', () => {
    const res = fakeRes();
    attachRequestIdToServerErrors({ id: 'r1' }, res, () => {});
    res.status(500).json({ error: 'Failed' });
    assert.deepEqual(res.body, { error: 'Failed', requestId: 'r1' });

    const forbidden = fakeRes();
    forbidden.locals = {};
    attachRequestIdToServerErrors({ id: 'r3' }, forbidden, () => {});
    forbidden.status(403).json({ error: 'Complete your profile first' });
    assert.equal(forbidden.locals.errorMessage, 'Complete your profile first', 'reason kept for the log line');

    const ok = fakeRes();
    attachRequestIdToServerErrors({ id: 'r2' }, ok, () => {});
    ok.status(404).json({ error: 'Not found' });
    assert.equal(ok.body.requestId, undefined);
});

test('startup hints explain the usual database problems without showing the password', () => {
    const url = 'postgresql://studenttrade:supersecret@127.0.0.1:5433/studenttrade';
    assert.equal(describeDatabaseUrl(url), 'studenttrade@127.0.0.1:5433/studenttrade');
    assert.match(databaseHint({ code: 'P1000' }, url), /Wrong username or password/);
    assert.match(databaseHint({ code: 'P1001' }, url), /docker compose up -d/);
    assert.doesNotMatch(databaseHint({ code: 'P1000' }, url), /supersecret/);
    // connection errors carry errorCode, or only a message
    assert.match(databaseHint({ errorCode: 'P1001' }, url), /docker compose up -d/);
    assert.match(databaseHint({ message: "Can't reach database server at 127.0.0.1:5433" }, url), /docker compose up -d/);
    assert.match(databaseHint({ message: 'password authentication failed for user "x"' }, url), /Wrong username or password/);
});

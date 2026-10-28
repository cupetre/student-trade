// Run with: npm test   (uses Node's built-in test runner, no extra packages)
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Fake the database model so the landing page form rules can be tested alone
const saved = [];
const modelsPath = path.resolve(__dirname, '../models/publicModels.js');
require.cache[modelsPath] = {
    id: modelsPath, filename: modelsPath, loaded: true,
    exports: { createInterestLead: async (data) => { saved.push(data); return { id: saved.length, ...data }; } },
};

const { submitInterest } = require('../controllers/publicController');

function call(body) {
    const res = {
        statusCode: 200, body: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; },
    };
    const req = { body, log: { info() {}, error() {} } };
    return submitInterest(req, res).then(() => res);
}

const valid = { type: 'homeowner', name: 'Ana Novak', email: ' Ana@Example.com ', city: 'Koper', consent: true, language: 'sl' };

test('saves a valid homeowner and normalizes the email', async () => {
    const res = await call(valid);
    assert.equal(res.statusCode, 201);
    assert.equal(saved.at(-1).email, 'ana@example.com');
    assert.equal(saved.at(-1).language, 'sl');
});

test('rejects unknown types, missing name, bad email and missing consent', async () => {
    assert.equal((await call({ ...valid, type: 'admin' })).statusCode, 400);
    assert.equal((await call({ ...valid, name: 'A' })).statusCode, 400);
    assert.equal((await call({ ...valid, email: 'not-an-email' })).statusCode, 400);
    assert.equal((await call({ ...valid, consent: 'yes' })).statusCode, 400);
});

test('ignores unexpected language values', async () => {
    await call({ ...valid, language: 'xx' });
    assert.equal(saved.at(-1).language, null);
});

// Run with: npm test   (uses Node's built-in test runner, no extra packages)
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createVerificationToken, hashToken } = require('../lib/verification');

test('tokens are 64 random hex characters', () => {
    const a = createVerificationToken();
    const b = createVerificationToken();
    assert.match(a.token, /^[a-f0-9]{64}$/);
    assert.notEqual(a.token, b.token);
});

test('only the hash is meant for the database, and it matches the token', () => {
    const t = createVerificationToken();
    assert.equal(t.tokenHash, hashToken(t.token));
    assert.notEqual(t.tokenHash, t.token);
    assert.match(t.tokenHash, /^[a-f0-9]{64}$/);
});

test('links expire after 24 hours', () => {
    const t = createVerificationToken();
    const hours = (t.expiresAt - t.sentAt) / (60 * 60 * 1000);
    assert.equal(hours, 24);
});

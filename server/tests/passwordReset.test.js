// Run with: npm test
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
delete process.env.EMAIL_FROM; // dev mode: emails are logged, never sent

require('./fakePrisma');
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const { hashToken } = require('../lib/verification');
const { createResetToken, RESET_TTL_MINUTES } = require('../lib/passwordReset');
const { requestPasswordReset, resetPassword } = require('../controllers/userController');

function fakeRes() {
    return {
        statusCode: 200, body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}
const log = { info() {}, warn() {}, error() {} };

let updates;
let users;
beforeEach(() => {
    updates = [];
    users = [{ id: 4, email: 'ana@student.upr.si', fullname: 'Ana Novak', email_verified: true, hashedpassword: 'old' }];
    prisma.user = {
        findUnique: async ({ where }) => {
            if (where.email) return users.find(u => u.email === where.email) || null;
            if (where.password_reset_token_hash) return users.find(u => u.password_reset_token_hash === where.password_reset_token_hash) || null;
            return null;
        },
        update: async ({ where, data }) => {
            updates.push({ where, data });
            const user = users.find(u => u.id === where.id);
            Object.assign(user, data);
            return user;
        },
    };
});

test('reset tokens are random, stored as a hash and last one hour', () => {
    const a = createResetToken();
    assert.match(a.token, /^[a-f0-9]{64}$/);
    assert.equal(a.tokenHash, hashToken(a.token));
    assert.notEqual(a.token, createResetToken().token);
    assert.equal((a.expiresAt - a.sentAt) / 60000, RESET_TTL_MINUTES);
});

test('forgot password gives the same answer for unknown and known emails', async () => {
    const unknown = fakeRes();
    await requestPasswordReset({ body: { email: 'nobody@student.upr.si' }, log }, unknown);
    const known = fakeRes();
    await requestPasswordReset({ body: { email: 'ANA@student.upr.si ', language: 'sl' }, log }, known);

    assert.equal(unknown.statusCode, 200);
    assert.deepEqual(unknown.body, known.body);
    assert.equal(updates.length, 1, 'only the real account gets a token');
    assert.match(updates[0].data.password_reset_token_hash, /^[a-f0-9]{64}$/);
});

test('forgot password: one email per minute per account', async () => {
    await requestPasswordReset({ body: { email: 'ana@student.upr.si' }, log }, fakeRes());
    await requestPasswordReset({ body: { email: 'ana@student.upr.si' }, log }, fakeRes());
    assert.equal(updates.length, 1);
});

test('reset password: bad, unknown and expired links are refused', async () => {
    const bad = fakeRes();
    await resetPassword({ body: { token: 'nope', password: 'longenough' }, log }, bad);
    assert.equal(bad.statusCode, 400);

    const unknown = fakeRes();
    await resetPassword({ body: { token: 'a'.repeat(64), password: 'longenough' }, log }, unknown);
    assert.equal(unknown.statusCode, 400);
    assert.equal(unknown.body.code, 'RESET_LINK_INVALID');

    const t = createResetToken();
    Object.assign(users[0], { password_reset_token_hash: t.tokenHash, password_reset_expires_at: new Date(Date.now() - 1000) });
    const expired = fakeRes();
    await resetPassword({ body: { token: t.token, password: 'longenough' }, log }, expired);
    assert.equal(expired.body.code, 'RESET_LINK_INVALID');
    assert.equal(updates.length, 0);
});

test('reset password: short passwords are refused', async () => {
    const t = createResetToken();
    Object.assign(users[0], { password_reset_token_hash: t.tokenHash, password_reset_expires_at: t.expiresAt });
    const res = fakeRes();
    await resetPassword({ body: { token: t.token, password: 'short' }, log }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.field, 'password');
});

test('reset password: a valid link sets a hashed password once and confirms the email', async () => {
    users[0].email_verified = false;
    const t = createResetToken();
    Object.assign(users[0], { password_reset_token_hash: t.tokenHash, password_reset_expires_at: t.expiresAt });

    const res = fakeRes();
    await resetPassword({ body: { token: t.token, password: 'new-password-1' }, log }, res);
    assert.equal(res.statusCode, 200);
    const data = updates[0].data;
    assert.notEqual(data.hashedpassword, 'new-password-1');
    assert.ok(await bcrypt.compare('new-password-1', data.hashedpassword));
    assert.equal(data.password_reset_token_hash, null);
    assert.equal(data.email_verified, true);

    const again = fakeRes();
    await resetPassword({ body: { token: t.token, password: 'another-one-2' }, log }, again);
    assert.equal(again.statusCode, 400, 'the link works only once');
});

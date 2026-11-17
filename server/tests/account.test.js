// Account settings: change password, delete account
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
require('./fakePrisma');

const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');

const prisma = require('../lib/prisma');
const { changePassword, deleteAccount } = require('../controllers/userController');

function fakeRes() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}
const silentLog = { info() {}, warn() {}, error() {} };
const req = (body) => ({ body, user: { id: 5 }, log: silentLog });

test('changing the password needs the current one and a valid new one', async () => {
    let res = fakeRes();
    await changePassword(req({ new_password: 'longenough1' }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.field, 'current_password');

    res = fakeRes();
    await changePassword(req({ current_password: 'old-password', new_password: 'short' }), res);
    assert.equal(res.body.field, 'new_password');

    res = fakeRes();
    await changePassword(req({ current_password: 'same-password', new_password: 'same-password' }), res);
    assert.equal(res.body.field, 'new_password', 'the new one must differ');
});

test('a wrong current password changes nothing; the right one saves a new hash', async () => {
    const hashed = await bcrypt.hash('old-password', 4);
    let saved = null;
    prisma.user = {
        findUnique: async () => ({ id: 5, email: 'a@student.upr.si', role: 'student', hashedpassword: hashed }),
        update: async (query) => { saved = query; return {}; },
    };

    let res = fakeRes();
    await changePassword(req({ current_password: 'wrong-password', new_password: 'brand-new-pass' }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(saved, null);

    res = fakeRes();
    await changePassword(req({ current_password: 'old-password', new_password: 'brand-new-pass' }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(saved.where.id, 5);
    assert.ok(await bcrypt.compare('brand-new-pass', saved.data.hashedpassword));
});

test('deleting the account asks for the password and deletes only that account', async () => {
    const hashed = await bcrypt.hash('my-password', 4);
    let deleted = null;
    prisma.user = {
        findUnique: async (q) => (q.select && q.select.listings
            ? { profile_picture: null, listings: [], housingListings: [] }
            : { id: 5, email: 'a@student.upr.si', role: 'student', hashedpassword: hashed }),
        delete: async (query) => { deleted = query; return {}; },
    };

    let res = fakeRes();
    await deleteAccount(req({}), res);
    assert.equal(res.statusCode, 400);

    res = fakeRes();
    await deleteAccount(req({ password: 'not-my-password' }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(deleted, null);

    res = fakeRes();
    await deleteAccount(req({ password: 'my-password' }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(deleted, { where: { id: 5 } });
});

test('admin accounts are not deleted from the profile page', async () => {
    const hashed = await bcrypt.hash('admin-password', 4);
    let deleted = null;
    prisma.user = {
        findUnique: async () => ({ id: 1, role: 'admin', hashedpassword: hashed }),
        delete: async (query) => { deleted = query; },
    };
    const res = fakeRes();
    await deleteAccount({ body: { password: 'admin-password' }, user: { id: 1 }, log: silentLog }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(deleted, null);
});

test('only our own uploads can be turned into storage keys', () => {
    const { keyFromUrl } = require('../lib/storage');
    process.env.AWS_BUCKET_NAME = 'sidro-bucket';
    assert.equal(keyFromUrl('https://sidro-bucket.s3.eu-central-1.amazonaws.com/listings/123-ab.jpg'), 'listings/123-ab.jpg');
    assert.equal(keyFromUrl('https://s3.eu-central-1.amazonaws.com/sidro-bucket/housing/9.png'), 'housing/9.png');
    assert.equal(keyFromUrl('https://sidro-bucket.s3.amazonaws.com/secrets/db.sql'), null, 'other folders are left alone');
    assert.equal(keyFromUrl('https://x.s3.amazonaws.com/listings/../secrets'), null);
    assert.equal(keyFromUrl('not a url'), null);
});

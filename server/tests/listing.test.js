// Marketplace: loading a single item for the item page
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
require('./fakePrisma');

const { test } = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../lib/prisma');
const { showListing } = require('../controllers/listingController');

function fakeRes() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}
const silentLog = { info() {}, warn() {}, error() {} };

test('an invalid item id is a 400', async () => {
    const res = fakeRes();
    await showListing({ params: { listingId: 'abc' }, log: silentLog }, res);
    assert.equal(res.statusCode, 400);
});

test('a missing item is a 404 with a readable message', async () => {
    prisma.listingItem = { findUnique: async () => null };
    const res = fakeRes();
    await showListing({ params: { listingId: '7' }, log: silentLog }, res);
    assert.equal(res.statusCode, 404);
    assert.match(res.body.error, /no longer available/);
});

test('an item comes back with the seller name and photo flattened', async () => {
    let asked;
    prisma.listingItem = {
        findUnique: async (query) => {
            asked = query;
            return { id: 7, owner_id: 3, title: 'Desk chair', price: '15.00', owner: { id: 3, fullname: 'Marko K.', profile_picture: null } };
        },
    };
    const res = fakeRes();
    await showListing({ params: { listingId: '7' }, log: silentLog }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(asked.where.id, 7);
    assert.equal(res.body.owner_name, 'Marko K.');
    assert.equal(res.body.title, 'Desk chair');
});

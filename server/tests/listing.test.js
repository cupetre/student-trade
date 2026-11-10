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
    await showListing({ params: { listingId: '7' }, user: { id: 9 }, log: silentLog }, res);
    assert.equal(res.statusCode, 404);
    assert.match(res.body.error, /no longer available/);
});

test('an item comes back with the seller, their reviews, and no exact pin for buyers', async () => {
    let asked;
    prisma.listingItem = {
        findUnique: async (query) => {
            asked = query;
            return {
                id: 7, owner_id: 3, title: 'Desk chair', price: '15.00',
                latitude: 45.5481, longitude: 13.7302, public_latitude: 45.5491, public_longitude: 13.7288,
                owner: {
                    id: 3, fullname: 'Marko K.', profile_picture: null, role: 'student',
                    studentProfile: { university: 'Univerza na Primorskem', faculty: 'FAMNIT', birth_date: new Date('2003-05-10') },
                },
            };
        },
    };
    prisma.review = {
        findMany: async () => [{ id: 1, rating: 5, description: 'Smooth sale', context: 'marketplace', created_at: new Date(), reviewer: { id: 4, fullname: 'Ana', role: 'student' } }],
        aggregate: async () => ({ _avg: { rating: 5 }, _count: { _all: 1 } }),
    };
    const res = fakeRes();
    await showListing({ params: { listingId: '7' }, user: { id: 9 }, log: silentLog }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(asked.where.id, 7);
    assert.equal(res.body.owner_name, 'Marko K.');
    assert.equal(res.body.price, 15);
    assert.deepEqual(res.body.location, { latitude: 45.5491, longitude: 13.7288, approximate: true });
    assert.equal(res.body.latitude, undefined, 'buyers never get the exact pin');
    assert.equal(res.body.exact_location, undefined);
    assert.equal(res.body.seller.faculty, 'FAMNIT');
    assert.equal(typeof res.body.seller.age, 'number');
    assert.equal(res.body.seller.birth_date, undefined, 'only the age, never the birth date');
    assert.equal(res.body.seller_reviews.length, 1);
    assert.deepEqual(res.body.seller.rating, { average: 5, count: 1 });
});

test('the seller gets their own exact pin back', async () => {
    prisma.listingItem = {
        findUnique: async () => ({ id: 7, owner_id: 3, title: 'Desk', price: '1', latitude: 45.5, longitude: 13.7, public_latitude: 45.501, public_longitude: 13.701, owner: { id: 3, fullname: 'M', role: 'student' } }),
    };
    const res = fakeRes();
    await showListing({ params: { listingId: '7' }, user: { id: 3 }, log: silentLog }, res);
    assert.deepEqual(res.body.exact_location, { latitude: 45.5, longitude: 13.7 });
});

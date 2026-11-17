// Marketplace item rules: the form, the browse filters, the first message
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
require('./fakePrisma');

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { readItem, readBrowseQuery, itemMessage, PAGE_SIZE } = require('../lib/marketOptions');
const { buildBrowse } = require('../controllers/listingController');
const { toListingDto } = require('../lib/dto');

test('an item needs a title and a valid price; the rest has defaults', () => {
    assert.ok(readItem({ price: '5' }).error);
    assert.ok(readItem({ title: 'Lamp', price: '-1' }).error);
    const { value } = readItem({ title: '  Lamp ', price: '5.5' });
    assert.equal(value.title, 'Lamp');
    assert.equal(value.price, 5.5);
    assert.equal(value.category, 'other');
    assert.equal(value.condition, null);
    assert.equal(value.contact_preference, 'message');
    assert.equal(value.point, null);
});

test('category, condition and contact choice must come from the lists', () => {
    assert.ok(readItem({ title: 'A', price: '1', category: 'cars' }).error);
    assert.ok(readItem({ title: 'A', price: '1', condition: 'broken' }).error);
    assert.ok(readItem({ title: 'A', price: '1', contact_preference: 'fax' }).error);
    const { value } = readItem({ title: 'A', price: '1', category: 'books', condition: 'like_new', contact_preference: 'message_then_meet', city: 'Koper', pickup_area: 'Študentski dom' });
    assert.equal(value.category, 'books');
    assert.equal(value.condition, 'like_new');
    assert.equal(value.pickup_area, 'Študentski dom');
});

test('the pick-up pin must be in Slovenia', () => {
    assert.ok(readItem({ title: 'A', price: '1', latitude: '48.2', longitude: '16.37' }).error, 'Vienna is refused');
    const { value } = readItem({ title: 'A', price: '1', latitude: '45.5481', longitude: '13.7302' });
    assert.deepEqual(value.point, { latitude: 45.5481, longitude: 13.7302 });
});

test('browse filters: several categories, a price range, bad values ignored, pages of 50', () => {
    const f = readBrowseQuery({ page: '3', q: ' lamp ', category: 'books,bikes,cars,books', min: '5', max: '20', sort: 'price_asc', condition: 'nope' });
    assert.equal(f.page, 3);
    assert.equal(f.search, 'lamp');
    assert.deepEqual(f.categories, ['books', 'bikes'], 'unknown and repeated ones dropped');
    assert.deepEqual(f.conditions, []);
    const query = buildBrowse(f, 5);
    assert.equal(PAGE_SIZE, 50);
    assert.equal(query.take, 50);
    assert.equal(query.skip, 100, 'page 3 starts at item 101');
    assert.deepEqual(query.where.owner_id, { not: 5 }, 'your own items are not in browse');
    assert.deepEqual(query.where.category, { in: ['books', 'bikes'] });
    assert.deepEqual(query.where.price, { gte: 5, lte: 20 });
    assert.deepEqual(readBrowseQuery({ min: '30', max: '10' }).max, 30, 'a range typed backwards is turned round');
    assert.deepEqual(buildBrowse(readBrowseQuery({ max: '15' }), 1).where.price, { lte: 15 });
    assert.equal(query.where.OR.length, 2);
    assert.deepEqual(query.orderBy[0], { price: 'asc' });
    assert.equal(readBrowseQuery({ page: '-4' }).page, 1);
});

test('the first message says which item it is about, or is empty', () => {
    assert.equal(itemMessage({ title: 'Desk chair' }, '  '), '');
    assert.equal(itemMessage({ title: 'Desk chair' }, 'Still free?'), 'About your “Desk chair”:\n\nStill free?');
});

test('list items never carry the exact pin', () => {
    const dto = [{ id: 1, owner_id: 2, price: '3.00', latitude: 1, longitude: 2, public_latitude: 3, public_longitude: 4 }].map(toListingDto)[0];
    assert.equal(dto.latitude, undefined);
    assert.equal(dto.exact_location, undefined, 'the array index is not treated as a viewer');
    assert.equal(dto.price, 3);
});

test('"oldest first" sorts by date ascending', () => {
    assert.deepEqual(buildBrowse(readBrowseQuery({ sort: 'oldest' }), 1).orderBy[0], { date: 'asc' });
    assert.equal(readBrowseQuery({ sort: 'random' }).sort, 'newest');
});

test('a chat lists what it is about: items and listings, gone ones dropped', () => {
    const { toChatSummary } = require('../lib/dto');
    const chat = {
        id: 4, user1_id: 1, user2_id: 2, date: new Date(),
        user1: { id: 1, fullname: 'Ana' }, user2: { id: 2, fullname: 'Žiga' },
        messages: [],
        topics: [
            { created_at: new Date(), market_item: { id: 7, title: 'Desk chair', price: '15.00', photo: 'a.jpg', city: 'Koper', owner_id: 2 } },
            { created_at: new Date(), housing_listing: { id: 3, title: 'Room', rent_per_person: '320.00', city: 'Koper', status: 'active', owner_id: 2, photos: [{ url: 'r.jpg' }] } },
            { created_at: new Date(), market_item: null, housing_listing: null },
        ],
    };
    const summary = toChatSummary(chat, 1);
    assert.equal(summary.topics.length, 2);
    assert.deepEqual(summary.topics[0], { kind: 'market', id: 7, title: 'Desk chair', price: 15, photo: 'a.jpg', city: 'Koper', owner_id: 2, since: chat.topics[0].created_at, status: 'available' });
    assert.equal(summary.topics[1].kind, 'housing');
    assert.equal(summary.topics[1].photo, 'r.jpg');
    assert.equal(summary.topics[1].price, 320);
});

test('browse only shows items still for sale; guests see everyone, members not their own', () => {
    const member = buildBrowse(readBrowseQuery({}), 5);
    assert.equal(member.where.status, 'available');
    assert.deepEqual(member.where.owner_id, { not: 5 });
    const guest = buildBrowse(readBrowseQuery({}), null);
    assert.equal(guest.where.status, 'available');
    assert.equal(guest.where.owner_id, undefined);
});

test('liked and sold show on an item; old rows without a status count as available', () => {
    const base = { id: 1, owner_id: 2, title: 'Lamp', price: '4.00' };
    assert.equal(toListingDto({ ...base, savedBy: [{ user_id: 5 }] }).is_saved, true);
    assert.equal(toListingDto({ ...base, savedBy: [] }).is_saved, false);
    assert.equal(toListingDto(base).status, 'available');
    assert.equal(toListingDto({ ...base, status: 'sold' }).status, 'sold');
    assert.equal('savedBy' in toListingDto({ ...base, savedBy: [] }), false, 'the raw rows are not sent');
});

test('visitors without an account get items without people, text or a map', () => {
    const { toGuestItemDto } = require('../lib/dto');
    const dto = toGuestItemDto({
        id: 1, owner_id: 2, title: 'Lamp', price: '4.00', photo: 'l.jpg', category: 'home', condition: 'good', city: 'Koper',
        date: new Date(), description: 'Call me', pickup_area: 'Dorm 3', latitude: 45.5, longitude: 13.7, public_latitude: 45.51, public_longitude: 13.71,
        owner: { id: 2, fullname: 'Žiga Kranjc', profile_picture: 'z.jpg' },
    });
    assert.equal(dto.price, 4);
    assert.equal(dto.guest, true);
    for (const hidden of ['owner_id', 'owner', 'owner_name', 'description', 'pickup_area', 'latitude', 'longitude', 'location', 'exact_location']) {
        assert.equal(hidden in dto, false, `${hidden} stays private`);
    }
});

test('visitors without an account get places without the owner, the description or the street', () => {
    const { toGuestHousingDto } = require('../lib/dto');
    const dto = toGuestHousingDto({
        id: 3, owner_id: 9, title: 'Room near FAMNIT', description: 'Ring the second bell', street: 'Glagoljaška 8', postal_code: '6000',
        city: 'Koper', neighbourhood: 'Center', rent_per_person: '320.00', deposit: '320.00', utilities_estimate: null,
        latitude: 45.5481, longitude: 13.7302, public_latitude: 45.549, public_longitude: 13.731, location_source: 'pin',
        video_tour_url: 'https://example.com/v', languages: ['sl'], amenities: ['wifi'], status: 'active',
        photos: [{ id: 1, url: 'r.jpg', position: 0, listing_id: 3 }],
        owner: { id: 9, fullname: 'Marko Novak', profile_picture: 'm.jpg', role: 'landlord', landlord_status: 'approved' },
        savedBy: [],
    });
    assert.equal(dto.rent_per_person, 320);
    assert.deepEqual(dto.owner, { verified_landlord: true, is_student: false }, 'only whether the owner is checked');
    assert.deepEqual(dto.location, { latitude: 45.549, longitude: 13.731, approximate: true }, 'the moved point, never the pin');
    assert.deepEqual(dto.amenities, ['wifi']);
    for (const hidden of ['owner_id', 'description', 'street', 'postal_code', 'latitude', 'longitude', 'video_tour_url', 'exact_location', 'languages']) {
        assert.equal(hidden in dto, false, `${hidden} stays private`);
    }
});

test('a chat in the list says how many messages are unread', () => {
    const { toChatSummary } = require('../lib/dto');
    const chat = { id: 4, user1_id: 1, user2_id: 2, date: new Date(), user1: { id: 1 }, user2: { id: 2, fullname: 'Žiga' }, messages: [], topics: [] };
    assert.equal(toChatSummary(chat, 1, 3).unread, 3);
    assert.equal(toChatSummary(chat, 1).unread, 0);
});

test('an item sends all its photos, cover first; older items with only a cover still show it', () => {
    const base = { id: 1, owner_id: 2, title: 'Lamp', price: '4.00', photo: 'a.jpg' };
    const many = toListingDto({ ...base, photos: [{ id: 3, url: 'a.jpg', position: 0, item_id: 1 }, { id: 4, url: 'b.jpg', position: 1, item_id: 1 }] });
    assert.deepEqual(many.photos, [{ id: 3, url: 'a.jpg', position: 0 }, { id: 4, url: 'b.jpg', position: 1 }]);
    assert.deepEqual(toListingDto({ ...base, photos: [] }).photos, [{ id: -1, url: 'a.jpg', position: 0 }], 'the old cover, removable as -1');
    assert.equal('photos' in toListingDto(base), false, 'the browse grid only needs the cover');
});

test('photo limits: 10 per item, 20 per place', () => {
    assert.equal(require('../lib/marketOptions').MAX_ITEM_PHOTOS, 10);
    assert.equal(require('../lib/housingOptions').MAX_HOUSING_PHOTOS, 20);
});

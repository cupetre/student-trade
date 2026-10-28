// Run with: npm test   (uses Node's built-in test runner, no extra packages)
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
require('./fakePrisma');

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// The controller is tested for its rules only, so the database model is faked
const modelsPath = path.resolve(__dirname, '../models/housingModels.js');
require.cache[modelsPath] = { id: modelsPath, filename: modelsPath, loaded: true, exports: {} };

const { validateListing } = require('../lib/housingValidation');
const { postingProblem, buildSearch } = require('../controllers/housingController');
const { toHousingDto } = require('../lib/dto');

const valid = {
    listing_type: 'rental',
    property_type: 'room_in_flat',
    title: 'Sunny room near FAMNIT',
    rent_per_person: '290',
    deposit: '290',
    utilities_included: false,
    utilities_estimate: '40',
    spots_total: '2',
    furnishing: 'furnished',
    street: 'Glagoljaška ulica 8',
    city: 'Koper',
    postal_code: '6000',
    available_from: '2026-10-01',
    available_until: '2027-06-30',
    amenities: ['internet', 'washing_machine'],
    languages: ['sl', 'en'],
    address_registration_allowed: 'true',
};

test('a complete listing passes and is cleaned up', () => {
    const { data, errors } = validateListing(valid);
    assert.deepEqual(errors, {});
    assert.equal(data.rent_per_person, 290);
    assert.equal(data.spots_total, 2);
    assert.equal(data.spots_open, 2, 'open spots default to the total');
    assert.equal(data.address_registration_allowed, true);
    assert.equal(data.smoking_allowed, false);
    assert.equal(data.available_from.toISOString(), '2026-10-01T00:00:00.000Z');
});

test('missing and wrong values are reported per field', () => {
    const { errors } = validateListing({ ...valid, title: 'Hi', rent_per_person: '-5', furnishing: 'luxury', street: '', available_from: '2026-02-30' });
    for (const field of ['title', 'rent_per_person', 'furnishing', 'street', 'available_from']) {
        assert.ok(errors[field], `expected an error for ${field}`);
    }
});

test('open spots cannot exceed the total, end date must be after start', () => {
    assert.ok(validateListing({ ...valid, spots_open: '3' }).errors.spots_open);
    assert.ok(validateListing({ ...valid, available_until: '2026-09-01' }).errors.available_until);
});

test('bills estimate is dropped when bills are included', () => {
    const { data } = validateListing({ ...valid, utilities_included: true, utilities_estimate: '40' });
    assert.equal(data.utilities_estimate, null);
});

test('unknown amenities, bad postal codes and non-https video links are rejected', () => {
    assert.ok(validateListing({ ...valid, amenities: ['jacuzzi'] }).errors.amenities);
    assert.ok(validateListing({ ...valid, postal_code: '60000' }).errors.postal_code);
    assert.ok(validateListing({ ...valid, video_tour_url: 'http://example.com' }).errors.video_tour_url);
});

test('who may post what', () => {
    const student = { id: 1, role: 'student' };
    const landlord = { id: 2, role: 'landlord', landlord_status: 'approved' };
    const pending = { id: 3, role: 'landlord', landlord_status: 'pending' };
    const admin = { id: 4, role: 'admin' };

    assert.equal(postingProblem(student, 'sublet'), null);
    assert.equal(postingProblem(student, 'roommate'), null);
    assert.equal(postingProblem(student, 'rental').status, 403);
    assert.equal(postingProblem(landlord, 'rental'), null);
    assert.equal(postingProblem(landlord, 'sublet').status, 400);
    assert.equal(postingProblem(pending, 'rental').status, 403);
    assert.equal(postingProblem(admin, 'sublet'), null);
    assert.equal(postingProblem(null, 'rental').status, 401);
});

test('search only shows live listings with free spots and applies filters', () => {
    const { where, orderBy, page } = buildSearch({ city: ' Koper ', max_price: '300', property_type: 'studio,bogus', registration: 'true', sort: 'price_asc', page: '2' });
    assert.equal(where.status, 'active');
    assert.deepEqual(where.spots_open, { gt: 0 });
    assert.deepEqual(where.city, { contains: 'Koper', mode: 'insensitive' });
    assert.deepEqual(where.rent_per_person, { lte: 300 });
    assert.deepEqual(where.property_type, { in: ['studio'] });
    assert.equal(where.address_registration_allowed, true);
    assert.deepEqual(orderBy, { rent_per_person: 'asc' });
    assert.equal(page, 2);
    assert.deepEqual(buildSearch({}).orderBy, { created_at: 'desc' });
});

test('housing DTO hides private owner fields and turns decimals into numbers', () => {
    const dto = toHousingDto({
        id: 1, rent_per_person: '290.00', deposit: null, utilities_estimate: '40.5',
        photos: [{ id: 9, url: 'https://x/1.jpg', position: 0, listing_id: 1 }],
        owner: { id: 2, fullname: 'Mojca', profile_picture: null, role: 'landlord', landlord_status: 'approved', email: 'secret@x.si' },
        savedBy: [{ user_id: 5 }],
    });
    assert.equal(dto.rent_per_person, 290);
    assert.equal(dto.utilities_estimate, 40.5);
    assert.equal(dto.owner.verified_landlord, true);
    assert.equal(dto.owner.email, undefined);
    assert.equal(dto.is_saved, true);
    assert.equal(dto.savedBy, undefined);
    assert.deepEqual(dto.photos[0], { id: 9, url: 'https://x/1.jpg', position: 0 });
});

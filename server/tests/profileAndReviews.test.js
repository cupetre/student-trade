// Student profiles, privacy layers, tenancy rules and review input
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
require('./fakePrisma');

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { validateStudentProfile, missingProfileFields, ageFrom } = require('../lib/profileValidation');
const { toStudentProfileDto } = require('../lib/dto');
const { nextTenancyState, reviewTarget } = require('../lib/tenancyRules');
const { profileAccess } = require('../controllers/profileController');
const { readReviewInput } = require('../controllers/rrController');

const NOW = new Date(Date.UTC(2026, 9, 27));

const FULL = {
    university: 'Univerza na Primorskem', faculty: 'FAMNIT', study_programme: 'Computer Science',
    study_level: 'bachelor', study_year: '2', student_type: 'exchange',
    home_country: 'mk', home_city: 'Skopje', languages: ['mk', 'en', 'en'],
    birth_date: '2004-05-10', smoker: 'false', has_pets: '', lifestyle: ['quiet', 'tidy'],
    budget_max: '350', move_in_date: '2026-10-01', preferred_city: 'Koper', stay_months: '10',
};

test('a full profile is cleaned up and accepted', () => {
    const { data, errors } = validateStudentProfile(FULL, NOW);
    assert.deepEqual(errors, {});
    assert.equal(data.home_country, 'MK');
    assert.deepEqual(data.languages, ['mk', 'en']);
    assert.equal(data.study_year, 2);
    assert.equal(data.smoker, false);
    assert.equal(data.has_pets, null);
    assert.equal(data.budget_max, 350);
    assert.ok(data.birth_date instanceof Date);
});

test('bad values are rejected with readable messages', () => {
    const { errors } = validateStudentProfile({
        study_level: 'kindergarten', study_year: 12, home_country: 'XX', languages: ['klingon'],
        birth_date: '2015-01-01', smoker: 'maybe', lifestyle: ['party'], budget_max: -5, stay_months: 0,
    }, NOW);
    for (const field of ['study_level', 'study_year', 'home_country', 'languages', 'birth_date', 'smoker', 'lifestyle', 'budget_max', 'stay_months']) {
        assert.ok(errors[field], `expected an error for ${field}`);
    }
});

test('age counts whole years and respects birthdays', () => {
    assert.equal(ageFrom(new Date(Date.UTC(2004, 9, 27)), NOW), 22);
    assert.equal(ageFrom(new Date(Date.UTC(2004, 9, 28)), NOW), 21);
    assert.equal(ageFrom(null, NOW), null);
});

test('profile is complete only with photo, studies, origin, languages, birth date and smoker answer', () => {
    const { data } = validateStudentProfile(FULL, NOW);
    assert.deepEqual(missingProfileFields({ profile_picture: 'x.jpg' }, data), []);
    assert.deepEqual(missingProfileFields({ profile_picture: null }, data), ['profile_picture']);
    const missing = missingProfileFields({ profile_picture: 'x.jpg' }, null);
    assert.ok(missing.includes('university') && missing.includes('smoker') && missing.includes('languages'));
});

test('privacy layers: basics for everyone, details for contacts, birth date only for the owner', () => {
    const { data } = validateStudentProfile(FULL, NOW);
    const basics = toStudentProfileDto(data, {});
    assert.equal(basics.university, 'Univerza na Primorskem');
    assert.equal(basics.home_country, undefined);
    assert.equal(basics.birth_date, undefined);

    const details = toStudentProfileDto(data, { details: true, ageFrom: (d) => ageFrom(d, NOW) });
    assert.equal(details.home_country, 'MK');
    assert.equal(details.age, 22);
    assert.equal(details.birth_date, undefined);
    assert.equal(details.budget_max, undefined, 'housing needs stay private');

    const own = toStudentProfileDto(data, { details: true, needs: true, own: true });
    assert.ok(own.birth_date);
    assert.equal(own.budget_max, 350);
});

test('who may see profile details', async () => {
    const yes = async () => true;
    const no = async () => false;
    const student = { id: 1, role: 'student' };
    assert.deepEqual(await profileAccess({ id: 2, role: 'landlord' }, student, { chatted: no, tenancy: no }), { details: false, needs: false, own: false });
    assert.equal((await profileAccess({ id: 2, role: 'landlord' }, student, { chatted: yes, tenancy: no })).details, true);
    assert.equal((await profileAccess({ id: 2, role: 'landlord' }, student, { chatted: yes, tenancy: no })).needs, false);
    assert.equal((await profileAccess({ id: 3, role: 'student' }, student, { chatted: no, tenancy: yes })).details, true);
    assert.equal((await profileAccess({ id: 9, role: 'admin' }, student, { chatted: no, tenancy: no })).needs, true);
    assert.equal((await profileAccess(student, student, { chatted: no, tenancy: no })).own, true);
});

test('tenancy state changes follow the rules', () => {
    assert.equal(nextTenancyState('pending', 'confirm', 'student', NOW).data.status, 'confirmed');
    assert.equal(nextTenancyState('pending', 'confirm', 'landlord'), null, 'landlord cannot confirm for the student');
    assert.equal(nextTenancyState('pending', 'decline', 'student').data.status, 'declined');
    assert.equal(nextTenancyState('pending', 'cancel', 'landlord').delete, true);
    assert.equal(nextTenancyState('confirmed', 'cancel', 'landlord'), null, 'a confirmed stay cannot be erased');
    assert.equal(nextTenancyState('confirmed', 'end', 'landlord').data.status, 'ended');
    assert.equal(nextTenancyState('ended', 'confirm', 'student'), null);
    assert.equal(nextTenancyState('pending', 'end', 'student'), null);
});

test('housing reviews only between the two sides of a confirmed stay', () => {
    const t = { student_id: 5, landlord_id: 8, status: 'confirmed' };
    assert.equal(reviewTarget(t, 5).revieweeId, 8);
    assert.equal(reviewTarget(t, 8).revieweeId, 5);
    assert.equal(reviewTarget(t, 99).status, 404);
    assert.equal(reviewTarget({ ...t, status: 'pending' }, 5).status, 400);
    assert.equal(reviewTarget({ ...t, status: 'ended' }, 5).revieweeId, 8);
});

test('review input: whole stars 1-5, comment optional and trimmed', () => {
    assert.ok(readReviewInput({ rating: 0 }).error);
    assert.ok(readReviewInput({ rating: 4.5 }).error);
    assert.ok(readReviewInput({}).error);
    assert.deepEqual(readReviewInput({ rating: '5', description: '  great  ' }), { rating: 5, description: 'great' });
    assert.deepEqual(readReviewInput({ rating: 3, description: '   ' }), { rating: 3, description: null });
});

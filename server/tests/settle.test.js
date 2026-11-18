// Settle In: who sees which guide, deadlines, the checklist, input checks, the
// cost estimate, and the checklist / admin endpoints.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
require('./fakePrisma');

const { test } = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../lib/prisma');
const rules = require('../lib/settleRules');
const { guides: seedGuides } = require('../db/settleSeed');
const { setChecklistItem, requireAdmin, getCost } = require('../controllers/settleController');

function fakeRes() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}
const silentLog = { info() {}, warn() {}, error() {} };

const guide = (over) => ({ id: 1, slug: 'g', status: 'live', phase: 'before', position: 0, applies_to: [], depends_on: [], content: { en: { title: 'G', summary: '' } }, ...over });

test('audience: Macedonian, EU and Slovenian students get the right tokens', () => {
    const mk = rules.audienceOf({ passport_country: 'MK', accommodation: 'private' });
    assert.ok(mk.has('non_eu') && mk.has('foreign') && mk.has('country:MK') && mk.has('private'));
    const de = rules.audienceOf({ passport_country: 'DE' });
    assert.ok(de.has('eu') && de.has('foreign') && !de.has('non_eu'));
    const si = rules.audienceOf({ passport_country: 'SI' });
    assert.ok(si.has('slovenian') && !si.has('foreign'));
});

test('a guide shows only when every condition holds, and only in its city', () => {
    const p = { passport_country: 'MK', city: 'Koper', accommodation: 'dorm' };
    assert.equal(rules.guideApplies(guide({ applies_to: ['non_eu'] }), p), true);
    assert.equal(rules.guideApplies(guide({ applies_to: ['non_eu', 'private'] }), p), false);
    assert.equal(rules.guideApplies(guide({ city: 'Ljubljana' }), p), false);
    assert.equal(rules.guideApplies(guide({ city: 'koper ' }), p), true, 'city match ignores case and spaces');
});

test('deadlines count from the student’s own dates, or wait for them', () => {
    const g = guide({ deadline_anchor: 'permit_date', deadline_days: 8 });
    assert.deepEqual(rules.deadlineFor(g, { permit_date: null }), { deadline: null, waiting_for: 'permit_date' });
    assert.deepEqual(rules.deadlineFor(g, { permit_date: new Date('2026-11-12T00:00:00Z') }), { deadline: '2026-11-20', waiting_for: null });
    assert.equal(rules.addDays('2026-12-28', 8), '2027-01-05');
});

test('checklist: order, progress, blocked steps and the next step', () => {
    const gs = [
        guide({ id: 1, slug: 'a', phase: 'first_week' }),
        guide({ id: 2, slug: 'b', phase: 'before' }),
        guide({ id: 3, slug: 'c', phase: 'before', position: 5, depends_on: ['b'] }),
        guide({ id: 4, slug: 'd', phase: 'first_month', deadline_anchor: 'arrival_date', deadline_days: 3 }),
        guide({ id: 5, slug: 'draft', status: 'draft' }),
    ];
    const profile = { passport_country: 'MK', city: 'Koper', arrival_date: new Date('2026-11-16T00:00:00Z') };
    let c = rules.buildChecklist(gs, [], profile, '2026-11-18');
    assert.deepEqual(c.items.map((i) => i.slug), ['b', 'c', 'a', 'd'], 'phase order, drafts left out');
    assert.deepEqual(c.items.find((i) => i.slug === 'c').blocked_by, ['b']);
    assert.equal(c.next, 'd', 'a step with a deadline comes first');
    assert.equal(c.items.find((i) => i.slug === 'd').days_left, 1);

    c = rules.buildChecklist(gs, [{ guide_id: 4, status: 'done' }, { guide_id: 2, status: 'skipped' }], profile, '2026-11-18');
    assert.equal(c.next, 'c', 'skipping b unblocks c');
    assert.deepEqual(c.progress, { done: 2, total: 4 });
    assert.equal(c.items.find((i) => i.slug === 'd').deadline, null, 'finished steps lose their deadline');
});

test('overdue steps are flagged', () => {
    const gs = [guide({ id: 1, slug: 'x', deadline_anchor: 'permit_date', deadline_days: 8 })];
    const c = rules.buildChecklist(gs, [], { passport_country: 'MK', city: 'Koper', permit_date: new Date('2026-11-01T00:00:00Z') }, '2026-11-18');
    assert.equal(c.items[0].overdue, true);
    assert.equal(c.items[0].days_left, -9);
});

test('the first questions are checked', () => {
    assert.throws(() => rules.validateSettleProfile({ city: 'Koper' }), { field: 'passport_country' });
    assert.throws(() => rules.validateSettleProfile({ passport_country: 'MK' }), { field: 'city' });
    assert.throws(() => rules.validateSettleProfile({ passport_country: 'MK', city: 'Koper', accommodation: 'castle' }), { field: 'accommodation' });
    assert.throws(() => rules.validateSettleProfile({ passport_country: 'MK', city: 'Koper', arrival_date: '2026-02-30' }), { field: 'arrival_date' });
    const ok = rules.validateSettleProfile({ passport_country: 'mk', city: ' Koper ', arrival_date: '2026-09-28' });
    assert.deepEqual(ok, { passport_country: 'MK', city: 'Koper', university: null, accommodation: 'not_yet', arrival_date: '2026-09-28', permit_date: null });
});

test('guide editor input: addresses, audiences, deadlines and sources are checked', () => {
    const base = { slug: 'tax-number', topic: 'money', phase: 'first_month', last_checked: '2026-11-18', content: { en: { title: 'Tax', summary: 'S' } } };
    assert.equal(rules.validateGuideInput(base).status, 'draft');
    assert.throws(() => rules.validateGuideInput({ ...base, slug: 'Tax Number' }), { field: 'slug' });
    assert.throws(() => rules.validateGuideInput({ ...base, applies_to: ['martians'] }), { field: 'applies_to' });
    assert.throws(() => rules.validateGuideInput({ ...base, deadline_anchor: 'permit_date' }), { field: 'deadline_days' });
    assert.throws(() => rules.validateGuideInput({ ...base, status: 'live' }), { field: 'sources' });
    assert.throws(() => rules.validateGuideInput({ ...base, sources: [{ url: 'javascript:alert(1)' }] }), { field: 'sources.0.url' });
    assert.throws(() => rules.validateGuideInput({ ...base, content: { en: { title: '' } } }), { field: 'content.en.title' });
    const live = rules.validateGuideInput({ ...base, status: 'live', applies_to: 'foreign\ncountry:MK', sources: [{ url: 'https://fu.gov.si/x' }], content: { en: { title: 'Tax', summary: 'S', steps: 'one\n\ntwo' }, sl: { title: '' } } });
    assert.deepEqual(live.applies_to, ['foreign', 'country:MK']);
    assert.deepEqual(live.content.en.steps, ['one', 'two']);
    assert.equal(live.content.sl, undefined, 'an empty translation is left out');
    assert.equal(live.sources[0].title, 'https://fu.gov.si/x');
});

test('every seed guide passes the editor’s checks', () => {
    for (const g of seedGuides) assert.doesNotThrow(() => rules.validateGuideInput(g), g.slug);
    const slugs = new Set(seedGuides.map((g) => g.slug));
    for (const g of seedGuides) for (const d of g.depends_on || []) assert.ok(slugs.has(d), `${g.slug} depends on missing ${d}`);
});

test('cost numbers need a source and a sensible range', () => {
    const base = { category: 'food', option: 'boni', low: 100, typical: 150, high: 200, label: { en: 'Mostly boni' }, source_url: 'https://example.si', last_checked: '2026-11-18' };
    assert.equal(rules.validateCostItem(base).source_title, 'https://example.si');
    assert.throws(() => rules.validateCostItem({ ...base, source_url: '' }), { field: 'source_url' });
    assert.throws(() => rules.validateCostItem({ ...base, low: 300 }), { field: 'typical' });
    assert.throws(() => rules.validateCostItem({ ...base, category: 'yachts' }), { field: 'category' });
});

test('rent comes from live listings, with bills added when not included, and needs 3 listings', () => {
    const listings = [
        { property_type: 'room_in_flat', rent_per_person: '250', utilities_included: true },
        { property_type: 'room_in_house', rent_per_person: '300', utilities_included: false, utilities_estimate: '50' },
        { property_type: 'room_in_flat', rent_per_person: '280', utilities_included: false, utilities_estimate: null },
        { property_type: 'studio', rent_per_person: '500', utilities_included: true },
    ];
    const r = rules.rentFromListings(listings);
    assert.deepEqual(r.room, { median: 280, low: 250, high: 350, count: 3 });
    assert.deepEqual(r.studio, { median: null, count: 1 });
    assert.equal(rules.median([1, 3, 2, 4]), 2.5);
});

test('ticking a step that asks for a date needs the date, then saves it on the profile', async () => {
    let profileDate = null;
    let saved = null;
    prisma.guide = { findUnique: async () => ({ id: 7, slug: 'residence-permit', status: 'live', asks_date: 'permit_date' }) };
    prisma.settleProfile = {
        findUnique: async () => ({ user_id: 5, passport_country: 'MK', city: 'Koper' }),
        update: async (q) => { profileDate = q.data; return {}; },
    };
    prisma.checklistItem = { upsert: async (q) => { saved = q.create; return {}; }, deleteMany: async () => ({}) };
    const req = (body) => ({ params: { slug: 'residence-permit' }, body, user: { id: 5 }, log: silentLog });

    let res = fakeRes();
    await setChecklistItem(req({ status: 'done' }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.field, 'date');

    res = fakeRes();
    await setChecklistItem(req({ status: 'done', date: '2999-01-01' }), res);
    assert.equal(res.body.field, 'date', 'no dates in the future');

    res = fakeRes();
    await setChecklistItem(req({ status: 'done', date: '2026-11-12' }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(profileDate.permit_date.toISOString().slice(0, 10), '2026-11-12');
    assert.equal(saved.status, 'done');
    assert.equal(saved.user_id, 5);

    res = fakeRes();
    await setChecklistItem(req({ status: 'maybe' }), res);
    assert.equal(res.statusCode, 400);
});

test('draft guides can’t be ticked', async () => {
    prisma.guide = { findUnique: async () => ({ id: 8, slug: 'sim-card', status: 'draft' }) };
    const res = fakeRes();
    await setChecklistItem({ params: { slug: 'sim-card' }, body: { status: 'done' }, user: { id: 5 }, log: silentLog }, res);
    assert.equal(res.statusCode, 404);
});

test('only admins get past the admin check', async () => {
    prisma.user = { findUnique: async ({ where }) => ({ id: where.id, role: where.id === 1 ? 'admin' : 'student' }) };
    let passed = false;
    let res = fakeRes();
    await requireAdmin({ user: { id: 2 }, log: silentLog }, res, () => { passed = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(passed, false);
    res = fakeRes();
    await requireAdmin({ user: { id: 1 }, log: silentLog }, res, () => { passed = true; });
    assert.equal(passed, true);
});

test('cost: a city’s own number replaces the everywhere-number', async () => {
    prisma.housingListing = {
        findMany: async (q) => (q.distinct ? [{ city: 'Koper' }] : [
            { property_type: 'room_in_flat', rent_per_person: 250, utilities_included: true },
            { property_type: 'room_in_flat', rent_per_person: 270, utilities_included: true },
            { property_type: 'room_in_flat', rent_per_person: 300, utilities_included: true },
        ]),
    };
    const row = (over) => ({ id: 1, city: null, category: 'food', option: 'boni', low: 1, typical: 2, high: 3, label: { en: 'x' }, source_title: 's', source_url: 'https://s', last_checked: new Date('2026-11-18'), ...over });
    prisma.costItem = {
        findMany: async (q) => (q.distinct ? [] : [row({ id: 1 }), row({ id: 2, city: 'Koper', typical: 9 })]),
    };
    const res = fakeRes();
    await getCost({ query: { city: 'koper' }, log: silentLog }, res);
    assert.equal(res.body.city, 'Koper');
    assert.equal(res.body.rents.room.median, 270);
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.items[0].typical, 9);
    assert.equal(res.body.permit_minimum.amount, 507.43);
});

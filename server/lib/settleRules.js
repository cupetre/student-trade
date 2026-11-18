// Settle In: who a guide is for, the deadlines, the checklist a student sees,
// and checks on what students and admins send. Plain functions with no database,
// so they're easy to test (tests/settle.test.js).

// EU + EEA + Switzerland: these students register their stay instead of getting
// a residence permit for study, so non-EU guides don't apply to them.
const EU_EEA = new Set([
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
    'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    'IS', 'LI', 'NO', 'CH',
]);

const PHASES = ['before', 'first_week', 'first_month', 'later'];
const TOPICS = ['documents', 'health', 'money', 'work', 'phone', 'transport', 'food', 'housing', 'everyday'];
const ACCOMMODATION = ['dorm', 'private', 'not_yet'];
// Dates a deadline can count from. Both live on SettleProfile.
const ANCHORS = ['arrival_date', 'permit_date'];
const LANGS = ['en', 'sl', 'mk'];
// foreign = anyone without a Slovenian passport (EU or not)
const AUDIENCE_TOKENS = ['eu', 'non_eu', 'foreign', 'slovenian', 'dorm', 'private', 'not_yet'];
const GUIDE_STATUS = ['draft', 'live'];
const ITEM_STATUS = ['done', 'skipped'];

// What the residence permit asks a student to show per month. It changes with
// the law, so it lives here with its source and the date it was checked.
const PERMIT_MONTHLY_MINIMUM = {
    amount: 507.43,
    source: 'https://welcome.upr.si/student/prepare/visas-permit/visas-permit-3-2/',
    checked: '2026-11-18',
};

// The calculator's three ways to live, and which housing types count for each.
const RENT_GROUPS = {
    room: ['room_in_flat', 'room_in_house'],
    shared_room: ['shared_room'],
    studio: ['studio', 'apartment'],
};
const MIN_LISTINGS_FOR_RENT = 3; // fewer than this and we say "not enough listings yet"

const COST_CATEGORIES = ['rent', 'food', 'transport', 'phone', 'extras'];

// ---------- small helpers ----------

const norm = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// 'YYYY-MM-DD' from a Date or a date string, in UTC (dates are stored as @db.Date)
function isoDay(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

function addDays(day, n) {
    const d = new Date(`${day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return isoDay(d);
}

function daysBetween(fromDay, toDay) {
    return Math.round((Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / 864e5);
}

function median(numbers) {
    const xs = numbers.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
    if (!xs.length) return null;
    const mid = Math.floor(xs.length / 2);
    return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

// ---------- who a guide is for ----------

function audienceOf(profile) {
    const tokens = new Set();
    if (!profile) return tokens;
    const cc = String(profile.passport_country || '').toUpperCase();
    if (cc) {
        tokens.add(`country:${cc}`);
        if (cc === 'SI') { tokens.add('slovenian'); tokens.add('eu'); }
        else if (EU_EEA.has(cc)) { tokens.add('eu'); tokens.add('foreign'); }
        else { tokens.add('non_eu'); tokens.add('foreign'); }
    }
    if (profile.accommodation) tokens.add(profile.accommodation);
    return tokens;
}

// Every token in applies_to must hold ("non_eu" + "private" = non-EU students
// in private rooms). An empty list means everyone. A guide with a city only
// shows to students in that city.
function guideApplies(guide, profile) {
    if (!profile) return !(guide.applies_to || []).length;
    if (guide.city && norm(guide.city) !== norm(profile.city)) return false;
    const tokens = audienceOf(profile);
    return (guide.applies_to || []).every((t) => tokens.has(t));
}

// ---------- deadlines and the checklist ----------

// The deadline counts from a date the student gave us (arrival, permit received).
// No date yet → no deadline, and we say which date we're waiting for.
function deadlineFor(guide, profile) {
    if (!guide.deadline_anchor || guide.deadline_days == null) return { deadline: null, waiting_for: null };
    const anchor = isoDay(profile && profile[guide.deadline_anchor]);
    if (!anchor) return { deadline: null, waiting_for: guide.deadline_anchor };
    return { deadline: addDays(anchor, guide.deadline_days), waiting_for: null };
}

function pickText(content, lang) {
    const c = content || {};
    return c[lang] && c[lang].title ? c[lang] : (c.en || {});
}

// A short version of a guide for lists: titles and summaries in every language
// the guide has, so the page can switch language without asking again.
function guideSummary(g) {
    const titles = {};
    for (const lang of LANGS) {
        const c = g.content && g.content[lang];
        if (c && c.title) titles[lang] = { title: c.title, summary: c.summary || '' };
    }
    return {
        slug: g.slug,
        topic: g.topic,
        phase: g.phase,
        city: g.city || null,
        text: titles,
        last_checked: isoDay(g.last_checked),
    };
}

function phaseIndex(p) {
    const i = PHASES.indexOf(p);
    return i === -1 ? PHASES.length : i;
}

// The student's checklist: the live guides that apply to them, in phase order,
// with their status and deadline, the step to do next and the progress.
function buildChecklist(guides, items, profile, today = isoDay(new Date())) {
    const applicable = guides
        .filter((g) => g.status === 'live' && guideApplies(g, profile))
        .sort((a, b) => phaseIndex(a.phase) - phaseIndex(b.phase) || (a.position || 0) - (b.position || 0) || a.slug.localeCompare(b.slug));

    const bySlug = new Map(applicable.map((g) => [g.slug, g]));
    const itemFor = new Map(items.map((it) => [it.guide_id, it]));
    const statusOf = (g) => (itemFor.get(g.id) ? itemFor.get(g.id).status : 'todo');

    const rows = applicable.map((g) => {
        const item = itemFor.get(g.id);
        const status = item ? item.status : 'todo';
        const { deadline, waiting_for } = deadlineFor(g, profile);
        const days_left = deadline ? daysBetween(today, deadline) : null;
        const blocked_by = (g.depends_on || []).filter((s) => bySlug.has(s) && statusOf(bySlug.get(s)) === 'todo');
        return {
            ...guideSummary(g),
            status,
            done_at: item ? isoDay(item.done_at) : null,
            asks_date: g.asks_date || null,
            deadline: status === 'todo' ? deadline : null,
            days_left: status === 'todo' ? days_left : null,
            overdue: status === 'todo' && days_left != null && days_left < 0,
            waiting_for: status === 'todo' ? waiting_for : null,
            blocked_by,
        };
    });

    // Next step: something with a deadline comes first (soonest), then the
    // first open step in phase order that isn't waiting on another step.
    const open = rows.filter((r) => r.status === 'todo' && !r.blocked_by.length);
    const withDeadline = open.filter((r) => r.deadline).sort((a, b) => a.deadline.localeCompare(b.deadline));
    const next = withDeadline[0] || open[0] || null;

    const finished = rows.filter((r) => r.status !== 'todo').length;
    return {
        items: rows,
        next: next ? next.slug : null,
        progress: { done: finished, total: rows.length },
    };
}

// ---------- checking what people send ----------

class SettleInputError extends Error {
    constructor(message, field) { super(message); this.field = field; }
}
const fail = (message, field) => { throw new SettleInputError(message, field); };

function text(value, max, field, { required = false } = {}) {
    if (value == null || value === '') {
        if (required) fail('This field is required.', field);
        return null;
    }
    if (typeof value !== 'string') fail('Must be text.', field);
    const s = value.trim();
    if (!s && required) fail('This field is required.', field);
    if (s.length > max) fail(`Keep it under ${max} characters.`, field);
    return s || null;
}

function day(value, field, { required = false } = {}) {
    if (value == null || value === '') {
        if (required) fail('Pick a date.', field);
        return null;
    }
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !isoDay(value) || isoDay(value) !== value) {
        fail('Pick a valid date.', field);
    }
    const year = Number(value.slice(0, 4));
    if (year < 2000 || year > 2100) fail('Pick a valid date.', field);
    return value;
}

function list(value, maxItems, maxLen, field) {
    if (value == null) return [];
    const arr = Array.isArray(value) ? value : String(value).split('\n');
    const out = arr.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
    if (out.length > maxItems) fail(`At most ${maxItems} lines.`, field);
    for (const s of out) if (s.length > maxLen) fail(`Keep each line under ${maxLen} characters.`, field);
    return out;
}

function httpUrl(value, field) {
    const s = text(value, 500, field);
    if (!s) return null;
    let u;
    try { u = new URL(s); } catch { fail('Use a full link starting with https://', field); }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') fail('Use a full link starting with https://', field);
    return s;
}

// What a student tells us on their first visit
function validateSettleProfile(body = {}) {
    const passport_country = text(body.passport_country, 2, 'passport_country', { required: true }).toUpperCase();
    if (!/^[A-Z]{2}$/.test(passport_country)) fail('Pick a country.', 'passport_country');
    const city = text(body.city, 100, 'city', { required: true });
    const university = text(body.university, 150, 'university');
    const accommodation = body.accommodation || 'not_yet';
    if (!ACCOMMODATION.includes(accommodation)) fail('Pick where you’ll live.', 'accommodation');
    const arrival_date = day(body.arrival_date, 'arrival_date');
    const permit_date = day(body.permit_date, 'permit_date');
    return { passport_country, city, university, accommodation, arrival_date, permit_date };
}

function validateGuideText(c, lang, required) {
    const field = (f) => `content.${lang}.${f}`;
    if (!c || typeof c !== 'object') {
        if (required) fail('English title and summary are required.', field('title'));
        return null;
    }
    const title = text(c.title, 120, field('title'), { required });
    if (!title) return null; // an empty translation is simply left out
    const where = c.where && typeof c.where === 'object' ? {
        name: text(c.where.name, 120, field('where.name')),
        address: text(c.where.address, 200, field('where.address')),
        hours: text(c.where.hours, 300, field('where.hours')),
        map_url: httpUrl(c.where.map_url, field('where.map_url')),
    } : null;
    const hasWhere = where && Object.values(where).some(Boolean);
    return {
        title,
        summary: text(c.summary, 500, field('summary'), { required }) || '',
        bring: list(c.bring, 20, 200, field('bring')),
        steps: list(c.steps, 20, 600, field('steps')),
        cost: text(c.cost, 300, field('cost')),
        time: text(c.time, 200, field('time')),
        where: hasWhere ? where : null,
        mistakes: list(c.mistakes, 10, 300, field('mistakes')),
    };
}

// What an admin sends from the guide editor
function validateGuideInput(body = {}) {
    const slug = text(body.slug, 80, 'slug', { required: true });
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail('Use small letters, numbers and dashes, e.g. residence-permit.', 'slug');
    if (!TOPICS.includes(body.topic)) fail('Pick a topic.', 'topic');
    if (!PHASES.includes(body.phase)) fail('Pick when this happens.', 'phase');
    const position = body.position == null || body.position === '' ? 0 : Number(body.position);
    if (!Number.isInteger(position) || position < 0 || position > 999) fail('Use a whole number from 0 to 999.', 'position');

    const applies_to = list(body.applies_to, 6, 20, 'applies_to');
    for (const t of applies_to) {
        if (!AUDIENCE_TOKENS.includes(t) && !/^country:[A-Z]{2}$/.test(t)) fail(`Unknown audience “${t}”.`, 'applies_to');
    }
    const depends_on = list(body.depends_on, 10, 80, 'depends_on');
    for (const s of depends_on) if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) || s === slug) fail(`“${s}” isn't a guide address.`, 'depends_on');

    const deadline_anchor = body.deadline_anchor || null;
    if (deadline_anchor && !ANCHORS.includes(deadline_anchor)) fail('Pick what the deadline counts from.', 'deadline_anchor');
    let deadline_days = body.deadline_days == null || body.deadline_days === '' ? null : Number(body.deadline_days);
    if (deadline_days != null && (!Number.isInteger(deadline_days) || deadline_days < 0 || deadline_days > 365)) fail('Use a number of days from 0 to 365.', 'deadline_days');
    if (deadline_anchor && deadline_days == null) fail('How many days?', 'deadline_days');
    if (!deadline_anchor) deadline_days = null;

    const asks_date = body.asks_date || null;
    if (asks_date && !ANCHORS.includes(asks_date)) fail('Pick which date to ask for.', 'asks_date');

    const status = body.status || 'draft';
    if (!GUIDE_STATUS.includes(status)) fail('Pick draft or live.', 'status');

    const content = body.content || {};
    const en = validateGuideText(content.en, 'en', true);
    const sl = validateGuideText(content.sl, 'sl', false);
    const mk = validateGuideText(content.mk, 'mk', false);

    const rawSources = Array.isArray(body.sources) ? body.sources : [];
    if (rawSources.length > 10) fail('At most 10 sources.', 'sources');
    const sources = rawSources
        .map((s, i) => ({ title: text(s && s.title, 150, `sources.${i}.title`), url: httpUrl(s && s.url, `sources.${i}.url`) }))
        .filter((s) => s.url)
        .map((s) => ({ title: s.title || s.url, url: s.url }));
    if (status === 'live' && !sources.length) fail('A live guide needs at least one source.', 'sources');

    return {
        slug,
        topic: body.topic,
        phase: body.phase,
        position,
        city: text(body.city, 100, 'city'),
        applies_to,
        depends_on,
        deadline_anchor,
        deadline_days,
        asks_date,
        status,
        last_checked: day(body.last_checked, 'last_checked', { required: true }),
        sources,
        content: { en, ...(sl ? { sl } : {}), ...(mk ? { mk } : {}) },
    };
}

function validateCostItem(body = {}) {
    if (!COST_CATEGORIES.includes(body.category)) fail('Pick a category.', 'category');
    const option = text(body.option, 30, 'option', { required: true });
    if (!/^[a-z0-9_]+$/.test(option)) fail('Use small letters, numbers and _.', 'option');
    const nums = {};
    for (const f of ['low', 'typical', 'high']) {
        const n = Number(body[f]);
        if (!Number.isInteger(n) || n < 0 || n > 5000) fail('Use whole euros from 0 to 5000.', f);
        nums[f] = n;
    }
    if (!(nums.low <= nums.typical && nums.typical <= nums.high)) fail('Low ≤ typical ≤ high.', 'typical');
    const label = { en: text(body.label && body.label.en, 80, 'label.en', { required: true }) };
    const sl = text(body.label && body.label.sl, 80, 'label.sl');
    if (sl) label.sl = sl;
    const source_url = httpUrl(body.source_url, 'source_url');
    if (!source_url) fail('Every number needs a source.', 'source_url');
    return {
        city: text(body.city, 100, 'city'),
        category: body.category,
        option,
        ...nums,
        label,
        source_title: text(body.source_title, 150, 'source_title') || source_url,
        source_url,
        last_checked: day(body.last_checked, 'last_checked', { required: true }),
    };
}

// ---------- cost of living ----------

// Rent per person per month for each way of living, from live listings:
// rent plus the bills estimate when bills aren't included.
function rentFromListings(listings) {
    const out = {};
    for (const [group, types] of Object.entries(RENT_GROUPS)) {
        const totals = listings
            .filter((l) => types.includes(l.property_type))
            .map((l) => Number(l.rent_per_person) + (l.utilities_included ? 0 : Number(l.utilities_estimate || 0)));
        out[group] = totals.length >= MIN_LISTINGS_FOR_RENT
            ? { median: Math.round(median(totals)), low: Math.round(Math.min(...totals)), high: Math.round(Math.max(...totals)), count: totals.length }
            : { median: null, count: totals.length };
    }
    return out;
}

module.exports = {
    EU_EEA, PHASES, TOPICS, ACCOMMODATION, ANCHORS, LANGS, AUDIENCE_TOKENS, COST_CATEGORIES,
    PERMIT_MONTHLY_MINIMUM, RENT_GROUPS, MIN_LISTINGS_FOR_RENT,
    isoDay, addDays, daysBetween, median, norm,
    audienceOf, guideApplies, deadlineFor, pickText, guideSummary, buildChecklist,
    SettleInputError, validateSettleProfile, validateGuideInput, validateCostItem,
    rentFromListings,
};

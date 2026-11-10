// What a marketplace item can say about itself, and how the browse page pages.
// The client has the same lists with labels (client/src/Pages/marketplace/marketOptions.js).

const { toTrimmedString, toPrice } = require('./parse');
const { readCoordinates } = require('./location');

const CATEGORIES = [
    'furniture', 'books', 'electronics', 'kitchen', 'home', 'clothing',
    'bikes', 'sports', 'music', 'other',
];

// "How much has it been used"
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'worn'];

// How the seller wants the first contact to go
const CONTACT_PREFERENCES = ['message', 'message_then_call', 'message_then_meet'];

const PAGE_SIZE = 30; // 3 per row, 10 rows
const MAX_TITLE = 255;
const MAX_DESCRIPTION = 5000;
const MAX_CITY = 100;
const MAX_PICKUP = 120;
const MAX_MESSAGE = 1000;

// Reads the item from a form (multipart body, so everything arrives as text).
// Returns { value } or { error }.
function readItem(body) {
    const input = body || {};
    const title = toTrimmedString(input.title, MAX_TITLE);
    if (!title) return { error: 'Title is required' };

    const price = toPrice(input.price);
    if (price === null) return { error: 'Please enter a valid price' };

    const category = input.category || 'other';
    if (!CATEGORIES.includes(category)) return { error: 'Choose a category from the list' };

    const condition = input.condition || null;
    if (condition !== null && !CONDITIONS.includes(condition)) return { error: 'Choose how used it is from the list' };

    const contact = input.contact_preference || 'message';
    if (!CONTACT_PREFERENCES.includes(contact)) return { error: 'Choose how buyers should contact you' };

    const point = readCoordinates(input);
    if (point.error) return { error: point.error };

    return {
        value: {
            title,
            description: toTrimmedString(input.description, MAX_DESCRIPTION) || null,
            price,
            category,
            condition,
            city: toTrimmedString(input.city, MAX_CITY) || null,
            pickup_area: toTrimmedString(input.pickup_area, MAX_PICKUP) || null,
            contact_preference: contact,
            point: point.value, // { latitude, longitude } or null
        },
    };
}

// Browse filters from the address bar: ?q=lamp&category=books&max=20&sort=price_asc&page=2
function readBrowseQuery(query) {
    const q = query || {};
    const page = Math.max(1, Math.min(1000, parseInt(q.page, 10) || 1));
    const search = typeof q.q === 'string' ? q.q.trim().slice(0, 100) : '';
    const category = CATEGORIES.includes(q.category) ? q.category : null;
    const condition = CONDITIONS.includes(q.condition) ? q.condition : null;
    const max = toPrice(q.max);
    const city = typeof q.city === 'string' ? q.city.trim().slice(0, MAX_CITY) : '';
    const sort = ['newest', 'price_asc', 'price_desc'].includes(q.sort) ? q.sort : 'newest';
    return { page, search, category, condition, max, city, sort };
}

// The first message when a buyer writes from the item: says which item it's about
function itemMessage(item, text) {
    const note = typeof text === 'string' ? text.trim() : '';
    if (!note) return '';
    return `About your “${item.title}”:\n\n${note}`;
}

module.exports = {
    CATEGORIES, CONDITIONS, CONTACT_PREFERENCES, PAGE_SIZE, MAX_MESSAGE,
    readItem, readBrowseQuery, itemMessage,
};

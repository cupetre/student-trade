// "I'm interested in…" when a student first messages about a place.
// The student ticks what they want, can add a move-in date, how long they want
// to stay and a short note; we turn that into a clear first message so the owner
// knows straight away what the student is asking for.

const { STAY_LENGTHS } = require('./profileOptions');

const INTERESTS = {
    viewing: 'Seeing the place (in person or on a video call)',
    renting: null, // worded per listing type, see interestLabel()
    with_friend: 'Moving in with a friend',
    questions: 'Asking a few questions first',
};

const RENTING_LABELS = {
    rental: 'Renting it',
    sublet: 'Taking over the sublet',
    roommate: 'Moving in as a flatmate',
};

// Same wording as the rental profile (client/src/lib/profileOptions.js)
const STAY_LABELS = {
    short: 'Short lease (up to 6 months)',
    long: 'Long lease (more than 6 months)',
    year: 'Year contract (12 months)',
    indefinite: 'Indefinite (no end date)',
    negotiable: 'Open to negotiate',
};

const MAX_NOTE = 1000;
const MAX_DAYS_AHEAD = 2 * 365;

function interestLabel(key, listingType) {
    if (key === 'renting') return RENTING_LABELS[listingType] || RENTING_LABELS.rental;
    return INTERESTS[key];
}

function startOfTodayUtc(now = new Date()) {
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

// Reads { interests, move_in, stay_length, note } from the request body.
// Everything is optional; an empty body means "just open the chat".
// Returns { value } or { error }.
function readInterest(body, now = new Date()) {
    const input = body && typeof body === 'object' ? body : {};

    let interests = [];
    if (input.interests !== undefined && input.interests !== null) {
        if (!Array.isArray(input.interests)) return { error: 'Pick what you are interested in from the list' };
        interests = [...new Set(input.interests)];
        if (interests.some(key => typeof key !== 'string' || !(key in INTERESTS))) {
            return { error: 'Pick what you are interested in from the list' };
        }
    }

    let moveIn = null;
    if (input.move_in) {
        if (typeof input.move_in !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.move_in)) return { error: 'Choose a valid move-in date' };
        const time = Date.parse(`${input.move_in}T00:00:00Z`);
        if (Number.isNaN(time)) return { error: 'Choose a valid move-in date' };
        const today = startOfTodayUtc(now);
        if (time < today) return { error: 'The move-in date can’t be in the past' };
        if (time > today + MAX_DAYS_AHEAD * 86400000) return { error: 'The move-in date is too far ahead' };
        moveIn = new Date(time);
    }

    let stay = null;
    if (input.stay_length) {
        if (!STAY_LENGTHS.includes(input.stay_length)) return { error: 'Choose how long you want to stay from the list' };
        stay = input.stay_length;
    }

    const note = typeof input.note === 'string' ? input.note.trim() : '';
    if (note.length > MAX_NOTE) return { error: `Keep the note under ${MAX_NOTE} characters` };

    return { value: { interests, move_in: moveIn, stay_length: stay, note } };
}

function formatDay(date) {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// The first message, or '' when the student didn't choose or write anything
function interestMessage(value, listing) {
    const { interests, move_in: moveIn, stay_length: stay, note } = value;
    if (!interests.length && !moveIn && !stay && !note) return '';

    const lines = [`Hi! I’m interested in your place “${listing.title}”.`];
    if (interests.length) {
        lines.push('', 'I’d like:');
        // keep the order of the list, not the order they were clicked
        Object.keys(INTERESTS)
            .filter(key => interests.includes(key))
            .forEach(key => lines.push(`• ${interestLabel(key, listing.listing_type)}`));
    }
    if (moveIn || stay) lines.push('');
    if (moveIn) lines.push(`Move in: from ${formatDay(moveIn)}`);
    if (stay) lines.push(`Stay: ${STAY_LABELS[stay]}`);
    if (note) lines.push('', note);
    return lines.join('\n');
}

module.exports = { INTERESTS, RENTING_LABELS, STAY_LABELS, MAX_NOTE, interestLabel, readInterest, interestMessage };

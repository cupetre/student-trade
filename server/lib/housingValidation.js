// Checks everything a listing form sends and turns it into clean values for
// the database. Returns { data, errors }: errors maps a field name to a
// readable message, so the form can show it under the right input.

const {
    LISTING_TYPES, PROPERTY_TYPES, FURNISHING, AMENITIES, LANGUAGES,
} = require('./housingOptions');

function toBool(value) {
    return value === true || value === 'true' || value === 1 || value === '1' || value === 'on';
}

function isBlank(value) {
    return value === undefined || value === null || value === '';
}

function toNumber(value) {
    if (isBlank(value)) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
}

// "2026-09-01" -> Date at midnight UTC, or null if it isn't a real date
function toDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

function text(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validateListing(input) {
    const body = input && typeof input === 'object' ? input : {};
    const errors = {};
    const data = {};

    // --- what kind of place ---
    if (!LISTING_TYPES.includes(body.listing_type)) errors.listing_type = 'Choose what kind of listing this is';
    else data.listing_type = body.listing_type;

    if (!PROPERTY_TYPES.includes(body.property_type)) errors.property_type = 'Choose the type of place';
    else data.property_type = body.property_type;

    data.title = text(body.title, 120);
    if (data.title.length < 5) errors.title = 'Give the listing a title of at least 5 characters';

    data.description = text(body.description, 5000) || null;

    // --- money (per person, per month) ---
    const rent = toNumber(body.rent_per_person);
    if (rent === null || Number.isNaN(rent) || rent < 1 || rent > 10000) errors.rent_per_person = 'Enter the monthly rent per person (1–10,000 €)';
    else data.rent_per_person = Math.round(rent * 100) / 100;

    const deposit = toNumber(body.deposit);
    if (Number.isNaN(deposit) || (deposit !== null && (deposit < 0 || deposit > 50000))) errors.deposit = 'Enter a valid deposit, or leave it empty';
    else data.deposit = deposit === null ? null : Math.round(deposit * 100) / 100;

    data.utilities_included = toBool(body.utilities_included);
    const utilities = toNumber(body.utilities_estimate);
    if (data.utilities_included) {
        data.utilities_estimate = null;
    } else if (Number.isNaN(utilities) || (utilities !== null && (utilities < 0 || utilities > 2000))) {
        errors.utilities_estimate = 'Enter a valid monthly estimate for bills, or leave it empty';
    } else {
        data.utilities_estimate = utilities === null ? null : Math.round(utilities * 100) / 100;
    }

    // --- size and spots ---
    const spotsTotal = toNumber(body.spots_total);
    if (!Number.isInteger(spotsTotal) || spotsTotal < 1 || spotsTotal > 20) errors.spots_total = 'How many students is this place for? (1–20)';
    else data.spots_total = spotsTotal;

    const spotsOpen = isBlank(body.spots_open) ? spotsTotal : toNumber(body.spots_open);
    if (!Number.isInteger(spotsOpen) || spotsOpen < 0 || (Number.isInteger(spotsTotal) && spotsOpen > spotsTotal)) {
        errors.spots_open = 'Open spots must be between 0 and the total number of spots';
    } else {
        data.spots_open = spotsOpen;
    }

    const optionalInt = (field, min, max, message) => {
        const n = toNumber(body[field]);
        if (n === null) { data[field] = null; return; }
        if (!Number.isInteger(n) || n < min || n > max) errors[field] = message;
        else data[field] = n;
    };
    optionalInt('total_rooms', 1, 30, 'Rooms must be between 1 and 30');
    optionalInt('bathrooms', 0, 10, 'Bathrooms must be between 0 and 10');
    optionalInt('area_m2', 5, 1000, 'Size must be between 5 and 1,000 m²');
    optionalInt('min_stay_months', 1, 60, 'Minimum stay must be between 1 and 60 months');

    if (!FURNISHING.includes(body.furnishing)) errors.furnishing = 'Choose how the place is furnished';
    else data.furnishing = body.furnishing;

    // --- address (public on the listing) ---
    data.street = text(body.street, 200);
    if (data.street.length < 3) errors.street = 'Enter the street and house number';

    data.city = text(body.city, 100);
    if (data.city.length < 2) errors.city = 'Enter the city';

    data.postal_code = text(body.postal_code, 10) || null;
    if (data.postal_code && !/^\d{4}$/.test(data.postal_code)) errors.postal_code = 'Slovenian postal codes have 4 digits';

    data.neighbourhood = text(body.neighbourhood, 100) || null;

    // --- dates ---
    const from = toDate(body.available_from);
    if (!from) errors.available_from = 'Choose the date the place is available from';
    else data.available_from = from;

    if (isBlank(body.available_until)) {
        data.available_until = null;
    } else {
        const until = toDate(body.available_until);
        if (!until) errors.available_until = 'Enter a valid end date, or leave it empty';
        else if (from && until <= from) errors.available_until = 'The end date must be after the start date';
        else data.available_until = until;
    }

    // --- rules and extras ---
    data.address_registration_allowed = toBool(body.address_registration_allowed);
    data.subsidy_eligible = toBool(body.subsidy_eligible);
    data.smoking_allowed = toBool(body.smoking_allowed);
    data.pets_allowed = toBool(body.pets_allowed);

    const list = (field, allowed, message) => {
        const values = Array.isArray(body[field]) ? body[field] : [];
        const unknown = values.filter(v => !allowed.includes(v));
        if (unknown.length) errors[field] = message;
        else data[field] = [...new Set(values)];
    };
    list('amenities', AMENITIES, 'Unknown amenity selected');
    list('languages', LANGUAGES, 'Unknown language selected');

    data.video_tour_url = text(body.video_tour_url, 500) || null;
    if (data.video_tour_url && !/^https:\/\/\S+$/.test(data.video_tour_url)) {
        errors.video_tour_url = 'The video link must start with https://';
    }

    return { data, errors };
}

module.exports = { validateListing, toBool, toDate };

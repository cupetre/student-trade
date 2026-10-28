// Checks the student profile form and decides when a profile is "complete"
// (complete = enough for a homeowner to know who is contacting them).

const { COUNTRIES, LANGUAGES, STUDY_LEVELS, STUDENT_TYPES, LIFESTYLE } = require('./profileOptions');
const { toDate } = require('./housingValidation');

const MIN_AGE = 16;
const MAX_AGE = 100;

function text(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function isBlank(value) {
    return value === undefined || value === null || value === '';
}

// true / false / null ("not said"); anything else is invalid (undefined)
function toTriState(value) {
    if (isBlank(value)) return null;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
}

// Whole years between birthDate and now
function ageFrom(birthDate, now = new Date()) {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    let age = now.getUTCFullYear() - birth.getUTCFullYear();
    const beforeBirthday = now.getUTCMonth() < birth.getUTCMonth()
        || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
    if (beforeBirthday) age -= 1;
    return age;
}

function validateStudentProfile(input, now = new Date()) {
    const body = input && typeof input === 'object' ? input : {};
    const data = {};
    const errors = {};

    // --- studies ---
    data.university = text(body.university, 150) || null;
    data.faculty = text(body.faculty, 150) || null;
    data.study_programme = text(body.study_programme, 150) || null;

    if (isBlank(body.study_level)) data.study_level = null;
    else if (!STUDY_LEVELS.includes(body.study_level)) errors.study_level = 'Choose your level of study';
    else data.study_level = body.study_level;

    if (isBlank(body.study_year)) {
        data.study_year = null;
    } else {
        const year = Number(body.study_year);
        if (!Number.isInteger(year) || year < 1 || year > 8) errors.study_year = 'Year of study must be between 1 and 8';
        else data.study_year = year;
    }

    if (isBlank(body.student_type)) data.student_type = null;
    else if (!STUDENT_TYPES.includes(body.student_type)) errors.student_type = 'Choose regular or exchange student';
    else data.student_type = body.student_type;

    // --- where they're from ---
    const country = typeof body.home_country === 'string' ? body.home_country.trim().toUpperCase() : '';
    if (!country) data.home_country = null;
    else if (!COUNTRIES.includes(country)) errors.home_country = 'Choose your home country';
    else data.home_country = country;

    data.home_city = text(body.home_city, 100) || null;

    const languages = Array.isArray(body.languages) ? body.languages : [];
    if (languages.some(l => !LANGUAGES.includes(l))) errors.languages = 'Unknown language selected';
    else data.languages = [...new Set(languages)];

    // --- about them ---
    if (isBlank(body.birth_date)) {
        data.birth_date = null;
    } else {
        const birth = toDate(body.birth_date);
        const age = birth ? ageFrom(birth, now) : null;
        if (!birth) errors.birth_date = 'Enter a valid date of birth';
        else if (age < MIN_AGE || age > MAX_AGE) errors.birth_date = `You need to be at least ${MIN_AGE} to use housing`;
        else data.birth_date = birth;
    }

    for (const field of ['smoker', 'has_pets']) {
        const value = toTriState(body[field]);
        if (value === undefined) errors[field] = 'Choose yes or no';
        else data[field] = value;
    }

    const lifestyle = Array.isArray(body.lifestyle) ? body.lifestyle : [];
    if (lifestyle.some(l => !LIFESTYLE.includes(l))) errors.lifestyle = 'Unknown option selected';
    else if (lifestyle.length > 6) errors.lifestyle = 'Pick up to 6';
    else data.lifestyle = [...new Set(lifestyle)];

    // --- housing needs (private for now) ---
    if (isBlank(body.budget_max)) {
        data.budget_max = null;
    } else {
        const budget = Number(body.budget_max);
        if (!Number.isInteger(budget) || budget < 1 || budget > 10000) errors.budget_max = 'Enter a monthly budget between 1 and 10,000 €';
        else data.budget_max = budget;
    }

    if (isBlank(body.move_in_date)) {
        data.move_in_date = null;
    } else {
        const moveIn = toDate(body.move_in_date);
        if (!moveIn) errors.move_in_date = 'Enter a valid date';
        else data.move_in_date = moveIn;
    }

    data.preferred_city = text(body.preferred_city, 100) || null;

    if (isBlank(body.stay_months)) {
        data.stay_months = null;
    } else {
        const months = Number(body.stay_months);
        if (!Number.isInteger(months) || months < 1 || months > 72) errors.stay_months = 'Length of stay must be between 1 and 72 months';
        else data.stay_months = months;
    }

    return { data, errors };
}

// What a student must fill in before contacting homeowners.
// Returns the missing field names (empty = complete).
const REQUIRED = [
    ['profile_picture', (user) => Boolean(user && user.profile_picture)],
    ['university', (_, p) => Boolean(p && p.university)],
    ['faculty', (_, p) => Boolean(p && p.faculty)],
    ['study_level', (_, p) => Boolean(p && p.study_level)],
    ['home_country', (_, p) => Boolean(p && p.home_country)],
    ['languages', (_, p) => Boolean(p && Array.isArray(p.languages) && p.languages.length > 0)],
    ['birth_date', (_, p) => Boolean(p && p.birth_date)],
    ['smoker', (_, p) => Boolean(p && typeof p.smoker === 'boolean')],
];

function missingProfileFields(user, profile) {
    return REQUIRED.filter(([, ok]) => !ok(user, profile)).map(([field]) => field);
}

module.exports = { validateStudentProfile, missingProfileFields, ageFrom, MIN_AGE };

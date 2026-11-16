// Labels for student profile values (server copy: server/lib/profileOptions.js).
// English here; pages show them through t(...) (lib/i18n.js).
import { en } from './i18n';


export const COUNTRY_CODES = (
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ '
    + 'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR '
    + 'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP '
    + 'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT '
    + 'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW '
    + 'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG '
    + 'UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
).split(' ');

// Country names come from the browser, in the chosen language ('en' or 'sl')
const regionNames = {};
function namesFor(lang) {
    if (!(lang in regionNames)) {
        try { regionNames[lang] = new Intl.DisplayNames([lang], { type: 'region' }); }
        catch { regionNames[lang] = null; } // very old browsers: fall back to the code
    }
    return regionNames[lang];
}

export function countryName(code, lang = 'en') {
    if (!code) return '';
    if (code === 'XK') return 'Kosovo';
    try { return namesFor(lang)?.of(code) || code; } catch { return code; }
}

// Countries sorted by name, with the most common ones for Slovenian universities first
const TOP = ['SI', 'HR', 'BA', 'RS', 'MK', 'ME', 'XK', 'AL', 'IT', 'AT', 'DE'];
const countryLists = {};
export function countryOptions(lang = 'en') {
    if (!countryLists[lang]) {
        countryLists[lang] = [
            ...TOP.map(code => ({ code, name: countryName(code, lang) })),
            ...COUNTRY_CODES.filter(c => !TOP.includes(c))
                .map(code => ({ code, name: countryName(code, lang) }))
                .sort((a, b) => a.name.localeCompare(b.name, lang)),
        ];
    }
    return countryLists[lang];
}
export const COUNTRY_OPTIONS = countryOptions('en');

export const LANGUAGES = {
    sl: 'Slovenian', en: 'English', mk: 'Macedonian', hr: 'Croatian', sr: 'Serbian', bs: 'Bosnian',
    sq: 'Albanian', it: 'Italian', de: 'German', fr: 'French', es: 'Spanish', pt: 'Portuguese',
    nl: 'Dutch', pl: 'Polish', cs: 'Czech', sk: 'Slovak', hu: 'Hungarian', ro: 'Romanian',
    bg: 'Bulgarian', el: 'Greek', tr: 'Turkish', uk: 'Ukrainian', ru: 'Russian', ar: 'Arabic',
    zh: 'Chinese', hi: 'Hindi', ja: 'Japanese', ko: 'Korean', fa: 'Persian',
};

export const STUDY_LEVELS = {
    bachelor: 'Bachelor',
    master: 'Master',
    phd: 'PhD',
    other: 'Other',
};

export const STUDENT_TYPES = {
    regular: 'Regular student',
    exchange: 'Exchange / Erasmus student',
};

export const LIFESTYLE = {
    early_bird: 'Early bird',
    night_owl: 'Night owl',
    quiet: 'Quiet',
    social: 'Social',
    tidy: 'Tidy',
    cooks_often: 'Cooks often',
    studies_at_home: 'Studies at home',
    works_part_time: 'Works part-time',
    sporty: 'Sporty',
    vegetarian: 'Vegetarian',
};

export const UNIVERSITY_SUGGESTIONS = [
    'Univerza v Ljubljani',
    'Univerza v Mariboru',
    'Univerza na Primorskem',
    'Univerza v Novi Gorici',
    'Univerza v Novem mestu',
    'Fakulteta za informacijske študije v Novem mestu',
    'Alma Mater Europaea',
    'Nova univerza',
    'GEA College',
    'DOBA Fakulteta',
];

// How long they want to rent for (server: STAY_LENGTHS in server/lib/profileOptions.js)
export const STAY_LENGTHS = {
    short: { label: 'Short lease', hint: 'up to 6 months' },
    long: { label: 'Long lease', hint: 'more than 6 months' },
    year: { label: 'Year contract', hint: '12 months' },
    indefinite: { label: 'Indefinite', hint: 'for a really long time, no end date' },
    negotiable: { label: 'Open to negotiate', hint: 'we can agree on the length' },
};

export function stayLabel(p, t = en) {
    const option = p && STAY_LENGTHS[p.stay_length];
    return option ? `${t(option.label)} (${t(option.hint)})` : '';
}

// What a profile needs before contacting homeowners, in the order of the form
export const REQUIRED_LABELS = {
    profile_picture: 'Profile photo',
    birth_date: 'Date of birth',
    home_country: 'Home country',
    university: 'University',
    faculty: 'Faculty',
    study_level: 'Level of study',
};

export function studyLine(p, t = en) {
    if (!p) return '';
    const parts = [t(STUDY_LEVELS[p.study_level]), p.faculty || p.university].filter(Boolean);
    return parts.join(' · ');
}

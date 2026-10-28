// Labels for student profile values (server copy: server/lib/profileOptions.js)

export const COUNTRY_CODES = (
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ '
    + 'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR '
    + 'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP '
    + 'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT '
    + 'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW '
    + 'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG '
    + 'UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
).split(' ');

let regionNames = null;
try {
    regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
} catch {
    // very old browsers: fall back to the code
}

export function countryName(code) {
    if (!code) return '';
    if (code === 'XK') return 'Kosovo';
    try { return regionNames?.of(code) || code; } catch { return code; }
}

// Countries sorted by name, with the most common ones for Slovenian universities first
const TOP = ['SI', 'HR', 'BA', 'RS', 'MK', 'ME', 'XK', 'AL', 'IT', 'AT', 'DE'];
export const COUNTRY_OPTIONS = [
    ...TOP.map(code => ({ code, name: countryName(code) })),
    ...COUNTRY_CODES.filter(c => !TOP.includes(c))
        .map(code => ({ code, name: countryName(code) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
];

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

// Names for the fields a profile needs before contacting homeowners
export const REQUIRED_LABELS = {
    profile_picture: 'Profile photo',
    university: 'University',
    faculty: 'Faculty',
    study_level: 'Level of study',
    home_country: 'Home country',
    languages: 'Languages you speak',
    birth_date: 'Date of birth',
    smoker: 'Smoker or not',
};

export function studyLine(p) {
    if (!p) return '';
    const parts = [STUDY_LEVELS[p.study_level], p.faculty || p.university].filter(Boolean);
    return parts.join(' · ');
}

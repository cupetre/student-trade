// Allowed values for student profiles. The client has a copy with labels
// (client/src/lib/profileOptions.js): keep both in sync.

// ISO 3166-1 alpha-2 country codes. The client turns them into names
// with Intl.DisplayNames, so no long list of names is needed here.
const COUNTRIES = (
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ '
    + 'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR '
    + 'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP '
    + 'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT '
    + 'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW '
    + 'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG '
    + 'UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
).split(' ');

// Languages people can say they speak (profiles and housing listings use the same list)
const LANGUAGES = [
    'sl', 'en', 'mk', 'hr', 'sr', 'bs', 'sq', 'it', 'de', 'fr', 'es', 'pt', 'nl', 'pl', 'cs', 'sk',
    'hu', 'ro', 'bg', 'el', 'tr', 'uk', 'ru', 'ar', 'zh', 'hi', 'ja', 'ko', 'fa',
];

const STUDY_LEVELS = ['bachelor', 'master', 'phd', 'other'];
const STUDENT_TYPES = ['regular', 'exchange'];

// Short "how I live" tags shown as chips
const LIFESTYLE = [
    'early_bird', 'night_owl', 'quiet', 'social', 'tidy', 'cooks_often',
    'studies_at_home', 'works_part_time', 'sporty', 'vegetarian',
];

// Housing needs (budget, move-in, city, length of stay) are stored, but only
// the student sees them until we've tested with real users who should.
// Flip this to true to show them to homeowners the student has contacted.
const SHOW_HOUSING_NEEDS = false;

module.exports = { COUNTRIES, LANGUAGES, STUDY_LEVELS, STUDENT_TYPES, LIFESTYLE, SHOW_HOUSING_NEEDS };

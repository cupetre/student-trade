// Labels and small helpers shared by the Settle In pages (server copy of the
// lists: server/lib/settleRules.js). English here; pages show them through t().

export const PHASES = {
    before: 'Before you arrive',
    first_week: 'First week',
    first_month: 'First month',
    later: 'Later',
};

export const TOPICS = {
    documents: 'Documents',
    health: 'Health',
    money: 'Money',
    work: 'Work',
    phone: 'Phone',
    transport: 'Getting around',
    food: 'Food',
    housing: 'Housing',
    everyday: 'Everyday life',
};

export const ACCOMMODATION = {
    private: 'Private room or flat',
    dorm: 'Student dorm',
    not_yet: 'Still looking',
};

export const CITY_SUGGESTIONS = ['Koper', 'Ljubljana', 'Maribor', 'Nova Gorica', 'Novo mesto', 'Izola', 'Portorož'];

// A guide's text in the page's language. Guides are written in English first;
// when a translation is missing the English shows, and `fallback` says so.
export function guideText(content, lang) {
    const c = content || {};
    if (c[lang] && c[lang].title) {
        // A translation may only have a title and summary so far: every part it
        // leaves empty comes from English, and `fallback` says so
        const full = { ...(c.en || {}) };
        let fallback = false;
        for (const [key, value] of Object.entries(c.en || {})) {
            const own = c[lang][key];
            const empty = own == null || own === '' || (Array.isArray(own) && !own.length);
            if (!empty) full[key] = own;
            else if (value != null && value !== '' && !(Array.isArray(value) && !value.length)) fallback = true;
        }
        return { ...full, fallback: lang !== 'en' && fallback };
    }
    return { ...(c.en || {}), fallback: lang !== 'en' };
}

// "18 Nov 2026" / "18. nov. 2026"
export function formatDay(day, lang, { year = true } = {}) {
    if (!day) return '';
    const d = new Date(`${day}T12:00:00Z`);
    return d.toLocaleDateString(lang === 'sl' ? 'sl-SI' : 'en-GB', {
        day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC',
    });
}

export const euros = (n, lang) => `${Math.round(n).toLocaleString(lang === 'sl' ? 'sl-SI' : 'en-GB')} €`;

export function todayIso() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Shared bits for the marketplace pages (browse, item, sell, my items)
export { formatEuro } from '../../lib/housingOptions';

// "Today", "Yesterday", "3 days ago", "2 weeks ago", else the date
export function postedAgo(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 35) {
        const weeks = Math.round(days / 7);
        return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const SORTS = {
    newest: 'Newest',
    price_asc: 'Cheapest first',
    price_desc: 'Most expensive first',
};

export const REPORT_REASONS = ['Scam', 'Inappropriate', 'Spam', 'Misleading', 'Other'];

// Same keys as the server (server/lib/marketOptions.js)
export const CATEGORIES = {
    furniture: 'Furniture',
    books: 'Books & study',
    electronics: 'Electronics',
    kitchen: 'Kitchen',
    home: 'Home & decor',
    clothing: 'Clothing',
    bikes: 'Bikes & transport',
    sports: 'Sports & outdoors',
    music: 'Music & hobbies',
    other: 'Other',
};

// "How much has it been used"
export const CONDITIONS = {
    new: { label: 'New', hint: 'Never used, maybe still in the box' },
    like_new: { label: 'Like new', hint: 'Used a few times, no marks' },
    good: { label: 'Good', hint: 'Used, works well, small signs of use' },
    fair: { label: 'Fair', hint: 'Clearly used, some wear, still does the job' },
    worn: { label: 'Worn', hint: 'Well used, priced for it' },
};

// How the seller wants the first contact to go
export const CONTACT_PREFERENCES = {
    message: { label: 'Message me here', hint: 'Write in Anchor messages and we sort it out there' },
    message_then_call: { label: 'Message first, then a call', hint: 'Say hi here; I share my number once we agree' },
    message_then_meet: { label: 'Message first, then meet', hint: 'Agree on a time here and meet at the pick-up spot' },
};

export const PAGE_SIZE = 30; // 3 per row, 10 rows

// The city a university is in, for "Koper · FAMNIT" on the seller card
const UNIVERSITY_CITIES = {
    'univerza v ljubljani': 'Ljubljana',
    'univerza v mariboru': 'Maribor',
    'univerza na primorskem': 'Koper',
    'univerza v novi gorici': 'Nova Gorica',
    'univerza v novem mestu': 'Novo mesto',
    'fakulteta za informacijske studije v novem mestu': 'Novo mesto',
    'alma mater europaea': 'Maribor',
    'nova univerza': 'Nova Gorica',
    'gea college': 'Ljubljana',
    'doba fakulteta': 'Maribor',
};
const fold = (value) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function universityCity(university) {
    return UNIVERSITY_CITIES[fold(university)] || null;
}

// A short name for a faculty: "FAMNIT" stays as it is, "Faculty of Computer and
// Information Science (FRI)" gives "FRI", a long name without one gives its initials
// ("Fakulteta za matematiko, naravoslovje in informacijske tehnologije" -> "FMNIT")
const SMALL_WORDS = new Set(['za', 'in', 'na', 'v', 'z', 's', 'of', 'and', 'the', 'for', 'in', 'de', 'la']);
export function facultyShort(faculty) {
    const name = String(faculty || '').trim();
    if (!name) return '';
    const inBrackets = name.match(/\(([^)]{2,12})\)/);
    if (inBrackets) return inBrackets[1].trim();
    if (!name.includes(' ') && name.length <= 12) return name;
    const letters = name
        .split(/[\s,/-]+/)
        .filter(word => word && !SMALL_WORDS.has(word.toLowerCase()))
        .map(word => word[0].toUpperCase())
        .join('');
    return letters.slice(0, 6);
}

export const MAX_TITLE = 255;
export const MAX_DESCRIPTION = 5000;
export const MAX_MESSAGE = 1000;
export const MAX_PICKUP = 120;
export const MAX_PHOTO_MB = 10;

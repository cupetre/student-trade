// Labels for the values the backend accepts (see server/lib/housingOptions.js).
// Keep both files in sync when adding a new option.

export const LISTING_TYPES = {
    rental: { label: 'For rent', badge: 'For rent', help: 'A room or place you rent out as the owner or agency.' },
    sublet: { label: 'Replace me', badge: 'Sublet', help: "You're moving out and someone can take over your room." },
    roommate: { label: 'Roommate wanted', badge: 'Roommate wanted', help: 'You live there and are looking for a flatmate.' },
};

export const PROPERTY_TYPES = {
    room_in_flat: 'Room in a flat',
    room_in_house: 'Room in a house',
    shared_room: 'Shared room',
    studio: 'Studio',
    apartment: 'Whole apartment',
    house: 'Whole house',
};

export const FURNISHING = {
    furnished: 'Furnished',
    semi_furnished: 'Partly furnished',
    unfurnished: 'Unfurnished',
};

export const AMENITIES = {
    internet: 'Internet',
    washing_machine: 'Washing machine',
    dishwasher: 'Dishwasher',
    parking: 'Parking',
    bike_storage: 'Bike storage',
    balcony: 'Balcony',
    elevator: 'Elevator',
    central_heating: 'Central heating',
    air_conditioning: 'Air conditioning',
    garden: 'Garden',
};

// Same list as student profiles
export { LANGUAGES } from './profileOptions';

export const STATUSES = {
    pending_review: { label: 'Waiting for review', tone: 'soon' },
    active: { label: 'Live', tone: 'live' },
    paused: { label: 'Paused', tone: 'muted' },
    filled: { label: 'Filled', tone: 'muted' },
    archived: { label: 'Archived', tone: 'muted' },
    rejected: { label: 'Not approved', tone: 'error' },
};

export const CITY_SUGGESTIONS = [
    'Ljubljana', 'Maribor', 'Koper', 'Izola', 'Piran', 'Portorož', 'Nova Gorica',
    'Celje', 'Kranj', 'Novo mesto', 'Ptuj', 'Velenje', 'Murska Sobota', 'Domžale', 'Kamnik',
];

export const MAX_PHOTOS = 12;

export function formatEuro(value) {
    if (value === null || value === undefined || value === '') return '';
    const n = Number(value);
    return `€${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

// "2026-10-01T00:00:00.000Z" -> "1 Oct 2026"
export function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// For <input type="date">: "2026-10-01T00:00:00.000Z" -> "2026-10-01"
export function toDateInput(value) {
    return value ? String(value).slice(0, 10) : '';
}

export function spotsText(listing) {
    const open = listing.spots_open ?? listing.spots_total;
    const total = listing.spots_total;
    if (!total) return '';
    if (total === 1) return open > 0 ? '1 spot' : 'No spots left';
    return `${open} of ${total} spots open`;
}

// What the owner can switch a listing to from each status (same table as the server)
export const OWNER_STATUS_CHANGES = {
    active: ['paused', 'filled', 'archived'],
    paused: ['active', 'filled', 'archived'],
    filled: ['active', 'archived'],
    pending_review: ['archived'],
    rejected: ['archived'],
    archived: [],
};

// Button text for each status change
export const STATUS_ACTIONS = {
    active: 'Make live',
    paused: 'Pause',
    filled: 'Mark as filled',
    archived: 'Archive',
};

// Tenancy states as the landlord sees them
export const TENANCY_STATUS = {
    pending: { label: 'Waiting for them to confirm', tone: 'soon' },
    confirmed: { label: 'Lives here', tone: 'live' },
    ended: { label: 'Moved out', tone: 'muted' },
    declined: { label: 'Declined', tone: 'error' },
};

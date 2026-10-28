// The fixed choices for housing listings. The frontend shows labels for these
// values; the backend only accepts values from these lists.

const LISTING_TYPES = ['rental', 'sublet', 'roommate'];
// rental   = posted by an approved landlord or agency
// sublet   = a student replacing themselves in their room
// roommate = students with a spare room in their flat looking for a flatmate
const STUDENT_LISTING_TYPES = ['sublet', 'roommate'];

const PROPERTY_TYPES = ['room_in_flat', 'room_in_house', 'shared_room', 'studio', 'apartment', 'house'];
const FURNISHING = ['furnished', 'semi_furnished', 'unfurnished'];
const AMENITIES = [
    'internet', 'washing_machine', 'dishwasher', 'parking', 'bike_storage',
    'balcony', 'elevator', 'central_heating', 'air_conditioning', 'garden',
];
// Same list as student profiles
const { LANGUAGES } = require('./profileOptions');

// pending_review -> active (approved) -> paused / filled -> archived
const STATUSES = ['pending_review', 'active', 'paused', 'filled', 'archived', 'rejected'];

// What an owner may change the status to, from each status.
// Going live from pending_review or rejected is an admin decision.
const OWNER_STATUS_CHANGES = {
    active: ['paused', 'filled', 'archived'],
    paused: ['active', 'filled', 'archived'],
    filled: ['active', 'archived'],
    pending_review: ['archived'],
    rejected: ['archived'],
    archived: [],
};

// Most photos a listing can have
const MAX_HOUSING_PHOTOS = 12;

module.exports = {
    MAX_HOUSING_PHOTOS,
    LISTING_TYPES,
    STUDENT_LISTING_TYPES,
    PROPERTY_TYPES,
    FURNISHING,
    AMENITIES,
    LANGUAGES,
    STATUSES,
    OWNER_STATUS_CHANGES,
};

const {
    findUserForHousing,
    createListing: createListingRow,
    findListing,
    findListingOwnerAndStatus,
    searchListings,
    listOwnListings,
    listSavedListings,
    updateListing: updateListingRow,
    setListingStatus,
    deleteListing: deleteListingRow,
    saveListing,
    unsaveListing,
} = require('../models/housingModels.js');
const { validateListing, toDate } = require('../lib/housingValidation');
const {
    LISTING_TYPES, STUDENT_LISTING_TYPES, PROPERTY_TYPES, FURNISHING, STATUSES, OWNER_STATUS_CHANGES, MAX_HOUSING_PHOTOS,
} = require('../lib/housingOptions');
const { toId } = require('../lib/parse');
const { toHousingDto, toReviewDto } = require('../lib/dto');
const { findUserWithProfile } = require('../models/profileModels.js');
const { openChat } = require('../models/messageModels.js');
const { sendChatMessage, userRoom } = require('../services/messageService');
const { readInterest, interestMessage } = require('../lib/housingInterest');
const { listListingReviews, ratingSummary } = require('../models/reviewModels.js');
const { missingProfileFields } = require('../lib/profileValidation');
const { readCoordinates, locationFields } = require('../lib/location');
const { geocodeAddress, GeocoderUnavailable } = require('../lib/geocode');

const PAGE_SIZE = 24;

// In development, new listings and landlords go live straight away.
// In production set HOUSING_AUTO_APPROVE=false so you review them first.
function autoApprove() {
    return process.env.HOUSING_AUTO_APPROVE === 'true';
}

// The form sends the listing as one JSON field next to the photo files
function readListingInput(req) {
    try {
        const parsed = JSON.parse(req.body.listing || '{}');
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

function uploadedPhotoUrls(req) {
    return (req.files || []).map(file => file.location).filter(Boolean);
}

// Who may post what. Returns null when allowed, otherwise { status, error }.
function postingProblem(user, listingType) {
    if (!user) return { status: 401, error: 'Please log in again' };
    if (user.role === 'admin') return null;

    if (user.role === 'landlord') {
        if (user.landlord_status !== 'approved') {
            return { status: 403, error: 'Your landlord account is waiting for approval. You can post listings once it is approved.' };
        }
        if (listingType !== 'rental') return { status: 400, error: 'Landlord accounts post rental listings.' };
        return null;
    }

    if (!STUDENT_LISTING_TYPES.includes(listingType)) {
        return { status: 403, error: 'Students can post sublets and roommate searches. Landlords and agencies need a landlord account.' };
    }
    return null;
}

function canManage(user, listing) {
    return Boolean(user && listing && (user.role === 'admin' || listing.owner_id === user.id));
}

// Where the listing goes on the map: the owner's pin if they placed one,
// otherwise the address looked up on the map (best effort: if that fails the
// listing is saved without a location and can get one later).
async function resolveLocation(req, point, data) {
    if (point) return { point, source: 'pin' };
    try {
        const found = await geocodeAddress({ street: data.street, city: data.city, postal_code: data.postal_code });
        return found ? { point: { latitude: found.latitude, longitude: found.longitude }, source: 'address' } : null;
    } catch (err) {
        req.log.warn({ err: err.message }, 'geocoding failed, saving without a map location');
        return null;
    }
}

function sameAddress(a, b) {
    const norm = (v) => String(v || '').trim().toLowerCase();
    return ['street', 'city', 'postal_code'].every(key => norm(a[key]) === norm(b[key]));
}

function validationFailed(res, errors) {
    return res.status(400).json({ error: 'Please fix the highlighted fields', fields: errors });
}

// ---------- create ----------

async function createListing(req, res) {
    const input = readListingInput(req);
    if (!input) return res.status(400).json({ error: 'Invalid listing data' });

    const { data, errors } = validateListing(input);
    if (data.spots_open === 0) errors.spots_open = 'A new listing needs at least one open spot';
    const pin = readCoordinates(input);
    if (pin.error) errors.location = pin.error;
    const photoUrls = uploadedPhotoUrls(req);
    if (photoUrls.length === 0) errors.photos = 'Add at least one photo';
    if (Object.keys(errors).length) return validationFailed(res, errors);

    try {
        const user = await findUserForHousing(req.user.id);
        const problem = postingProblem(user, data.listing_type);
        if (problem) return res.status(problem.status).json({ error: problem.error });

        const live = autoApprove();
        const located = await resolveLocation(req, pin.value, data);
        const created = await createListingRow({
            ...data,
            ...(located ? locationFields(located.point, located.source, null) : {}),
            owner_id: user.id,
            status: live ? 'active' : 'pending_review',
            reviewed_at: live ? new Date() : null,
        }, photoUrls);

        req.log.info({ listingId: created.id, status: created.status }, 'housing listing created');
        res.status(201).json({
            message: live ? 'Your listing is live.' : 'Thanks! Your listing will go live after a quick review.',
            listing: toHousingDto(created, { viewerId: req.user.id }),
        });
    } catch (err) {
        req.log.error({ err }, 'failed to create housing listing');
        res.status(500).json({ error: 'Could not save the listing. Please try again.' });
    }
}

// ---------- browse ----------

function buildSearch(query) {
    const where = { status: 'active', spots_open: { gt: 0 } };

    const city = typeof query.city === 'string' ? query.city.trim() : '';
    if (city) where.city = { contains: city, mode: 'insensitive' };

    if (LISTING_TYPES.includes(query.listing_type)) where.listing_type = query.listing_type;

    const types = typeof query.property_type === 'string'
        ? query.property_type.split(',').filter(t => PROPERTY_TYPES.includes(t))
        : [];
    if (types.length) where.property_type = { in: types };

    const maxPrice = Number(query.max_price);
    if (query.max_price && Number.isFinite(maxPrice) && maxPrice > 0) where.rent_per_person = { lte: maxPrice };

    const minSpots = Number(query.min_spots);
    if (Number.isInteger(minSpots) && minSpots > 1) where.spots_open = { gte: minSpots };

    if (FURNISHING.includes(query.furnishing)) where.furnishing = query.furnishing;
    if (query.registration === 'true') where.address_registration_allowed = true;
    if (query.subsidy === 'true') where.subsidy_eligible = true;

    const moveIn = toDate(query.move_in);
    if (moveIn) where.available_from = { lte: moveIn };

    const sorts = {
        newest: { created_at: 'desc' },
        price_asc: { rent_per_person: 'asc' },
        price_desc: { rent_per_person: 'desc' },
        soonest: { available_from: 'asc' },
    };
    const orderBy = sorts[query.sort] || sorts.newest;

    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    return { where, orderBy, page };
}

async function browseListings(req, res) {
    const { where, orderBy, page } = buildSearch(req.query || {});
    try {
        const { items, total } = await searchListings({
            where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, viewerId: req.user.id,
        });
        res.json({
            items: items.map(toHousingDto),
            total,
            page,
            pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        });
    } catch (err) {
        req.log.error({ err }, 'failed to search housing');
        res.status(500).json({ error: 'Could not load housing listings' });
    }
}

async function getListing(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });

    try {
        const listing = await findListing(id, req.user.id);
        if (!listing) return res.status(404).json({ error: 'Listing not found' });

        // Listings that aren't live are only visible to their owner and admins
        if (listing.status !== 'active') {
            const user = await findUserForHousing(req.user.id);
            if (!canManage(user, listing)) return res.status(404).json({ error: 'Listing not found' });
        }
        const [ownerRating, listingRating] = await Promise.all([
            ratingSummary({ reviewee_id: listing.owner_id }),
            ratingSummary({ housing_listing_id: listing.id, reviewee_id: listing.owner_id, context: 'housing' }),
        ]);
        const dto = toHousingDto(listing, { viewerId: req.user.id });
        if (dto.owner) dto.owner.rating = ownerRating;
        dto.rating = listingRating;
        res.json(dto);
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to load housing listing');
        res.status(500).json({ error: 'Could not load the listing' });
    }
}

async function myListings(req, res) {
    try {
        const listings = await listOwnListings(req.user.id);
        res.json(listings.map(listing => toHousingDto(listing, { viewerId: req.user.id })));
    } catch (err) {
        req.log.error({ err }, 'failed to load own housing listings');
        res.status(500).json({ error: 'Could not load your listings' });
    }
}

async function savedListings(req, res) {
    try {
        const listings = await listSavedListings(req.user.id);
        res.json(listings.map(toHousingDto));
    } catch (err) {
        req.log.error({ err }, 'failed to load saved housing');
        res.status(500).json({ error: 'Could not load your saved places' });
    }
}

// ---------- edit ----------

async function updateListing(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });

    const input = readListingInput(req);
    if (!input) return res.status(400).json({ error: 'Invalid listing data' });

    const { data, errors } = validateListing(input);
    const pin = readCoordinates(input);
    if (pin.error) errors.location = pin.error;

    try {
        const [existing, user] = await Promise.all([findListingOwnerAndStatus(id), findUserForHousing(req.user.id)]);
        if (!existing || !canManage(user, existing)) return res.status(404).json({ error: 'Listing not found' });

        const ownPhotoIds = existing.photos.map(photo => photo.id);
        const removePhotoIds = (Array.isArray(input.remove_photo_ids) ? input.remove_photo_ids : [])
            .map(toId)
            .filter(photoId => photoId && ownPhotoIds.includes(photoId));
        const newPhotoUrls = uploadedPhotoUrls(req);
        const photoCount = ownPhotoIds.length - removePhotoIds.length + newPhotoUrls.length;
        if (photoCount < 1) errors.photos = 'Keep at least one photo';
        if (photoCount > MAX_HOUSING_PHOTOS) errors.photos = `A listing can have at most ${MAX_HOUSING_PHOTOS} photos`;
        if (Object.keys(errors).length) return validationFailed(res, errors);

        if (user.role !== 'admin') {
            const problem = postingProblem(user, data.listing_type);
            if (problem) return res.status(problem.status).json({ error: problem.error });
        }

        // The pin moves when the owner moved it, or when the address changed
        // without a new pin (then the new address is looked up)
        let location = {};
        if (pin.value || !sameAddress(existing, data)) {
            const located = await resolveLocation(req, pin.value, data);
            location = located
                ? locationFields(located.point, located.source, existing)
                : { latitude: null, longitude: null, public_latitude: null, public_longitude: null, location_source: null };
        }

        const startPosition = existing.photos.reduce((max, photo) => Math.max(max, photo.position), -1) + 1;
        await updateListingRow(id, { ...data, ...location }, { removePhotoIds, newPhotoUrls, startPosition });

        const updated = await findListing(id, req.user.id);
        req.log.info({ listingId: id }, 'housing listing updated');
        res.json({ message: 'Listing updated', listing: toHousingDto(updated, { viewerId: req.user.id }) });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to update housing listing');
        res.status(500).json({ error: 'Could not update the listing. Please try again.' });
    }
}

async function changeStatus(req, res) {
    const id = toId(req.params.id);
    const status = req.body && req.body.status;
    if (!id) return res.status(400).json({ error: 'Invalid listing' });
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status' });

    try {
        const [existing, user] = await Promise.all([findListingOwnerAndStatus(id), findUserForHousing(req.user.id)]);
        if (!existing || !canManage(user, existing)) return res.status(404).json({ error: 'Listing not found' });

        const isAdmin = user.role === 'admin';
        const allowed = OWNER_STATUS_CHANGES[existing.status] || [];
        if (!isAdmin && !allowed.includes(status)) {
            return res.status(400).json({ error: `This listing can't be changed from "${existing.status}" to "${status}".` });
        }

        const extra = isAdmin && (status === 'active' || status === 'rejected') ? { reviewed_at: new Date() } : {};
        await setListingStatus(id, status, extra);
        req.log.info({ listingId: id, from: existing.status, to: status }, 'housing listing status changed');
        res.json({ message: 'Status updated', status });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to change housing status');
        res.status(500).json({ error: 'Could not change the status' });
    }
}

async function deleteListing(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });

    try {
        const [existing, user] = await Promise.all([findListingOwnerAndStatus(id), findUserForHousing(req.user.id)]);
        if (!existing || !canManage(user, existing)) return res.status(404).json({ error: 'Listing not found' });

        await deleteListingRow(id);
        req.log.info({ listingId: id }, 'housing listing deleted');
        res.json({ message: 'Listing deleted' });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to delete housing listing');
        res.status(500).json({ error: 'Could not delete the listing' });
    }
}

// ---------- favourites ----------

async function save(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });

    try {
        const listing = await findListingOwnerAndStatus(id);
        if (!listing || listing.status !== 'active') return res.status(404).json({ error: 'Listing not found' });
        await saveListing(req.user.id, id);
        res.json({ saved: true });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to save housing listing');
        res.status(500).json({ error: 'Could not save the listing' });
    }
}

async function unsave(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });

    try {
        await unsaveListing(req.user.id, id);
        res.json({ saved: false });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to unsave housing listing');
        res.status(500).json({ error: 'Could not update your saved places' });
    }
}

// ---------- contact + reviews ----------

// "Message" on a listing. Students need a complete profile first, so the
// homeowner knows who is writing to them. Opens (or reuses) the chat.
async function contactOwner(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });

    try {
        const [listing, me] = await Promise.all([findListingOwnerAndStatus(id), findUserWithProfile(req.user.id)]);
        if (!listing || listing.status !== 'active') return res.status(404).json({ error: 'Listing not found' });
        if (!me) return res.status(401).json({ error: 'Please log in again' });
        if (listing.owner_id === me.id) return res.status(400).json({ error: 'This is your own listing' });

        if (me.role === 'student') {
            const missing = missingProfileFields(me, me.studentProfile);
            if (missing.length) {
                return res.status(403).json({
                    error: 'Complete your profile first, so the owner knows who is contacting them.',
                    code: 'PROFILE_INCOMPLETE',
                    missing,
                });
            }
        }

        // What the student is interested in becomes the first message (optional)
        const interest = readInterest(req.body);
        if (interest.error) return res.status(400).json({ error: interest.error });
        const text = interestMessage(interest.value, listing);

        const chatId = await openChat({ user1_id: me.id, user2_id: listing.owner_id });
        if (text) {
            const { message, receiverId } = await sendChatMessage({ chatId, senderId: me.id, content: text });
            if (req.io) req.io.to(userRoom(receiverId)).emit('new_message', message);
        }
        req.log.info({ listingId: id, chatId, sent: Boolean(text), interests: interest.value.interests }, 'housing contact opened');
        res.json({ chat_id: chatId, sent: Boolean(text) });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to contact housing owner');
        res.status(500).json({ error: 'Could not open the chat. Please try again.' });
    }
}

async function listingReviews(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });

    try {
        const listing = await findListingOwnerAndStatus(id);
        if (!listing) return res.status(404).json({ error: 'Listing not found' });
        const reviews = await listListingReviews(id, listing.owner_id);
        res.json(reviews.map(toReviewDto));
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to load listing reviews');
        res.status(500).json({ error: 'Could not load reviews' });
    }
}

// "Find on the map" in the listing form: address -> pin position
async function geocode(req, res) {
    const q = req.query || {};
    const street = typeof q.street === 'string' ? q.street.trim().slice(0, 200) : '';
    const city = typeof q.city === 'string' ? q.city.trim().slice(0, 100) : '';
    const postal_code = typeof q.postal_code === 'string' ? q.postal_code.trim().slice(0, 10) : '';
    if (street.length < 3 || city.length < 2) return res.status(400).json({ error: 'Enter the street and city first' });

    try {
        const found = await geocodeAddress({ street, city, postal_code });
        if (!found) {
            return res.status(404).json({ error: 'We couldn’t find that address on the map. Check the street and city, or place the pin yourself.' });
        }
        res.json(found);
    } catch (err) {
        if (err instanceof GeocoderUnavailable) {
            req.log.warn({ err: err.message }, 'geocoder unavailable');
            return res.status(503).json({ error: 'The map search isn’t available right now. You can place the pin yourself.' });
        }
        req.log.error({ err }, 'geocode failed');
        res.status(500).json({ error: 'Could not search the map. Please try again.' });
    }
}

module.exports = {
    geocode,
    contactOwner,
    listingReviews,
    createListing,
    browseListings,
    getListing,
    myListings,
    savedListings,
    updateListing,
    changeStatus,
    deleteListing,
    save,
    unsave,
    // exported for tests
    postingProblem,
    buildSearch,
};

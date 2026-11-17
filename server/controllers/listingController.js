const {
    updateListing,
    addListing,
    searchListings,
    fetchMyListings,
    findListing,
    findListingBasics,
    removeListing,
    saveItem,
    unsaveItem,
    listSavedItems,
    updateItemWithPhotos,
    movePhotoToTable,
} = require('../models/listingModels.js');
const { listReviewsAbout, ratingSummary } = require('../models/reviewModels.js');
const { openChat, addChatTopic } = require('../models/messageModels.js');
const { sendChatMessage, userRoom } = require('../services/messageService');
const { toId } = require('../lib/parse');
const { toListingDto, toGuestItemDto, toSellerDto, toReviewDto } = require('../lib/dto');
const { ageFrom } = require('../lib/profileValidation');
const { locationFields } = require('../lib/location');
const { readItem, readBrowseQuery, itemMessage, STATUSES, PAGE_SIZE, MAX_MESSAGE, MAX_ITEM_PHOTOS } = require('../lib/marketOptions');

const uploadedUrls = (req) => (req.files || []).map(file => file.location).filter(Boolean);

// "remove_photo_ids" comes as "3,7" or a JSON list from the form
function readIds(value) {
    let list = value;
    if (typeof value === 'string') {
        try { list = JSON.parse(value); } catch { list = value.split(','); }
    }
    return (Array.isArray(list) ? list : [list]).map(v => Number(v)).filter(n => Number.isInteger(n) && (n > 0 || n === -1));
}

// The columns an item form writes. `previous` keeps the public point when the pin didn't move.
function itemData(value, previous) {
    const { point, ...fields } = value;
    const location = point ? locationFields(point, 'pin', previous) : null;
    return {
        ...fields,
        ...(location
            ? { latitude: location.latitude, longitude: location.longitude, public_latitude: location.public_latitude, public_longitude: location.public_longitude }
            : { latitude: null, longitude: null, public_latitude: null, public_longitude: null }),
    };
}

async function editListing(req, res) {
    const id = toId(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });
    const input = readItem(req.body);
    if (input.error) return res.status(400).json({ error: input.error });

    try {
        const previous = await findListingBasics(id);
        if (!previous || previous.owner_id !== req.user.id) return res.status(404).json({ error: 'Listing not found' });

        // Photos: remove the ones the seller took off, add the new ones at the end (10 at most)
        let removeIds = readIds(req.body.remove_photo_ids);
        const newPhotoUrls = uploadedUrls(req);
        let photoIds = previous.photos.map(p => p.id);
        if (!photoIds.length && previous.photo) {
            // an older item with its photo only in `photo`: id -1 means "that one"
            if (removeIds.includes(-1)) {
                await updateListing({ id, owner_id: req.user.id, data: { photo: null } });
            } else {
                const row = await movePhotoToTable(previous);
                if (row) photoIds = [row.id];
            }
        }
        removeIds = removeIds.filter(photoId => photoIds.includes(photoId));
        const photoCount = photoIds.length - removeIds.length + newPhotoUrls.length;
        if (photoCount > MAX_ITEM_PHOTOS) {
            const error = `An item can have at most ${MAX_ITEM_PHOTOS} photos`;
            return res.status(400).json({ error, fields: { photos: error } });
        }

        const result = await updateItemWithPhotos({
            id,
            owner_id: req.user.id,
            data: itemData(input.value, previous),
            removePhotoIds: removeIds,
            newPhotoUrls,
        });
        if (result.count === 0) return res.status(404).json({ error: 'Listing not found' });

        req.log.info({ listingId: id }, 'listing updated');
        res.json({ message: 'Listing updated successfully' });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to update listing');
        res.status(500).json({ error: 'Failed to update listing' });
    }
}

async function uploadListing(req, res) {
    const input = readItem(req.body);
    if (input.error) return res.status(400).json({ error: input.error });

    try {
        const listing = await addListing({
            owner_id: req.user.id,
            ...itemData(input.value, null),
        }, uploadedUrls(req));
        req.log.info({ listingId: listing.id }, 'listing created');
        res.status(201).json({ message: 'Listing created', listing: toListingDto(listing, { viewerId: req.user.id }) });
    } catch (err) {
        req.log.error({ err }, 'failed to create listing');
        res.status(500).json({ error: 'Failed to create listing' });
    }
}

// The Prisma query for the browse filters (exported for tests).
// Only items still for sale; with a viewer, not their own items.
function buildBrowse(filters, viewerId) {
    const where = { status: 'available' };
    if (viewerId) where.owner_id = { not: viewerId };
    if (filters.search) {
        where.OR = [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
        ];
    }
    if (filters.categories.length) where.category = { in: filters.categories };
    if (filters.conditions.length) where.condition = { in: filters.conditions };
    if (filters.min !== null || filters.max !== null) {
        where.price = {};
        if (filters.min !== null) where.price.gte = filters.min;
        if (filters.max !== null) where.price.lte = filters.max;
    }
    if (filters.city) where.city = { equals: filters.city, mode: 'insensitive' };
    const orderBy = filters.sort === 'price_asc'
        ? [{ price: 'asc' }, { date: 'desc' }]
        : filters.sort === 'price_desc'
            ? [{ price: 'desc' }, { date: 'desc' }]
            : filters.sort === 'oldest'
                ? [{ date: 'asc' }, { id: 'asc' }]
                : [{ date: 'desc' }, { id: 'desc' }];
    return { where, orderBy, skip: (filters.page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

// GET /api/listings/show_listings?q=&category=a,b&condition=a,b&min=&max=&city=&sort=&page=
// -> { items, total, page, pages } with 50 items a page (5 per row, 10 rows)
async function showListings(req, res) {
    const filters = readBrowseQuery(req.query);
    try {
        const { items, total } = await searchListings({ ...buildBrowse(filters, req.user.id), viewerId: req.user.id });
        res.json({
            items: items.map(item => toListingDto(item)),
            total,
            page: filters.page,
            pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
            page_size: PAGE_SIZE,
        });
    } catch (err) {
        req.log.error({ err }, 'failed to load listings');
        res.status(500).json({ error: 'Failed to load listings' });
    }
}

async function showMyListings(req, res) {
    try {
        const listings = await fetchMyListings({ owner_id: req.user.id });
        res.json(listings.map(item => toListingDto(item, { viewerId: req.user.id })));
    } catch (err) {
        req.log.error({ err }, 'failed to load own listings');
        res.status(500).json({ error: 'Failed to load your listings' });
    }
}

// GET /api/listings/item/:listingId: one item, its seller and what people say about them
async function showListing(req, res) {
    const id = toId(req.params.listingId);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });

    try {
        const listing = await findListing(id, req.user.id);
        if (!listing) return res.status(404).json({ error: 'This item is no longer available.' });

        const [reviews, rating] = await Promise.all([
            listReviewsAbout(listing.owner_id, { take: 20 }),
            ratingSummary({ reviewee_id: listing.owner_id }),
        ]);
        res.json({
            ...toListingDto(listing, { viewerId: req.user.id }),
            seller: toSellerDto(listing.owner, { ageFrom, rating }),
            seller_reviews: reviews.map(toReviewDto),
        });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to load listing');
        res.status(500).json({ error: 'Failed to load this item' });
    }
}

// POST /api/listings/item/:listingId/contact { message? }
// Opens the chat with the seller. With a message, it's sent as the first one
// ("About your “Desk chair”: …"), so the seller knows which item it's about.
async function contactSeller(req, res) {
    const id = toId(req.params.listingId);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });
    const text = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (text.length > MAX_MESSAGE) return res.status(400).json({ error: `Keep the message under ${MAX_MESSAGE} characters` });

    try {
        const item = await findListingBasics(id);
        if (!item) return res.status(404).json({ error: 'This item is no longer available.' });
        if (item.owner_id === req.user.id) return res.status(400).json({ error: 'This is your own item' });
        // a sold item can't start new first messages; the chat itself still opens
        if (item.status === 'sold' && text) return res.status(400).json({ error: 'This item has been sold.' });

        const chatId = await openChat({ user1_id: req.user.id, user2_id: item.owner_id });
        await addChatTopic({ chat_id: chatId, market_item_id: item.id, started_by: req.user.id });
        const content = itemMessage(item, text);
        if (content) {
            const { message, receiverId } = await sendChatMessage({ chatId, senderId: req.user.id, content });
            if (req.io) req.io.to(userRoom(receiverId)).emit('new_message', message);
        }
        req.log.info({ listingId: id, chatId, sent: Boolean(content) }, 'marketplace contact opened');
        res.json({ chat_id: chatId, sent: Boolean(content) });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to contact seller');
        res.status(500).json({ error: 'Could not open the chat. Please try again.' });
    }
}

// PATCH /api/listings/item/:listingId/status { status: 'sold' | 'available' }
// The seller marks an item sold (it leaves the browse page) or puts it back.
async function changeItemStatus(req, res) {
    const id = toId(req.params.listingId);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });
    const status = req.body?.status;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Choose "sold" or "available".' });

    try {
        const result = await updateListing({
            id,
            owner_id: req.user.id,
            data: { status, sold_at: status === 'sold' ? new Date() : null },
        });
        if (result.count === 0) return res.status(404).json({ error: 'Listing not found' });
        req.log.info({ listingId: id, status }, 'listing status changed');
        res.json({ message: status === 'sold' ? 'Marked as sold' : 'Back on the marketplace', status });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to change listing status');
        res.status(500).json({ error: 'Failed to update listing' });
    }
}

// POST / DELETE /api/listings/item/:listingId/save: like an item, or take the like back
async function likeItem(req, res) {
    const id = toId(req.params.listingId);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });
    try {
        const item = await findListingBasics(id);
        if (!item) return res.status(404).json({ error: 'This item is no longer available.' });
        if (item.owner_id === req.user.id) return res.status(400).json({ error: 'This is your own item' });
        await saveItem(req.user.id, id);
        res.json({ is_saved: true });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to like item');
        res.status(500).json({ error: 'Could not save this item. Please try again.' });
    }
}

async function unlikeItem(req, res) {
    const id = toId(req.params.listingId);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });
    try {
        await unsaveItem(req.user.id, id);
        res.json({ is_saved: false });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to unlike item');
        res.status(500).json({ error: 'Could not save this item. Please try again.' });
    }
}

// GET /api/listings/saved: the items I liked
async function showSavedItems(req, res) {
    try {
        const items = await listSavedItems(req.user.id);
        res.json(items.map(item => toListingDto(item)));
    } catch (err) {
        req.log.error({ err }, 'failed to load liked items');
        res.status(500).json({ error: 'Failed to load listings' });
    }
}

// ---------- visitors without an account (see /api/public) ----------

// GET /api/public/market?...: the same filters as the browse page, trimmed items
async function showListingsPublic(req, res) {
    const filters = readBrowseQuery(req.query);
    try {
        const { items, total } = await searchListings(buildBrowse(filters, null));
        res.json({
            items: items.map(toGuestItemDto),
            total,
            page: filters.page,
            pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
            page_size: PAGE_SIZE,
        });
    } catch (err) {
        req.log.error({ err }, 'failed to load public listings');
        res.status(500).json({ error: 'Failed to load listings' });
    }
}

// GET /api/public/market/:listingId: one item without the seller, the description or the map
async function showListingPublic(req, res) {
    const id = toId(req.params.listingId);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });
    try {
        const listing = await findListing(id, null);
        if (!listing) return res.status(404).json({ error: 'This item is no longer available.' });
        res.json(toGuestItemDto(listing));
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to load public listing');
        res.status(500).json({ error: 'Failed to load this item' });
    }
}

async function deleteListing(req, res) {
    const id = toId(req.params.listingId);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });

    try {
        // owner_id in the filter means you can only delete your own listings
        const result = await removeListing({ id, owner_id: req.user.id });
        if (result.count === 0) return res.status(404).json({ error: 'Listing not found' });

        req.log.info({ listingId: id }, 'listing deleted');
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to delete listing');
        res.status(500).json({ error: 'Failed to delete listing' });
    }
}

module.exports = {
    editListing,
    uploadListing,
    showListings,
    showMyListings,
    showListing,
    contactSeller,
    deleteListing,
    changeItemStatus,
    likeItem,
    unlikeItem,
    showSavedItems,
    showListingsPublic,
    showListingPublic,
    // exported for tests
    buildBrowse,
};

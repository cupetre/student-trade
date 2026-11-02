const {
    updateListing,
    addListing,
    viewListings,
    fetchMyListings,
    findListing,
    removeListing,
} = require('../models/listingModels.js');
const { toId, toTrimmedString, toPrice } = require('../lib/parse');
const { toListingDto } = require('../lib/dto');

const MAX_TITLE = 255;
const MAX_DESCRIPTION = 5000;

async function editListing(req, res) {
    const id = toId(req.body.id);
    const title = toTrimmedString(req.body.title, MAX_TITLE);
    const description = toTrimmedString(req.body.description, MAX_DESCRIPTION);
    const price = toPrice(req.body.price);

    if (!id) return res.status(400).json({ error: 'Invalid listing' });
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (price === null) return res.status(400).json({ error: 'Please enter a valid price' });

    try {
        const result = await updateListing({
            id,
            owner_id: req.user.id,
            title,
            description,
            price,
            // Only replace the photo when a new one was uploaded; undefined
            // tells Prisma to leave the existing photo alone.
            photo: req.file ? req.file.location : undefined,
        });

        if (result.count === 0) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        req.log.info({ listingId: id }, 'listing updated');
        res.json({ message: 'Listing updated successfully' });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to update listing');
        res.status(500).json({ error: 'Failed to update listing' });
    }
};

async function uploadListing(req, res) {
    const title = toTrimmedString(req.body.title, MAX_TITLE);
    const description = toTrimmedString(req.body.description, MAX_DESCRIPTION);
    const price = toPrice(req.body.price);

    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (price === null) return res.status(400).json({ error: 'Please enter a valid price' });

    try {
        const listing = await addListing({
            owner_id: req.user.id,
            title,
            description,
            price,
            photo: req.file ? req.file.location : null,
        });

        req.log.info({ listingId: listing.id }, 'listing created');
        res.status(201).json({ message: 'Listing created', listing: toListingDto(listing) });
    } catch (err) {
        req.log.error({ err }, 'failed to create listing');
        res.status(500).json({ error: 'Failed to create listing' });
    }
};

async function showListings(req, res) {
    try {
        const listings = await viewListings({ owner_id: req.user.id });
        res.json(listings.map(toListingDto));
    } catch (err) {
        req.log.error({ err }, 'failed to load listings');
        res.status(500).json({ error: 'Failed to load listings' });
    }
};

async function showMyListings(req, res) {
    try {
        const listings = await fetchMyListings({ owner_id: req.user.id });
        res.json(listings.map(toListingDto));
    } catch (err) {
        req.log.error({ err }, 'failed to load own listings');
        res.status(500).json({ error: 'Failed to load your listings' });
    }
};

// GET /api/listings/item/:listingId — one item, for the item page
async function showListing(req, res) {
    const id = toId(req.params.listingId);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });

    try {
        const listing = await findListing(id);
        if (!listing) return res.status(404).json({ error: 'This item is no longer available.' });
        res.json(toListingDto(listing));
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to load listing');
        res.status(500).json({ error: 'Failed to load this item' });
    }
};

async function deleteListing(req, res) {
    const id = toId(req.params.listingId);
    if (!id) return res.status(400).json({ error: 'Invalid listing' });

    try {
        // owner_id in the filter means you can only delete your own listings
        const result = await removeListing({ id, owner_id: req.user.id });

        if (result.count === 0) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        req.log.info({ listingId: id }, 'listing deleted');
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        req.log.error({ err, listingId: id }, 'failed to delete listing');
        res.status(500).json({ error: 'Failed to delete listing' });
    }
};

module.exports = {
    editListing,
    uploadListing,
    showListings,
    showMyListings,
    showListing,
    deleteListing,
};

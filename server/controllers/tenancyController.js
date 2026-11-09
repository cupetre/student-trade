// Tenancies: "this student lives / lived at this place".
// The listing owner adds a student they've talked to, the student confirms.
// A confirmed (or ended) tenancy is the only way to leave housing reviews.

const {
    findTenancy, findTenancyFor, createTenancy, updateTenancy, deleteTenancy,
    listTenantsOfListing, listStaysOfStudent, listChatPartners,
} = require('../models/tenancyModels.js');
const { findListingOwnerAndStatus, findUserForHousing } = require('../models/housingModels.js');
const { haveChatted } = require('../models/profileModels.js');
const { saveTenancyReview } = require('../models/reviewModels.js');
const { readReviewInput } = require('./rrController');
const { personDto, toReviewDto } = require('../lib/dto');
const { nextTenancyState, reviewTarget } = require('../lib/tenancyRules');
const { toId } = require('../lib/parse');

function tenancyDto(t, viewerId) {
    const myReview = (t.reviews || []).find(r => r.reviewer_id === viewerId);
    return {
        id: t.id,
        status: t.status,
        listing_id: t.listing_id,
        listing_title: t.listing_title,
        created_at: t.created_at,
        confirmed_at: t.confirmed_at,
        ended_at: t.ended_at,
        student: t.student ? personDto(t.student) : undefined,
        landlord: t.landlord ? personDto(t.landlord) : undefined,
        listing: t.listing ? {
            id: t.listing.id,
            title: t.listing.title,
            city: t.listing.city,
            status: t.listing.status,
            photo: t.listing.photos?.[0]?.url || null,
        } : undefined,
        my_review: myReview ? toReviewDto(myReview) : null,
        can_review: t.status === 'confirmed' || t.status === 'ended',
    };
}

async function ownedListing(req, res) {
    const id = toId(req.params.id);
    if (!id) {
        res.status(400).json({ error: 'Invalid listing' });
        return null;
    }
    const [listing, user] = await Promise.all([findListingOwnerAndStatus(id), findUserForHousing(req.user.id)]);
    const allowed = listing && user && (listing.owner_id === user.id || user.role === 'admin');
    if (!allowed) {
        res.status(404).json({ error: 'Listing not found' });
        return null;
    }
    return listing;
}

// GET /listings/:id/tenants (owner)
async function listTenants(req, res) {
    try {
        const listing = await ownedListing(req, res);
        if (!listing) return;
        const tenancies = await listTenantsOfListing(listing.id, listing.owner_id);
        res.json(tenancies.map(t => tenancyDto(t, listing.owner_id)));
    } catch (err) {
        req.log.error({ err }, 'failed to list tenants');
        res.status(500).json({ error: 'Could not load tenants' });
    }
}

// GET /listings/:id/tenant-candidates (owner): people they've chatted with
async function tenantCandidates(req, res) {
    try {
        const listing = await ownedListing(req, res);
        if (!listing) return;
        const [people, tenancies] = await Promise.all([
            listChatPartners(listing.owner_id),
            listTenantsOfListing(listing.id, listing.owner_id),
        ]);
        const taken = new Set(tenancies.filter(t => t.status !== 'declined').map(t => t.student_id));
        res.json(people.filter(p => !taken.has(p.id)).map(personDto));
    } catch (err) {
        req.log.error({ err }, 'failed to list tenant candidates');
        res.status(500).json({ error: 'Could not load your contacts' });
    }
}

// POST /listings/:id/tenants { student_id } (owner)
async function addTenant(req, res) {
    const studentId = toId(req.body && req.body.student_id);
    if (!studentId) return res.status(400).json({ error: 'Choose who lives there' });

    try {
        const listing = await ownedListing(req, res);
        if (!listing) return;
        if (studentId === listing.owner_id) return res.status(400).json({ error: "You can't add yourself as a tenant" });
        if (!(await haveChatted(listing.owner_id, studentId))) {
            return res.status(403).json({ error: 'You can only add people you have talked to in Anchor messages.' });
        }

        const title = listing.title;
        const existing = await findTenancyFor(listing.id, studentId);
        let tenancy;
        if (existing) {
            if (existing.status !== 'declined') return res.status(409).json({ error: 'This person is already added to this place.' });
            tenancy = await updateTenancy(existing.id, { status: 'pending', listing_title: title, confirmed_at: null, ended_at: null });
        } else {
            tenancy = await createTenancy({
                listing_id: listing.id,
                listing_title: title,
                landlord_id: listing.owner_id,
                student_id: studentId,
            });
        }

        req.log.info({ tenancyId: tenancy.id, listingId: listing.id }, 'tenant added (pending)');
        res.status(201).json({ message: 'Added. They need to confirm it on their side.', tenancy: tenancyDto(tenancy, listing.owner_id) });
    } catch (err) {
        if (err.code === 'P2003') return res.status(404).json({ error: 'User not found' });
        req.log.error({ err }, 'failed to add tenant');
        res.status(500).json({ error: 'Could not add the tenant' });
    }
}

// PATCH /tenancies/:id { action: confirm | decline | cancel | end }
async function changeTenancy(req, res) {
    const id = toId(req.params.id);
    const action = req.body && req.body.action;
    if (!id) return res.status(400).json({ error: 'Invalid tenancy' });

    try {
        const tenancy = await findTenancy(id);
        if (!tenancy || (tenancy.student_id !== req.user.id && tenancy.landlord_id !== req.user.id)) {
            return res.status(404).json({ error: 'Not found' });
        }
        const role = tenancy.student_id === req.user.id ? 'student' : 'landlord';
        const next = nextTenancyState(tenancy.status, action, role);
        if (!next) return res.status(400).json({ error: "That isn't possible right now." });

        if (next.delete) {
            await deleteTenancy(id);
            return res.json({ message: 'Removed', deleted: true });
        }
        const updated = await updateTenancy(id, next.data);
        req.log.info({ tenancyId: id, action, role }, 'tenancy changed');
        res.json({ message: 'Updated', status: updated.status });
    } catch (err) {
        req.log.error({ err, tenancyId: id }, 'failed to change tenancy');
        res.status(500).json({ error: 'Could not update this' });
    }
}

// GET /stays (student): places I was added to
async function myStays(req, res) {
    try {
        const stays = await listStaysOfStudent(req.user.id);
        res.json(stays.map(t => tenancyDto(t, req.user.id)));
    } catch (err) {
        req.log.error({ err }, 'failed to list stays');
        res.status(500).json({ error: 'Could not load your places' });
    }
}

// POST /tenancies/:id/review { rating, description }: tenant <-> landlord
async function reviewTenancy(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid tenancy' });

    const input = readReviewInput(req.body);
    if (input.error) return res.status(400).json({ error: input.error });

    try {
        const tenancy = await findTenancy(id);
        if (!tenancy) return res.status(404).json({ error: 'Not found' });

        const target = reviewTarget(tenancy, req.user.id);
        if (target.error) return res.status(target.status).json({ error: target.error });

        const { review, updated } = await saveTenancyReview({ tenancy, reviewerId: req.user.id, revieweeId: target.revieweeId, ...input });
        req.log.info({ tenancyId: id, reviewer: req.user.id, updated }, 'housing review saved');
        res.json({ message: updated ? 'Your review was updated' : 'Review saved', updated, review: toReviewDto(review) });
    } catch (err) {
        req.log.error({ err, tenancyId: id }, 'failed to save housing review');
        res.status(500).json({ error: 'Could not save the review' });
    }
}

module.exports = { listTenants, tenantCandidates, addTenant, changeTenancy, myStays, reviewTenancy, tenancyDto };

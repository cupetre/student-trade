const prisma = require('../lib/prisma');

const REVIEWER_PUBLIC = { select: { id: true, fullname: true, profile_picture: true, role: true } };

// One review per person about another person, whatever brought them together
// (a marketplace chat, a tenancy, or both). Leaving another one updates it.
// The database enforces it too: @@unique([reviewer_id, reviewee_id]).
async function findReviewBetween(reviewerId, revieweeId) {
    return prisma.review.findFirst({
        where: { reviewer_id: reviewerId, reviewee_id: revieweeId },
        orderBy: { updated_at: 'desc' },
    });
}

async function createReview(data) {
    return prisma.review.create({ data });
}

async function updateReview(id, data) {
    return prisma.review.update({ where: { id }, data });
}

// Housing review (tenant <-> landlord). If this person already reviewed the
// other one (from another stay or the marketplace), that review is updated
// instead of adding a second one. Returns { review, updated }.
async function saveTenancyReview({ tenancy, reviewerId, revieweeId, rating, description }) {
    const housing = {
        context: 'housing',
        tenancy_id: tenancy.id,
        housing_listing_id: tenancy.listing_id,
        listing_title: tenancy.listing_title,
    };
    const existing = await findReviewBetween(reviewerId, revieweeId);
    if (existing) {
        // A marketplace review becomes the housing one; one from another stay keeps its stay
        const link = existing.tenancy_id ? {} : housing;
        const review = await prisma.review.update({ where: { id: existing.id }, data: { rating, description, ...link } });
        return { review, updated: true };
    }
    const review = await prisma.review.create({
        data: { reviewer_id: reviewerId, reviewee_id: revieweeId, rating, description, ...housing },
    });
    return { review, updated: false };
}

async function findReview(id) {
    return prisma.review.findUnique({ where: { id } });
}

async function deleteReview(id) {
    return prisma.review.delete({ where: { id } });
}

async function listReviewsAbout(revieweeId, { take = 50 } = {}) {
    return prisma.review.findMany({
        where: { reviewee_id: revieweeId },
        orderBy: { created_at: 'desc' },
        take,
        include: { reviewer: REVIEWER_PUBLIC },
    });
}

// What tenants said about a place (not what the landlord said about tenants)
async function listListingReviews(listingId, ownerId) {
    return prisma.review.findMany({
        where: { housing_listing_id: listingId, reviewee_id: ownerId, context: 'housing' },
        orderBy: { created_at: 'desc' },
        include: { reviewer: REVIEWER_PUBLIC },
    });
}

async function ratingSummary(where) {
    const result = await prisma.review.aggregate({ where, _avg: { rating: true }, _count: { _all: true } });
    const count = result._count._all;
    return { average: count ? Math.round(result._avg.rating * 10) / 10 : null, count };
}

module.exports = {
    findReviewBetween,
    createReview,
    updateReview,
    saveTenancyReview,
    findReview,
    deleteReview,
    listReviewsAbout,
    listListingReviews,
    ratingSummary,
};

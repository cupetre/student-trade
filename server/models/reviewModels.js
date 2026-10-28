const prisma = require('../lib/prisma');

const REVIEWER_PUBLIC = { select: { id: true, fullname: true, profile_picture: true, role: true } };

// One marketplace review per person: find the existing one to update it
async function findMarketplaceReview(reviewerId, revieweeId) {
    return prisma.review.findFirst({
        where: { reviewer_id: reviewerId, reviewee_id: revieweeId, context: 'marketplace' },
    });
}

async function createReview(data) {
    return prisma.review.create({ data });
}

async function updateReview(id, data) {
    return prisma.review.update({ where: { id }, data });
}

// Housing: one review per tenancy per side (the unique index enforces it)
async function upsertTenancyReview({ tenancy, reviewerId, revieweeId, rating, description }) {
    return prisma.review.upsert({
        where: { tenancy_id_reviewer_id: { tenancy_id: tenancy.id, reviewer_id: reviewerId } },
        create: {
            reviewer_id: reviewerId,
            reviewee_id: revieweeId,
            rating,
            description,
            context: 'housing',
            tenancy_id: tenancy.id,
            housing_listing_id: tenancy.listing_id,
            listing_title: tenancy.listing_title,
        },
        update: { rating, description },
    });
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
    findMarketplaceReview,
    createReview,
    updateReview,
    upsertTenancyReview,
    findReview,
    deleteReview,
    listReviewsAbout,
    listListingReviews,
    ratingSummary,
};

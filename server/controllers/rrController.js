const { addReport } = require('../models/rrModels.js');
const {
    findMarketplaceReview, createReview, updateReview, findReview, deleteReview: deleteReviewRow,
    listReviewsAbout, ratingSummary,
} = require('../models/reviewModels.js');
const { haveChatted, findUserWithProfile } = require('../models/profileModels.js');
const { toId, toTrimmedString } = require('../lib/parse');
const { toReviewDto } = require('../lib/dto');

const MAX_TEXT = 1000;

// Shared by marketplace and housing reviews. Returns { rating, description } or { error }.
function readReviewInput(body) {
    const rating = Number(body && body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Choose a rating from 1 to 5 stars' };
    const description = toTrimmedString(body && body.description, MAX_TEXT) || null;
    return { rating, description };
}

async function submitReport(req, res) {
    const reporter_id = req.user.id;
    const reported_id = toId(req.body.reported_id);
    const item_id = req.body.item_id == null || req.body.item_id === '' ? null : toId(req.body.item_id);
    const description = toTrimmedString(req.body.description, MAX_TEXT);

    if (!reported_id) return res.status(400).json({ error: 'Invalid user' });
    if (req.body.item_id != null && req.body.item_id !== '' && !item_id) return res.status(400).json({ error: 'Invalid listing' });
    if (reported_id === reporter_id) return res.status(400).json({ error: "You can't report yourself" });
    if (!description) return res.status(400).json({ error: 'Please give a reason for the report' });

    try {
        await addReport({ reporter_id, reported_id, item_id, description });
        req.log.info({ reporter_id, reported_id, item_id }, 'report submitted');
        res.status(201).json({ message: 'Report submitted' });
    } catch (err) {
        if (err.code === 'P2003') return res.status(404).json({ error: 'User or listing not found' });
        req.log.error({ err }, 'failed to submit report');
        res.status(500).json({ error: 'Failed to submit report' });
    }
}

// Marketplace review: only between people who have chatted, one per person
// (sending it again updates the earlier one instead of adding another).
async function submitReview(req, res) {
    const reviewerId = req.user.id;
    const revieweeId = toId(req.body.user2_id);
    if (!revieweeId) return res.status(400).json({ error: 'Invalid user' });
    if (revieweeId === reviewerId) return res.status(400).json({ error: "You can't review yourself" });

    const input = readReviewInput(req.body);
    if (input.error) return res.status(400).json({ error: input.error });

    try {
        if (!(await haveChatted(reviewerId, revieweeId))) {
            return res.status(403).json({ error: 'You can only review people you have traded or talked with.' });
        }

        const existing = await findMarketplaceReview(reviewerId, revieweeId);
        const review = existing
            ? await updateReview(existing.id, input)
            : await createReview({ reviewer_id: reviewerId, reviewee_id: revieweeId, context: 'marketplace', ...input });

        req.log.info({ reviewer: reviewerId, reviewee: revieweeId, updated: Boolean(existing) }, 'review saved');
        res.status(existing ? 200 : 201).json({
            message: existing ? 'Your review was updated' : 'Review submitted',
            review: toReviewDto(review),
        });
    } catch (err) {
        if (err.code === 'P2003') return res.status(404).json({ error: 'User not found' });
        req.log.error({ err }, 'failed to submit review');
        res.status(500).json({ error: 'Failed to submit review' });
    }
}

// Reviews about me (profile page)
async function getReviews(req, res) {
    try {
        const reviews = await listReviewsAbout(req.user.id);
        res.json(reviews.map(toReviewDto));
    } catch (err) {
        req.log.error({ err }, 'failed to load reviews');
        res.status(500).json({ error: 'Failed to load reviews' });
    }
}

// Reviews about anyone (public profile page)
async function getUserReviews(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user' });
    try {
        const [reviews, summary] = await Promise.all([
            listReviewsAbout(id),
            ratingSummary({ reviewee_id: id }),
        ]);
        res.json({ ...summary, reviews: reviews.map(toReviewDto) });
    } catch (err) {
        req.log.error({ err, userId: id }, 'failed to load user reviews');
        res.status(500).json({ error: 'Failed to load reviews' });
    }
}

// Only the person who wrote a review (or an admin) can delete it
async function deleteReview(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid review' });
    try {
        const [review, me] = await Promise.all([findReview(id), findUserWithProfile(req.user.id)]);
        const isAdmin = me?.role === 'admin';
        if (!review || (review.reviewer_id !== req.user.id && !isAdmin)) {
            return res.status(404).json({ error: 'Review not found' });
        }
        await deleteReviewRow(id);
        req.log.info({ reviewId: id, by: req.user.id }, 'review deleted');
        res.json({ message: 'Review deleted' });
    } catch (err) {
        req.log.error({ err, reviewId: id }, 'failed to delete review');
        res.status(500).json({ error: 'Could not delete the review' });
    }
}

module.exports = {
    submitReport,
    submitReview,
    getReviews,
    getUserReviews,
    deleteReview,
    readReviewInput,
};

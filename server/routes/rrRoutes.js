const express = require('express');
const router = express.Router();
const { authenticationToken } = require('../configs/authConfig');
const { createRateLimiter } = require('../lib/rateLimit');
const { submitReport, submitReview, getReviews, getUserReviews, deleteReview } = require('../controllers/rrController');

// Per account: stops one person from flooding reports or reviews
const writeLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, max: 30, keyFn: (req) => `user:${req.user && req.user.id}`,
    message: 'Too many requests. Please try again later.',
});

router.post('/submit_report', authenticationToken, writeLimiter, submitReport);
router.post('/submit_review', authenticationToken, writeLimiter, submitReview);
router.get('/get_reviews', authenticationToken, getReviews);
router.get('/users/:id/reviews', authenticationToken, getUserReviews);
router.delete('/reviews/:id', authenticationToken, deleteReview);

module.exports = router;
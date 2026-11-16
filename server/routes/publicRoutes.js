const express = require('express');
const router = express.Router();
const { submitInterest } = require('../controllers/publicController');
const { showListingsPublic, showListingPublic } = require('../controllers/listingController');
const { browseListingsPublic, getListingPublic } = require('../controllers/housingController');
const { createRateLimiter } = require('../lib/rateLimit');

// Public form without login, so keep spam in check
const interestLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many requests from this network. Please try again later.',
});

router.post('/interest', interestLimiter, submitInterest);

// Browsing without an account: trimmed listings (no names, descriptions or
// streets). Limited per network so nobody can copy the whole site quickly;
// generous, because a whole student dorm can share one address.
const browseLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 600,
    message: 'Too many requests from this network. Please try again in a few minutes, or log in.',
});
router.get('/market', browseLimiter, showListingsPublic);
router.get('/market/:listingId', browseLimiter, showListingPublic);
router.get('/housing', browseLimiter, browseListingsPublic);
router.get('/housing/:id', browseLimiter, getListingPublic);

module.exports = router;

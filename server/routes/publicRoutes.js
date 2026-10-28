const express = require('express');
const router = express.Router();
const { submitInterest } = require('../controllers/publicController');
const { createRateLimiter } = require('../lib/rateLimit');

// Public form without login, so keep spam in check
const interestLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many requests from this network. Please try again later.',
});

router.post('/interest', interestLimiter, submitInterest);

module.exports = router;

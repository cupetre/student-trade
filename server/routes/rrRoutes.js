const express = require('express');
const router = express.Router();
const { authenticationToken } = require('../configs/authConfig');
const { submitReport, submitReview, getReviews } = require('../controllers/rrController');

router.post('/submit_report', authenticationToken, submitReport);
router.post('/submit_review', authenticationToken, submitReview);
router.get('/get_reviews', authenticationToken, getReviews);

module.exports = router;
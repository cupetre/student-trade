const express = require('express');
const router = express.Router();
const {
    editListing, uploadListing, showListings, showMyListings, showListing, contactSeller, deleteListing,
    changeItemStatus, likeItem, unlikeItem, showSavedItems,
} = require('../controllers/listingController');
const { upload2 } = require('../configs/multerConfig');
const { authenticationToken } = require('../configs/authConfig');
const { createRateLimiter } = require('../lib/rateLimit');

// Stops one account from opening chats / sending first messages in bulk
const contactLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 60,
    keyFn: (req) => `market-contact:${req.user?.id || req.ip}`,
    message: 'Too many messages in a short time. Please wait a little and try again.',
});

router.put('/edit_listing',authenticationToken, upload2.single('photo'), editListing);
router.post('/upload_listing', authenticationToken, upload2.single('photo'), uploadListing);
router.get('/show_listings', authenticationToken, showListings);
router.get('/fetch_my_listings', authenticationToken, showMyListings);
router.get('/saved', authenticationToken, showSavedItems);
router.get('/item/:listingId', authenticationToken, showListing);
router.patch('/item/:listingId/status', authenticationToken, changeItemStatus);
router.post('/item/:listingId/save', authenticationToken, likeItem);
router.delete('/item/:listingId/save', authenticationToken, unlikeItem);
router.post('/item/:listingId/contact', authenticationToken, contactLimiter, contactSeller);
router.delete('/delete_listing/:listingId', authenticationToken, deleteListing);

module.exports = router;
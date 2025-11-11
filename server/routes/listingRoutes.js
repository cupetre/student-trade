const express = require('express');
const router = express.Router();
const { editListing, uploadListing, showListings, showMyListings, deleteListing } = require('../controllers/listingController');
const { upload2 } = require('../configs/multerConfig');
const { authenticationToken } = require('../configs/authConfig');

router.put('/edit_listing',authenticationToken, upload2.single('photo'), editListing);
router.post('/upload_listing', authenticationToken, upload2.single('photo'), uploadListing);
router.get('/show_listings', authenticationToken, showListings);
router.get('/fetch_my_listings', authenticationToken, showMyListings);
router.delete('/delete_listing/:listingId', authenticationToken, deleteListing);

module.exports = router;
const express = require('express');
const router = express.Router();
const { editListing, uploadListing } = require('../controllers/listingController');
const { upload2 } = require('../configs/multerConfig');
const { authenticationToken } = require('../configs/authConfig');

router.put('/edit_listing',authenticationToken, upload2.single('photo'), editListing);
router.post('/upload_listing', authenticationToken, upload2.single('photo'), uploadListing);

module.exports = router;
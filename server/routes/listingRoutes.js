const express = require('express');
const router = express.Router();
const { editListing } = require('../controllers/listingController');
const { upload2 } = require('../configs/multerConfig');

router.put('/edit_listing', upload2.single('photo'), editListing);

module.exports = router;
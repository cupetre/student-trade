const express = require('express');
const router = express.Router();
const { authenticationToken } = require('../configs/authConfig');
const { uploadHousingPhotos } = require('../configs/multerConfig');
const {
    createListing, browseListings, getListing, myListings, savedListings,
    updateListing, changeStatus, deleteListing, save, unsave, contactOwner, listingReviews,
} = require('../controllers/housingController');
const {
    listTenants, tenantCandidates, addTenant, changeTenancy, myStays, reviewTenancy,
} = require('../controllers/tenancyController');
const { createRateLimiter } = require('../lib/rateLimit');

// Stops one account from spamming chats or reviews
const writeLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, max: 60, keyFn: (req) => `user:${req.user && req.user.id}`,
    message: 'Too many requests. Please slow down and try again later.',
});

// Everything in housing needs a login. This runs before the photo upload,
// so nobody can push files to S3 without an account.
router.use(authenticationToken);

router.get('/listings', browseListings);
router.get('/listings/saved', savedListings); // before /listings/:id so "saved" isn't read as an id
router.get('/mine', myListings);
router.get('/listings/:id', getListing);

router.post('/listings', uploadHousingPhotos, createListing);
router.put('/listings/:id', uploadHousingPhotos, updateListing);
router.patch('/listings/:id/status', changeStatus);
router.delete('/listings/:id', deleteListing);

router.post('/listings/:id/save', save);
router.delete('/listings/:id/save', unsave);

// Contact the owner (students need a complete profile) and read reviews
router.post('/listings/:id/contact', writeLimiter, contactOwner);
router.get('/listings/:id/reviews', listingReviews);

// Tenancies: owner adds a tenant, the tenant confirms, then both can review
router.get('/listings/:id/tenants', listTenants);
router.get('/listings/:id/tenant-candidates', tenantCandidates);
router.post('/listings/:id/tenants', writeLimiter, addTenant);
router.get('/stays', myStays);
router.patch('/tenancies/:id', changeTenancy);
router.post('/tenancies/:id/review', writeLimiter, reviewTenancy);

module.exports = router;

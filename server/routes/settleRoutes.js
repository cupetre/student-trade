const express = require('express');
const router = express.Router();
const { authenticationToken } = require('../configs/authConfig');
const {
    getMySettleProfile, saveMySettleProfile, getMyChecklist, setChecklistItem,
    listGuides, getGuide, getCost,
    requireAdmin, adminListGuides, adminGetGuide, adminSaveGuide, adminDeleteGuide,
    adminListCosts, adminSaveCost, adminDeleteCost,
} = require('../controllers/settleController');
const { createRateLimiter } = require('../lib/rateLimit');

// Guides and the cost calculator are open to guests (people find them on
// Google before they have an account). Limited per network, like guest browsing.
const publicLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 600,
    message: 'Too many requests from this network. Please try again in a few minutes.',
});
router.get('/guides', publicLimiter, listGuides);
router.get('/guides/:slug', publicLimiter, getGuide);
router.get('/cost', publicLimiter, getCost);

// Everything below needs a login
router.use(authenticationToken);

const checklistLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 120,
    keyFn: (req) => `settle:${req.user && req.user.id}`,
    message: 'Too many changes. Please wait a few minutes.',
});
router.get('/profile', getMySettleProfile);
router.put('/profile', checklistLimiter, saveMySettleProfile);
router.get('/checklist', getMyChecklist);
router.put('/checklist/:slug', checklistLimiter, setChecklistItem);

// Admin: write and update guides and cost numbers
router.use('/admin', requireAdmin);
router.get('/admin/guides', adminListGuides);
router.get('/admin/guides/:id', adminGetGuide);
router.post('/admin/guides', adminSaveGuide);
router.put('/admin/guides/:id', adminSaveGuide);
router.delete('/admin/guides/:id', adminDeleteGuide);
router.get('/admin/costs', adminListCosts);
router.post('/admin/costs', adminSaveCost);
router.put('/admin/costs/:id', adminSaveCost);
router.delete('/admin/costs/:id', adminDeleteCost);

module.exports = router;

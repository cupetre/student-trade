const express = require('express');
const router = express.Router();
const { authenticationToken } = require('../configs/authConfig');
const { editProfile, registerUser, registerLandlord, loginUser, viewProfile, verifyEmail, resendVerification, requestPasswordReset, resetPassword } = require('../controllers/userController');
const { upload1 } = require('../configs/multerConfig');
const { getMyStudentProfile, updateMyStudentProfile, getPublicProfile } = require('../controllers/profileController');
const { createRateLimiter } = require('../lib/rateLimit');
const { normalizeEmail } = require('../lib/emailDomain');

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// Per IP + email, so one person can't hammer an account, while a whole
// campus sharing one IP address doesn't lock everyone out.
const byIpAndEmail = (req) => `${req.ip}|${normalizeEmail(req.body && req.body.email)}`;

const loginLimiter = createRateLimiter({
    windowMs: FIFTEEN_MINUTES, max: 10, keyFn: byIpAndEmail,
    message: 'Too many login attempts. Please wait 15 minutes and try again.',
});
const registerLimiter = createRateLimiter({
    windowMs: ONE_HOUR, max: 20,
    message: 'Too many sign-ups from this network. Please try again later.',
});
const resendLimiter = createRateLimiter({
    windowMs: FIFTEEN_MINUTES, max: 5, keyFn: byIpAndEmail,
    message: 'Too many emails requested. Please wait a few minutes.',
});
const forgotLimiter = createRateLimiter({
    windowMs: FIFTEEN_MINUTES, max: 5, keyFn: byIpAndEmail,
    message: 'Too many emails requested. Please wait a few minutes.',
});
const verifyLimiter = createRateLimiter({
    windowMs: FIFTEEN_MINUTES, max: 30,
    message: 'Too many attempts. Please wait a few minutes.',
});

router.post('/register', registerLimiter, registerUser);
router.post('/register-landlord', registerLimiter, registerLandlord);
router.post('/login', loginLimiter, loginUser);
router.post('/verify-email', verifyLimiter, verifyEmail);
router.post('/resend-verification', resendLimiter, resendVerification);
router.post('/forgot-password', forgotLimiter, requestPasswordReset);
router.post('/reset-password', verifyLimiter, resetPassword);
router.put('/edit_profile', authenticationToken, upload1.single('profilePicture'), editProfile);
router.get('/fetch_profile', authenticationToken, viewProfile);
router.get('/me/student-profile', authenticationToken, getMyStudentProfile);
router.put('/me/student-profile', authenticationToken, updateMyStudentProfile);
router.get('/:id/public', authenticationToken, getPublicProfile);

module.exports = router;
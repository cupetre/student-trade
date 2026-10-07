const express = require('express');
const router = express.Router();
const { authenticationToken } = require('../configs/authConfig');
const { editProfile, registerUser, loginUser, viewProfile, verifyEmail, resendVerification } = require('../controllers/userController');
const { upload1 } = require('../configs/multerConfig');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.put('/edit_profile', authenticationToken, upload1.single('profilePicture'), editProfile);
router.get('/fetch_profile', authenticationToken, viewProfile);

module.exports = router;
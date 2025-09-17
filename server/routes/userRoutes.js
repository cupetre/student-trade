const express = require('express');
const router = express.Router();
const { authenticationToken } = require('../configs/authConfig');
const { editProfile, registerUser } = require('../controllers/userController');
const { upload1 } = require('../configs/multerConfig');

router.post('/register', registerUser);
router.put('/profile', authenticationToken, upload1.single('profilePicture'), editProfile);

module.exports = router;
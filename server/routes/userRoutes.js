const express = require('express');
const router = express.Router();
const { authenticationToken } = require('../configs/authConfig');
const { editProfile } = require('../controllers/userController');
const { upload1 } = require('../configs/multerConfig');

router.put('/profile', authenticationToken, upload1.single('profilePicture'), editProfile);

module.exports = router;
const express = require('express');
const router = express.Router();
const { getChatMessages } = require('../controllers/messageController.js');
const { authenticationToken } = require('../configs/authConfig');

router.get('/messages/:chat_id', authenticationToken, getChatMessages);

module.exports = router;
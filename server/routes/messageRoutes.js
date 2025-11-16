const express = require('express');
const router = express.Router();
const { getChatMessages, createChat, getHistory } = require('../controllers/messageController.js');
const { authenticationToken } = require('../configs/authConfig.js');

router.get('/messages/:chat_id', authenticationToken, getChatMessages);
router.post('/create_chat', authenticationToken, createChat);
router.get('/get_history', authenticationToken, getHistory);

module.exports = router;
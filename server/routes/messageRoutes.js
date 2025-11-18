const express = require('express');
const router = express.Router();
const { createChat, getHistory, sendMessage, receiveMessages } = require('../controllers/messageController.js');
const { authenticationToken } = require('../configs/authConfig.js');

router.post('/create_chat', authenticationToken, createChat);
router.get('/get_history', authenticationToken, getHistory);
router.post('/send_messages', authenticationToken, sendMessage);
router.get('/receive_messages/:chat_id', authenticationToken, receiveMessages);

module.exports = router;
const { getMessages, openChat, chatHistory } = require('../models/messageModels.js');

async function getChatMessages(req, res) {
    const { chat_id } = req.params;
    const messages = await getMessages(chat_id);
    res.json(messages);
};

async function createChat(req, res) {
    const pool = req.pool;

    try {
        const { user2_id } = req.body;
        const user1_id = req.user.id;

        const chat_id = await openChat(pool, { user1_id, user2_id });

        res.json({ chat_id });
    } catch (err) {
        console.error("Error creating chat:", err);
        res.status(500).json({ error: "failed to create chat" });
    }
};

async function getHistory(req, res) {
    const pool = req.pool;
    const user1_id = req.user.id;

    try {
        const chats = await chatHistory(pool, { user1_id });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: "Failed to load chat history" });
    }
}

module.exports = {
    getChatMessages,
    createChat,
    getHistory
}


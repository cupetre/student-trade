const { getMessages, openChat, chatHistory, createMessage, readMessage } = require('../models/messageModels.js');

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

async function sendMessage(req,res) {
    const pool = req.pool;
    const sender_id = req.user.id;
    const { chat_id, receiver_id , content } = req.body;

    if (!chat_id || !receiver_id || !content) {
        return res.status(400).json({ error: "Missing fields" });
    }

    console.log(chat_id);
    console.log(sender_id);
    console.log(receiver_id);

    try {
        const message = await createMessage(pool, { chat_id, sender_id, receiver_id, content })
        
        console.log(message);
        res.json(message);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB error creating message" });
    }
};

async function receiveMessages(req, res) {
    const pool = req.pool;
    const chat_id = req.params.chat_id;

    try { 
        const result = await readMessage(pool, {chat_id});

        res.json({ messages: result.rows});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: " error in DB " });
    }
};

module.exports = {
    getChatMessages,
    createChat,
    getHistory,
    sendMessage,
    receiveMessages
}


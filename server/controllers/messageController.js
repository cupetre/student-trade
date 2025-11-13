const { getMessages } = require('../models/messageModels.js');

async function getChatMessages(req, res) {
    const { chat_id } = req.params;
    const messages = await getMessages(chat_id);
    res.json(messages);
};

module.exports = {
    getChatMessages
}


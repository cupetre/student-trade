const { openChat, chatHistory, readMessage } = require('../models/messageModels.js');
const { ChatError, getChatForMember, sendChatMessage, userRoom } = require('../services/messageService');
const { toId } = require('../lib/parse');
const { toChatSummary } = require('../lib/dto');
const { findUserWithProfile, haveChatted } = require('../models/profileModels.js');
const { missingProfileFields } = require('../lib/profileValidation');

async function createChat(req, res) {
    const user1_id = req.user.id;
    const user2_id = toId(req.body.user2_id);

    if (!user2_id) return res.status(400).json({ error: 'Invalid user' });
    if (user2_id === user1_id) return res.status(400).json({ error: "You can't start a chat with yourself" });

    try {
        // Students write to landlords only with a complete profile (same rule as
        // the housing "Message" button, so it can't be skipped through this endpoint)
        const [me, other] = await Promise.all([findUserWithProfile(user1_id), findUserWithProfile(user2_id)]);
        if (!other) return res.status(404).json({ error: 'User not found' });
        if (me && me.role === 'student' && other.role === 'landlord' && !(await haveChatted(user1_id, user2_id))) {
            const missing = missingProfileFields(me, me.studentProfile);
            if (missing.length) {
                return res.status(403).json({
                    error: 'Complete your profile first, so the owner knows who is contacting them.',
                    code: 'PROFILE_INCOMPLETE',
                    missing,
                });
            }
        }

        const chat_id = await openChat({ user1_id, user2_id });
        res.json({ chat_id });
    } catch (err) {
        // P2003 = foreign key failed: the other user doesn't exist
        if (err.code === 'P2003') return res.status(404).json({ error: 'User not found' });
        req.log.error({ err }, 'failed to create chat');
        res.status(500).json({ error: 'Failed to create chat' });
    }
};

async function getHistory(req, res) {
    const myId = req.user.id;

    try {
        const chats = await chatHistory({ user1_id: myId });
        // Newest conversation first: by the last message, or when it was opened
        const list = chats.map(chat => toChatSummary(chat, myId))
            .sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));
        res.json(list);
    } catch (err) {
        req.log.error({ err }, 'failed to load chat history');
        res.status(500).json({ error: 'Failed to load chat history' });
    }
}

async function sendMessage(req, res) {
    try {
        const { message, receiverId } = await sendChatMessage({
            chatId: req.body.chat_id,
            senderId: req.user.id,
            content: req.body.content,
        });

        // Deliver live to the other person if they're online
        if (req.io) req.io.to(userRoom(receiverId)).emit('new_message', message);

        res.json(message);
    } catch (err) {
        if (err instanceof ChatError) return res.status(err.status).json({ error: err.message });
        req.log.error({ err }, 'failed to send message');
        res.status(500).json({ error: 'Failed to send message' });
    }
};

async function receiveMessages(req, res) {
    const chatId = toId(req.params.chat_id);
    if (!chatId) return res.status(400).json({ error: 'Invalid chat' });

    try {
        // Only the two people in a chat may read it
        const chat = await getChatForMember(chatId, req.user.id);
        if (!chat) return res.status(404).json({ error: 'Chat not found' });

        const messages = await readMessage({ chat_id: chatId });
        res.json(messages);
    } catch (err) {
        req.log.error({ err, chatId }, 'failed to load messages');
        res.status(500).json({ error: 'Failed to load messages' });
    }
};

module.exports = {
    createChat,
    getHistory,
    sendMessage,
    receiveMessages,
};

// Chat rules shared by the REST endpoints and the live socket connection,
// so both paths enforce exactly the same checks.

const { findChatById, createMessage } = require('../models/messageModels.js');
const { toId } = require('../lib/parse');

const MAX_MESSAGE_LENGTH = 2000;

class ChatError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// Every connected user joins a private socket room with this name, so a
// message reaches all of that user's open tabs.
function userRoom(userId) {
    return `user:${userId}`;
}

// Returns the chat only if userId is one of its two members.
// Anyone else gets null, so they can't read or write other people's chats.
async function getChatForMember(chatId, userId) {
    const chat = await findChatById(chatId);
    if (!chat) return null;
    if (chat.user1_id !== userId && chat.user2_id !== userId) return null;
    return chat;
}

// The receiver is worked out from the chat itself, never taken from the
// client, so nobody can send a message "into" a chat they aren't part of.
async function sendChatMessage({ chatId, senderId, content }) {
    const id = toId(chatId);
    if (!id) throw new ChatError(400, 'Invalid chat');

    const text = typeof content === 'string' ? content.trim() : '';
    if (!text) throw new ChatError(400, 'Message is empty');
    if (text.length > MAX_MESSAGE_LENGTH) {
        throw new ChatError(400, `Messages can be at most ${MAX_MESSAGE_LENGTH} characters`);
    }

    const chat = await getChatForMember(id, senderId);
    if (!chat) throw new ChatError(404, 'Chat not found');

    const receiverId = chat.user1_id === senderId ? chat.user2_id : chat.user1_id;
    const message = await createMessage({ chat_id: id, sender_id: senderId, receiver_id: receiverId, content: text });

    return { message, receiverId };
}

module.exports = { ChatError, userRoom, getChatForMember, sendChatMessage, MAX_MESSAGE_LENGTH };

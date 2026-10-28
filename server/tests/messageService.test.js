// Run with: npm test   (uses Node's built-in test runner, no extra packages)
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Replace the database-backed models with an in-memory fake, so these
// tests check the chat rules without needing Postgres running.
const chats = new Map([[10, { id: 10, user1_id: 1, user2_id: 2 }]]);
const saved = [];
const modelsPath = path.resolve(__dirname, '../models/messageModels.js');
require.cache[modelsPath] = {
    id: modelsPath, filename: modelsPath, loaded: true,
    exports: {
        findChatById: async (id) => chats.get(id) || null,
        createMessage: async (data) => { const m = { id: saved.length + 1, ...data }; saved.push(m); return m; },
    },
};

const { sendChatMessage, getChatForMember, ChatError, MAX_MESSAGE_LENGTH } = require('../services/messageService');

test('members can send, and the receiver is the other member', async () => {
    const { message, receiverId } = await sendChatMessage({ chatId: '10', senderId: 1, content: '  hi!  ' });
    assert.equal(receiverId, 2);
    assert.equal(message.content, 'hi!');
    assert.equal(message.chat_id, 10);

    const reply = await sendChatMessage({ chatId: 10, senderId: 2, content: 'hello' });
    assert.equal(reply.receiverId, 1);
});

test('outsiders cannot send into or read a chat', async () => {
    await assert.rejects(sendChatMessage({ chatId: 10, senderId: 3, content: 'sneaky' }), (err) => err instanceof ChatError && err.status === 404);
    assert.equal(await getChatForMember(10, 3), null);
    assert.ok(await getChatForMember(10, 2));
});

test('rejects empty, too long, and invalid input', async () => {
    await assert.rejects(sendChatMessage({ chatId: 10, senderId: 1, content: '   ' }), { status: 400 });
    await assert.rejects(sendChatMessage({ chatId: 10, senderId: 1, content: 'x'.repeat(MAX_MESSAGE_LENGTH + 1) }), { status: 400 });
    await assert.rejects(sendChatMessage({ chatId: 'abc', senderId: 1, content: 'hi' }), { status: 400 });
    await assert.rejects(sendChatMessage({ chatId: 99, senderId: 1, content: 'hi' }), { status: 404 });
});

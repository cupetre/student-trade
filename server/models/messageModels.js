const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

async function openChat({ user1_id, user2_id }) {
    const existing = await prisma.chat.findFirst({
        where: {
            OR: [ 
                { user1_id , user2_id },
                { user1_id : user2_id , user2_id: user1_id }
            ],
        },
    });

    if ( existing ) 
        return existing.id;

    const created = await prisma.chat.create({ 
        data: { user1_id , user2_id }
    });

    return created.id;
}

async function chatHistory({ user1_id }) {
    return prisma.chat.findMany({ 
        where: {
            OR: [ 
                { user1_id },
                { user2_id: user1_id }
            ],
        },
        include: {
            user1: { select: { id:true , fullname: true, profile_picture: true }},
            user2: { select: { id:true , fullname: true, profile_picture: true }},
            // the newest message, for the preview line and the order of the list
            messages: { orderBy: { sent_at: 'desc' }, take: 1, select: { content: true, sent_at: true, sender_id: true } },
            // what the chat is about (newest first), for the side panel of the chat page
            topics: {
                orderBy: { created_at: 'desc' },
                take: 5,
                include: {
                    market_item: { select: { id: true, title: true, price: true, photo: true, city: true, owner_id: true } },
                    housing_listing: {
                        select: {
                            id: true, title: true, rent_per_person: true, city: true, status: true, owner_id: true,
                            photos: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
                        },
                    },
                },
            },
        },
        orderBy: { date: 'desc'}
    });
};

// Remembers that this chat is about an item / listing (once per chat and thing)
async function addChatTopic({ chat_id, market_item_id = null, housing_listing_id = null, started_by }) {
    const where = market_item_id ? { chat_id, market_item_id } : { chat_id, housing_listing_id };
    const existing = await prisma.chatTopic.findFirst({ where, select: { id: true } });
    if (existing) return existing;
    try {
        return await prisma.chatTopic.create({ data: { chat_id, market_item_id, housing_listing_id, started_by } });
    } catch (err) {
        if (err.code === 'P2002') return null; // added at the same moment by another request
        throw err;
    }
}

async function findChatById(id) {
    return prisma.chat.findUnique({ where: { id } });
}

async function createMessage({ chat_id, sender_id, receiver_id, content }) {
    return prisma.message.create({
        data: { chat_id, sender_id, receiver_id , content }
    });
};


async function readMessage({ chat_id }) { 
    return prisma.message.findMany({
        where: { chat_id },
        orderBy: { sent_at: 'asc'}
    });
};

module.exports = {
    findChatById,
    openChat,
    chatHistory,
    createMessage,
    readMessage,
    addChatTopic,
};
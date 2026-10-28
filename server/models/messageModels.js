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
        },
        orderBy: { date: 'desc'}
    });
};

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
    readMessage
};
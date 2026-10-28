const prisma = require('../lib/prisma');

async function findUserWithProfile(id) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true, fullname: true, bio: true, profile_picture: true, created_at: true,
            role: true, landlord_status: true, studentProfile: true,
        },
    });
}

async function upsertStudentProfile(userId, data) {
    return prisma.studentProfile.upsert({
        where: { user_id: userId },
        create: { user_id: userId, ...data },
        update: data,
    });
}

// The live housing listings someone has posted (shown on their public profile)
async function listActiveHousingByOwner(ownerId) {
    return prisma.housingListing.findMany({
        where: { owner_id: ownerId, status: 'active' },
        orderBy: { created_at: 'desc' },
        include: { photos: { orderBy: { position: 'asc' }, take: 1 } },
    });
}

// Have these two people ever talked? (either one may have started the chat)
async function haveChatted(a, b) {
    const chat = await prisma.chat.findFirst({
        where: { OR: [{ user1_id: a, user2_id: b }, { user1_id: b, user2_id: a }] },
        select: { id: true },
    });
    return Boolean(chat);
}

// Is one of them the other's landlord (any tenancy that wasn't declined)?
async function haveTenancy(a, b) {
    const tenancy = await prisma.tenancy.findFirst({
        where: {
            status: { in: ['pending', 'confirmed', 'ended'] },
            OR: [{ landlord_id: a, student_id: b }, { landlord_id: b, student_id: a }],
        },
        select: { id: true },
    });
    return Boolean(tenancy);
}

module.exports = { findUserWithProfile, upsertStudentProfile, listActiveHousingByOwner, haveChatted, haveTenancy };

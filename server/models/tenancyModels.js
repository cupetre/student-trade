const prisma = require('../lib/prisma');

const PERSON = { select: { id: true, fullname: true, profile_picture: true, role: true, landlord_status: true } };

async function findTenancy(id) {
    return prisma.tenancy.findUnique({ where: { id } });
}

async function findTenancyFor(listingId, studentId) {
    return prisma.tenancy.findUnique({ where: { listing_id_student_id: { listing_id: listingId, student_id: studentId } } });
}

async function createTenancy(data) {
    return prisma.tenancy.create({ data });
}

async function updateTenancy(id, data) {
    return prisma.tenancy.update({ where: { id }, data });
}

async function deleteTenancy(id) {
    return prisma.tenancy.delete({ where: { id } });
}

// The landlord's view of one listing: who lives / lived there, and the
// landlord's own review of each tenant
async function listTenantsOfListing(listingId, landlordId) {
    return prisma.tenancy.findMany({
        where: { listing_id: listingId },
        orderBy: { created_at: 'desc' },
        include: {
            student: PERSON,
            reviews: { where: { reviewer_id: landlordId } },
        },
    });
}

// The student's view: places they were added to, and their own review of each
async function listStaysOfStudent(studentId) {
    return prisma.tenancy.findMany({
        where: { student_id: studentId, status: { in: ['pending', 'confirmed', 'ended'] } },
        orderBy: { created_at: 'desc' },
        include: {
            landlord: PERSON,
            listing: {
                select: { id: true, title: true, city: true, status: true, photos: { orderBy: { position: 'asc' }, take: 1 } },
            },
            reviews: { where: { reviewer_id: studentId } },
        },
    });
}

// People the landlord can add as tenants: everyone they've chatted with
async function listChatPartners(userId) {
    const chats = await prisma.chat.findMany({
        where: { OR: [{ user1_id: userId }, { user2_id: userId }] },
        include: { user1: PERSON, user2: PERSON },
        orderBy: { date: 'desc' },
    });
    const seen = new Set();
    const people = [];
    for (const chat of chats) {
        const other = chat.user1_id === userId ? chat.user2 : chat.user1;
        if (other && !seen.has(other.id)) {
            seen.add(other.id);
            people.push(other);
        }
    }
    return people;
}

module.exports = {
    findTenancy,
    findTenancyFor,
    createTenancy,
    updateTenancy,
    deleteTenancy,
    listTenantsOfListing,
    listStaysOfStudent,
    listChatPartners,
};

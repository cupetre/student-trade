const prisma = require('../lib/prisma');

const OWNER_PUBLIC = { select: { id: true, fullname: true, profile_picture: true } };

async function updateListing({ id, owner_id, data }) {
    return prisma.listingItem.updateMany({ where: { id, owner_id }, data });
}

async function addListing(data) {
    return prisma.listingItem.create({ data });
}

// Browse: everyone else's items, filtered, one page at a time
async function searchListings({ where, orderBy, skip, take }) {
    const [items, total] = await Promise.all([
        prisma.listingItem.findMany({ where, orderBy, skip, take, include: { owner: OWNER_PUBLIC } }),
        prisma.listingItem.count({ where }),
    ]);
    return { items, total };
}

async function fetchMyListings({ owner_id }) {
    return prisma.listingItem.findMany({
        where: { owner_id },
        orderBy: { date: 'desc' },
        include: { owner: OWNER_PUBLIC },
    });
}

// One item with what the item window shows about the seller
async function findListing(id) {
    return prisma.listingItem.findUnique({
        where: { id },
        include: {
            owner: {
                select: {
                    id: true, fullname: true, profile_picture: true, role: true,
                    studentProfile: { select: { university: true, faculty: true, birth_date: true } },
                },
            },
        },
    });
}

// Only what's needed to check a pin change and to write the first message
async function findListingBasics(id) {
    return prisma.listingItem.findUnique({
        where: { id },
        select: { id: true, owner_id: true, title: true, latitude: true, longitude: true, public_latitude: true, public_longitude: true },
    });
}

async function removeListing({ id, owner_id }) {
    return prisma.listingItem.deleteMany({ where: { id, owner_id } });
}

module.exports = {
    updateListing,
    addListing,
    searchListings,
    fetchMyListings,
    findListing,
    findListingBasics,
    removeListing,
};

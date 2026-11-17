const prisma = require('../lib/prisma');

const OWNER_PUBLIC = { select: { id: true, fullname: true, profile_picture: true } };
const PHOTOS = { orderBy: [{ position: 'asc' }, { id: 'asc' }], select: { id: true, url: true, position: true } };

// Only this viewer's "liked" row, to know whether the heart is filled.
// Guests (no viewer) get no row at all.
function likedBy(viewerId) {
    return { where: { user_id: viewerId ?? -1 }, select: { user_id: true } };
}

async function updateListing({ id, owner_id, data }) {
    return prisma.listingItem.updateMany({ where: { id, owner_id }, data });
}

// A new item with its photos (the first one is also the cover in `photo`)
async function addListing(data, photoUrls = []) {
    return prisma.listingItem.create({
        data: {
            ...data,
            photo: photoUrls[0] || null,
            photos: { create: photoUrls.map((url, position) => ({ url, position })) },
        },
        include: { photos: PHOTOS },
    });
}

// Edits an item: removes the chosen photos, adds the new ones at the end and
// keeps the cover (`photo`) equal to the first photo left. One transaction.
async function updateItemWithPhotos({ id, owner_id, data, removePhotoIds = [], newPhotoUrls = [] }) {
    return prisma.$transaction(async (tx) => {
        const item = await tx.listingItem.findFirst({ where: { id, owner_id }, select: { id: true } });
        if (!item) return { count: 0 };
        if (removePhotoIds.length) await tx.itemPhoto.deleteMany({ where: { item_id: id, id: { in: removePhotoIds } } });
        const left = await tx.itemPhoto.findMany({ where: { item_id: id }, ...PHOTOS });
        const start = left.reduce((max, p) => Math.max(max, p.position), -1) + 1;
        if (newPhotoUrls.length) {
            await tx.itemPhoto.createMany({ data: newPhotoUrls.map((url, i) => ({ item_id: id, url, position: start + i })) });
        }
        const cover = left[0]?.url || newPhotoUrls[0] || null;
        await tx.listingItem.update({ where: { id }, data: { ...data, photo: cover } });
        return { count: 1 };
    });
}

// Items posted before photos had their own table have only `photo`: give it a row,
// so it can be kept or removed like the others
async function movePhotoToTable(item) {
    if (!item || !item.photo) return null;
    const existing = await prisma.itemPhoto.count({ where: { item_id: item.id } });
    if (existing) return null;
    return prisma.itemPhoto.create({ data: { item_id: item.id, url: item.photo, position: 0 } });
}

// Browse: everyone else's items, filtered, one page at a time
async function searchListings({ where, orderBy, skip, take, viewerId }) {
    const [items, total] = await Promise.all([
        prisma.listingItem.findMany({ where, orderBy, skip, take, include: { owner: OWNER_PUBLIC, savedBy: likedBy(viewerId) } }),
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
async function findListing(id, viewerId) {
    return prisma.listingItem.findUnique({
        where: { id },
        include: {
            savedBy: likedBy(viewerId),
            photos: PHOTOS,
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
        select: {
            id: true, owner_id: true, title: true, status: true, photo: true,
            latitude: true, longitude: true, public_latitude: true, public_longitude: true,
            photos: PHOTOS,
        },
    });
}

async function removeListing({ id, owner_id }) {
    return prisma.listingItem.deleteMany({ where: { id, owner_id } });
}

// Liked items: liking twice is fine, un-liking something that isn't liked too
async function saveItem(user_id, item_id) {
    return prisma.savedItem.upsert({
        where: { user_id_item_id: { user_id, item_id } },
        create: { user_id, item_id },
        update: {},
    });
}

async function unsaveItem(user_id, item_id) {
    return prisma.savedItem.deleteMany({ where: { user_id, item_id } });
}

// What I liked, newest like first (sold ones stay in the list, marked as sold)
async function listSavedItems(user_id) {
    const rows = await prisma.savedItem.findMany({
        where: { user_id },
        orderBy: { created_at: 'desc' },
        include: { item: { include: { owner: OWNER_PUBLIC, savedBy: likedBy(user_id) } } },
    });
    return rows.map(row => row.item);
}

module.exports = {
    updateListing,
    addListing,
    searchListings,
    fetchMyListings,
    findListing,
    findListingBasics,
    removeListing,
    saveItem,
    unsaveItem,
    listSavedItems,
    updateItemWithPhotos,
    movePhotoToTable,
};

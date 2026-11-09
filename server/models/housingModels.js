const prisma = require('../lib/prisma');

const OWNER_PUBLIC = { select: { id: true, fullname: true, profile_picture: true, role: true, landlord_status: true } };

function withViewer(viewerId) {
    return {
        owner: OWNER_PUBLIC,
        photos: { orderBy: { position: 'asc' } },
        // Only this viewer's "saved" row, to know whether the heart is filled
        savedBy: { where: { user_id: viewerId }, select: { user_id: true } },
    };
}

async function findUserForHousing(id) {
    return prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, landlord_status: true, email_verified: true },
    });
}

async function createListing(data, photoUrls) {
    return prisma.housingListing.create({
        data: {
            ...data,
            photos: { create: photoUrls.map((url, position) => ({ url, position })) },
        },
        include: { photos: { orderBy: { position: 'asc' } } },
    });
}

async function findListing(id, viewerId) {
    return prisma.housingListing.findUnique({ where: { id }, include: withViewer(viewerId) });
}

async function findListingOwnerAndStatus(id) {
    return prisma.housingListing.findUnique({
        where: { id },
        select: {
            id: true, owner_id: true, status: true, title: true, photos: { select: { id: true, position: true } },
            listing_type: true, // for the wording of the first message
            // to tell whether the address or the pin moved
            street: true, city: true, postal_code: true,
            latitude: true, longitude: true, public_latitude: true, public_longitude: true,
        },
    });
}

async function searchListings({ where, orderBy, skip, take, viewerId }) {
    const [items, total] = await prisma.$transaction([
        prisma.housingListing.findMany({ where, orderBy, skip, take, include: withViewer(viewerId) }),
        prisma.housingListing.count({ where }),
    ]);
    return { items, total };
}

async function listOwnListings(ownerId) {
    return prisma.housingListing.findMany({
        where: { owner_id: ownerId },
        orderBy: { created_at: 'desc' },
        include: withViewer(ownerId),
    });
}

async function listSavedListings(userId) {
    const rows = await prisma.savedListing.findMany({
        where: { user_id: userId, listing: { status: 'active' } },
        orderBy: { created_at: 'desc' },
        include: { listing: { include: withViewer(userId) } },
    });
    return rows.map(r => r.listing);
}

// Edits the listing, removes chosen photos and appends new ones in one transaction
async function updateListing(id, data, { removePhotoIds = [], newPhotoUrls = [], startPosition = 0 }) {
    return prisma.$transaction(async (tx) => {
        if (removePhotoIds.length) {
            await tx.housingPhoto.deleteMany({ where: { listing_id: id, id: { in: removePhotoIds } } });
        }
        if (newPhotoUrls.length) {
            await tx.housingPhoto.createMany({
                data: newPhotoUrls.map((url, i) => ({ listing_id: id, url, position: startPosition + i })),
            });
        }
        return tx.housingListing.update({ where: { id }, data });
    });
}

async function setListingStatus(id, status, extra = {}) {
    return prisma.housingListing.update({ where: { id }, data: { status, ...extra } });
}

async function deleteListing(id) {
    return prisma.housingListing.delete({ where: { id } });
}

async function saveListing(userId, listingId) {
    return prisma.savedListing.upsert({
        where: { user_id_listing_id: { user_id: userId, listing_id: listingId } },
        create: { user_id: userId, listing_id: listingId },
        update: {},
    });
}

async function unsaveListing(userId, listingId) {
    return prisma.savedListing.deleteMany({ where: { user_id: userId, listing_id: listingId } });
}

module.exports = {
    findUserForHousing,
    createListing,
    findListing,
    findListingOwnerAndStatus,
    searchListings,
    listOwnListings,
    listSavedListings,
    updateListing,
    setListingStatus,
    deleteListing,
    saveListing,
    unsaveListing,
};

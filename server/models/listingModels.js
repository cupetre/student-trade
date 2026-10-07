const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

async function updateListing({ id, owner_id, title, description, price, photo }) {
    return prisma.listingItem.updateMany({
        where: { id, owner_id },
        data: { title, description, price, photo},
    });
};

async function addListing({ owner_id, title, description, price, photo }) {
    return prisma.listingItem.create({
        data: { owner_id, title, description, price, photo }
    });
};

async function viewListings({ owner_id }) {
    return prisma.listingItem.findMany({
        where: { owner_id: { not: owner_id } },
        include: { owner: { select: { id: true, fullname: true, profile_picture: true } } }
    });
};

async function fetchMyListings({ owner_id, title, description, price, photo }) {
    return prisma.listingItem.findMany({ 
        where: { owner_id },
        include: { owner: { select: { id: true, profile_picture: true }}}
    });
};

async function removeListing({ id, owner_id }) {
    return prisma.listingItem.deleteMany({
        where: { id , owner_id }
    });
};

module.exports = { 
    updateListing,
    addListing,
    viewListings,
    fetchMyListings,
    removeListing
 };
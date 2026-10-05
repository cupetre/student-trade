const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

async function addReport({ reporter_id, reported_id, item_id, description }) {
    return prisma.report.create({
        data: {
            reporter_id,
            reported_id,
            item_id,
            description
        },
    });
};

async function addReview({ user1_id, user2_id, rating, description }) {
    return prisma.review.create({
        data: {
            reviewer_id: user1_id,
            reviewee_id: user2_id,
            rating,
            description,
        },
    });
};

async function fetchReviews({ owner_id }) {
    return prisma.review.findMany({ 
        where: {
            reviewee_id: owner_id
        }
    });
};

module.exports = {
    addReport,
    addReview,
    fetchReviews
};
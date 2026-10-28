const prisma = require('../lib/prisma');

// Reports. Reviews moved to reviewModels.js.
async function addReport({ reporter_id, reported_id, item_id, description }) {
    return prisma.report.create({
        data: { reporter_id, reported_id, item_id, description },
    });
}

module.exports = { addReport };

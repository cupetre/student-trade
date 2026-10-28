const prisma = require('../lib/prisma');

async function createInterestLead({ type, name, email, phone, city, message, language }) {
    return prisma.interestLead.create({
        data: { type, name, email, phone, city, message, language },
    });
}

module.exports = { createInterestLead };

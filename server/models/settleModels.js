// Settle In database access (tables: SettleProfile, Guide, ChecklistItem, CostItem)
const prisma = require('../lib/prisma');
const { RENT_GROUPS } = require('../lib/settleRules');

const findUserRole = (id) => prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });

const findSettleProfile = (user_id) => prisma.settleProfile.findUnique({ where: { user_id } });

const saveSettleProfile = (user_id, data) => prisma.settleProfile.upsert({
    where: { user_id },
    create: { user_id, ...data },
    update: data,
});

const setProfileDate = (user_id, field, date) => prisma.settleProfile.update({
    where: { user_id },
    data: { [field]: date },
});

// Everything the checklist needs from a guide, without the full text
const CHECKLIST_FIELDS = {
    id: true, slug: true, topic: true, phase: true, position: true, city: true,
    applies_to: true, depends_on: true, deadline_anchor: true, deadline_days: true,
    asks_date: true, status: true, content: true, last_checked: true,
};

const listLiveGuides = () => prisma.guide.findMany({
    where: { status: 'live' },
    select: CHECKLIST_FIELDS,
    orderBy: [{ phase: 'asc' }, { position: 'asc' }],
});

const listAllGuides = () => prisma.guide.findMany({ orderBy: [{ phase: 'asc' }, { position: 'asc' }, { slug: 'asc' }] });

const findGuideBySlug = (slug) => prisma.guide.findUnique({ where: { slug } });
const findGuideById = (id) => prisma.guide.findUnique({ where: { id } });
const createGuide = (data) => prisma.guide.create({ data });
const updateGuide = (id, data) => prisma.guide.update({ where: { id }, data });
const deleteGuide = (id) => prisma.guide.delete({ where: { id } });

const listChecklistItems = (user_id) => prisma.checklistItem.findMany({ where: { user_id } });

const saveChecklistItem = (user_id, guide_id, status) => prisma.checklistItem.upsert({
    where: { user_id_guide_id: { user_id, guide_id } },
    create: { user_id, guide_id, status, done_at: new Date() },
    update: { status, done_at: new Date() },
});

const clearChecklistItem = (user_id, guide_id) => prisma.checklistItem.deleteMany({ where: { user_id, guide_id } });

// Costs for one city: the city's own numbers, plus numbers that apply everywhere
const listCostItems = (city) => prisma.costItem.findMany({
    where: city ? { OR: [{ city: null }, { city: { equals: city, mode: 'insensitive' } }] } : { city: null },
    orderBy: [{ category: 'asc' }, { option: 'asc' }],
});
const listAllCostItems = () => prisma.costItem.findMany({ orderBy: [{ city: 'asc' }, { category: 'asc' }, { option: 'asc' }] });
const createCostItem = (data) => prisma.costItem.create({ data });
const updateCostItem = (id, data) => prisma.costItem.update({ where: { id }, data });
const deleteCostItem = (id) => prisma.costItem.delete({ where: { id } });

// Live housing in one city, only the fields the rent estimate needs
const listRentsInCity = (city) => prisma.housingListing.findMany({
    where: {
        status: 'active',
        city: { equals: city, mode: 'insensitive' },
        property_type: { in: Object.values(RENT_GROUPS).flat() },
    },
    select: { property_type: true, rent_per_person: true, utilities_included: true, utilities_estimate: true },
});

// Cities with live listings or their own cost numbers, for the calculator's city picker
async function listCostCities() {
    const [housing, costs] = await Promise.all([
        prisma.housingListing.findMany({ where: { status: 'active' }, distinct: ['city'], select: { city: true } }),
        prisma.costItem.findMany({ where: { city: { not: null } }, distinct: ['city'], select: { city: true } }),
    ]);
    const seen = new Map();
    for (const { city } of [...housing, ...costs]) {
        if (city && !seen.has(city.toLowerCase())) seen.set(city.toLowerCase(), city);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

module.exports = {
    findUserRole, findSettleProfile, saveSettleProfile, setProfileDate,
    listLiveGuides, listAllGuides, findGuideBySlug, findGuideById, createGuide, updateGuide, deleteGuide,
    listChecklistItems, saveChecklistItem, clearChecklistItem,
    listCostItems, listAllCostItems, createCostItem, updateCostItem, deleteCostItem,
    listRentsInCity, listCostCities,
};

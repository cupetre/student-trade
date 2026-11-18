// Settle In: the student's checklist, the guides, the cost of living calculator,
// and the admin editor for guides and cost numbers.
const models = require('../models/settleModels');
const {
    SettleInputError, validateSettleProfile, validateGuideInput, validateCostItem,
    buildChecklist, guideSummary, rentFromListings, isoDay,
    PERMIT_MONTHLY_MINIMUM,
} = require('../lib/settleRules');
const { toId } = require('../lib/parse');

const ITEM_STATUSES = ['done', 'skipped', 'todo'];

function inputError(res, err) {
    if (err instanceof SettleInputError) {
        res.status(400).json({ error: err.message, field: err.field });
        return true;
    }
    return false;
}

function profileDto(p) {
    if (!p) return null;
    return {
        passport_country: p.passport_country,
        city: p.city,
        university: p.university || '',
        accommodation: p.accommodation,
        arrival_date: isoDay(p.arrival_date),
        permit_date: isoDay(p.permit_date),
    };
}

// Prisma's @db.Date columns take a Date; we keep 'YYYY-MM-DD' everywhere else
const toDate = (day) => (day ? new Date(`${day}T00:00:00Z`) : null);

function guideDto(g, { admin = false } = {}) {
    const dto = {
        ...guideSummary(g),
        content: g.content,
        sources: g.sources || [],
        depends_on: g.depends_on || [],
        asks_date: g.asks_date || null,
        deadline_anchor: g.deadline_anchor || null,
        deadline_days: g.deadline_days,
    };
    if (admin) {
        Object.assign(dto, {
            id: g.id,
            status: g.status,
            position: g.position,
            applies_to: g.applies_to || [],
            updated_at: g.updated_at,
        });
    }
    return dto;
}

function costDto(c) {
    return {
        id: c.id,
        city: c.city || null,
        category: c.category,
        option: c.option,
        low: c.low,
        typical: c.typical,
        high: c.high,
        label: c.label,
        source_title: c.source_title,
        source_url: c.source_url,
        last_checked: isoDay(c.last_checked),
    };
}

// ---------- the student's own setup and checklist ----------

async function getMySettleProfile(req, res) {
    try {
        const profile = await models.findSettleProfile(req.user.id);
        res.json({ profile: profileDto(profile) });
    } catch (err) {
        req.log.error({ err }, 'failed to load settle profile');
        res.status(500).json({ error: 'Could not load your answers' });
    }
}

async function saveMySettleProfile(req, res) {
    let data;
    try { data = validateSettleProfile(req.body); } catch (err) { if (inputError(res, err)) return; throw err; }
    try {
        const saved = await models.saveSettleProfile(req.user.id, {
            ...data,
            arrival_date: toDate(data.arrival_date),
            permit_date: toDate(data.permit_date),
        });
        res.json({ profile: profileDto(saved) });
    } catch (err) {
        req.log.error({ err }, 'failed to save settle profile');
        res.status(500).json({ error: 'Could not save your answers' });
    }
}

async function getMyChecklist(req, res) {
    try {
        const [profile, guides, items] = await Promise.all([
            models.findSettleProfile(req.user.id),
            models.listLiveGuides(),
            models.listChecklistItems(req.user.id),
        ]);
        if (!profile) return res.json({ profile: null, items: [], next: null, progress: { done: 0, total: 0 } });
        res.json({ profile: profileDto(profile), ...buildChecklist(guides, items, profile) });
    } catch (err) {
        req.log.error({ err }, 'failed to build checklist');
        res.status(500).json({ error: 'Could not load your checklist' });
    }
}

// Tick a step (done), say it isn't for you (skipped), or open it again (todo).
// Some steps ask for a date when ticked ("When did you get your permit?"), and
// later deadlines count from it.
async function setChecklistItem(req, res) {
    const { status } = req.body || {};
    if (!ITEM_STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status', field: 'status' });
    try {
        const guide = await models.findGuideBySlug(String(req.params.slug || ''));
        if (!guide || guide.status !== 'live') return res.status(404).json({ error: 'Step not found' });

        if (status === 'todo') {
            await models.clearChecklistItem(req.user.id, guide.id);
            return res.json({ ok: true });
        }

        if (status === 'done' && guide.asks_date) {
            const day = req.body.date;
            if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day) || isoDay(day) !== day) {
                return res.status(400).json({ error: 'Pick the date.', field: 'date' });
            }
            if (day > isoDay(new Date())) return res.status(400).json({ error: 'That date is in the future.', field: 'date' });
            const profile = await models.findSettleProfile(req.user.id);
            if (!profile) return res.status(400).json({ error: 'Answer the first questions first.' });
            await models.setProfileDate(req.user.id, guide.asks_date, toDate(day));
        }

        await models.saveChecklistItem(req.user.id, guide.id, status);
        res.json({ ok: true });
    } catch (err) {
        req.log.error({ err }, 'failed to update checklist item');
        res.status(500).json({ error: 'Could not save that step' });
    }
}

// ---------- guides (open to guests) ----------

async function listGuides(req, res) {
    try {
        const city = typeof req.query.city === 'string' ? req.query.city.trim().toLowerCase() : '';
        const guides = await models.listLiveGuides();
        const shown = city ? guides.filter((g) => !g.city || g.city.toLowerCase() === city) : guides;
        res.json({ guides: shown.map(guideSummary) });
    } catch (err) {
        req.log.error({ err }, 'failed to list guides');
        res.status(500).json({ error: 'Could not load the guides' });
    }
}

async function getGuide(req, res) {
    try {
        const guide = await models.findGuideBySlug(String(req.params.slug || ''));
        if (!guide || guide.status !== 'live') return res.status(404).json({ error: 'Guide not found' });
        res.json({ guide: guideDto(guide) });
    } catch (err) {
        req.log.error({ err }, 'failed to load guide');
        res.status(500).json({ error: 'Could not load the guide' });
    }
}

// ---------- cost of living (open to guests) ----------

async function getCost(req, res) {
    try {
        const cities = await models.listCostCities();
        const asked = typeof req.query.city === 'string' ? req.query.city.trim() : '';
        const city = cities.find((c) => c.toLowerCase() === asked.toLowerCase()) || (asked ? null : cities[0] || null);
        if (asked && !city) return res.json({ cities, city: asked, rents: null, items: [], permit_minimum: PERMIT_MONTHLY_MINIMUM });

        const [listings, items] = await Promise.all([
            city ? models.listRentsInCity(city) : [],
            models.listCostItems(city),
        ]);
        // A city's own number replaces the everywhere-number for the same choice
        const chosen = new Map();
        for (const item of items) {
            const key = `${item.category}:${item.option}`;
            if (!chosen.has(key) || item.city) chosen.set(key, item);
        }
        res.json({
            cities,
            city,
            rents: rentFromListings(listings),
            items: [...chosen.values()].map(costDto),
            permit_minimum: PERMIT_MONTHLY_MINIMUM,
        });
    } catch (err) {
        req.log.error({ err }, 'failed to build cost estimate');
        res.status(500).json({ error: 'Could not load the cost numbers' });
    }
}

// ---------- admin ----------

async function requireAdmin(req, res, next) {
    try {
        const user = await models.findUserRole(req.user.id);
        if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Only admins can do this.' });
        next();
    } catch (err) {
        req.log.error({ err }, 'admin check failed');
        res.status(500).json({ error: 'Something went wrong' });
    }
}

async function adminListGuides(req, res) {
    try {
        const guides = await models.listAllGuides();
        res.json({ guides: guides.map((g) => guideDto(g, { admin: true })) });
    } catch (err) {
        req.log.error({ err }, 'failed to list guides (admin)');
        res.status(500).json({ error: 'Could not load the guides' });
    }
}

async function adminGetGuide(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Guide not found' });
    try {
        const guide = await models.findGuideById(id);
        if (!guide) return res.status(404).json({ error: 'Guide not found' });
        res.json({ guide: guideDto(guide, { admin: true }) });
    } catch (err) {
        req.log.error({ err }, 'failed to load guide (admin)');
        res.status(500).json({ error: 'Could not load the guide' });
    }
}

function guideData(data, userId) {
    return { ...data, last_checked: new Date(`${data.last_checked}T00:00:00Z`), updated_by: userId };
}

async function adminSaveGuide(req, res) {
    let data;
    try { data = validateGuideInput(req.body); } catch (err) { if (inputError(res, err)) return; throw err; }
    const id = req.params.id ? toId(req.params.id) : null;
    if (req.params.id && !id) return res.status(404).json({ error: 'Guide not found' });
    try {
        const saved = id
            ? await models.updateGuide(id, guideData(data, req.user.id))
            : await models.createGuide(guideData(data, req.user.id));
        res.status(id ? 200 : 201).json({ guide: guideDto(saved, { admin: true }) });
    } catch (err) {
        if (err.code === 'P2002') return res.status(400).json({ error: 'Another guide already uses this address.', field: 'slug' });
        if (err.code === 'P2025') return res.status(404).json({ error: 'Guide not found' });
        req.log.error({ err }, 'failed to save guide');
        res.status(500).json({ error: 'Could not save the guide' });
    }
}

async function adminDeleteGuide(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Guide not found' });
    try {
        await models.deleteGuide(id);
        res.json({ ok: true });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Guide not found' });
        req.log.error({ err }, 'failed to delete guide');
        res.status(500).json({ error: 'Could not delete the guide' });
    }
}

async function adminListCosts(req, res) {
    try {
        const items = await models.listAllCostItems();
        res.json({ items: items.map(costDto) });
    } catch (err) {
        req.log.error({ err }, 'failed to list cost items');
        res.status(500).json({ error: 'Could not load the cost numbers' });
    }
}

async function adminSaveCost(req, res) {
    let data;
    try { data = validateCostItem(req.body); } catch (err) { if (inputError(res, err)) return; throw err; }
    const id = req.params.id ? toId(req.params.id) : null;
    if (req.params.id && !id) return res.status(404).json({ error: 'Not found' });
    const row = { ...data, last_checked: new Date(`${data.last_checked}T00:00:00Z`) };
    try {
        const saved = id ? await models.updateCostItem(id, row) : await models.createCostItem(row);
        res.status(id ? 200 : 201).json({ item: costDto(saved) });
    } catch (err) {
        if (err.code === 'P2002') return res.status(400).json({ error: 'This city already has a number for that choice.', field: 'option' });
        if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
        req.log.error({ err }, 'failed to save cost item');
        res.status(500).json({ error: 'Could not save the number' });
    }
}

async function adminDeleteCost(req, res) {
    const id = toId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Not found' });
    try {
        await models.deleteCostItem(id);
        res.json({ ok: true });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
        req.log.error({ err }, 'failed to delete cost item');
        res.status(500).json({ error: 'Could not delete the number' });
    }
}

module.exports = {
    getMySettleProfile, saveMySettleProfile, getMyChecklist, setChecklistItem,
    listGuides, getGuide, getCost,
    requireAdmin, adminListGuides, adminGetGuide, adminSaveGuide, adminDeleteGuide,
    adminListCosts, adminSaveCost, adminDeleteCost,
};

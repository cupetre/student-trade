const { createInterestLead } = require('../models/publicModels.js');
const { normalizeEmail } = require('../lib/emailDomain');
const { toTrimmedString } = require('../lib/parse');

const LEAD_TYPES = ['homeowner', 'agency', 'partner'];
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Landing page form: homeowners, agencies and partners who want to hear from us.
// No account needed, so validation is strict and the route is rate limited.
async function submitInterest(req, res) {
    const type = toTrimmedString(req.body.type, 20);
    const name = toTrimmedString(req.body.name, 255);
    const email = normalizeEmail(req.body.email);
    const phone = toTrimmedString(req.body.phone, 50) || null;
    const city = toTrimmedString(req.body.city, 100) || null;
    const message = toTrimmedString(req.body.message, 2000) || null;
    const language = ['sl', 'en', 'mk'].includes(req.body.language) ? req.body.language : null;

    if (!LEAD_TYPES.includes(type)) return res.status(400).json({ error: 'Please choose who you are', field: 'type' });
    if (name.length < 2) return res.status(400).json({ error: 'Please enter your name', field: 'name' });
    if (!EMAIL_FORMAT.test(email)) return res.status(400).json({ error: 'Please enter a valid email address', field: 'email' });
    if (req.body.consent !== true) return res.status(400).json({ error: 'Please agree to be contacted', field: 'consent' });

    try {
        await createInterestLead({ type, name, email, phone, city, message, language });
        req.log.info({ type, city }, 'interest lead received');
        res.status(201).json({ message: 'Thanks! We will be in touch soon.' });
    } catch (err) {
        req.log.error({ err }, 'failed to save interest lead');
        res.status(500).json({ error: 'Could not send your details right now. Please try again.' });
    }
}

module.exports = { submitInterest };


function normalizeEmail(email) {
    if ( typeof email !== 'string' ) return '';
    return email.trim().toLowerCase();
}

function getAllowedDomains() { 
    return (process.env.ALLOWED_EMAIL_DOMAINS || '')
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(Boolean);
}

function isAllowedEmailDomain(email) {
    const clean = normalizeEmail(email);
    const at = clean.lastIndexOf('@');

    // no "@", nothing before it, or nothing after it -> not a real email
    if (at <= 0 || at === clean.length - 1) return false;

    const domain = clean.slice(at + 1);

    // exact match, or a real subdomain (the dot matters: "fakeupr.si" fails)
    return getAllowedDomains().some(
        allowed => domain === allowed || domain.endsWith('.' + allowed)
    );
}

module.exports = { normalizeEmail, isAllowedEmailDomain }
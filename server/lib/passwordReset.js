const crypto = require('crypto');
const { sendEmail } = require('./email');
const { hashToken } = require('./verification');

// "Forgot password": the emailed link carries a random token that works once,
// for one hour. Like the confirmation links, only its SHA-256 hash is stored.
const RESET_TTL_MINUTES = 60;
const RESET_COOLDOWN_SECONDS = 60;

function createResetToken() {
    const token = crypto.randomBytes(32).toString('hex'); // 64 hex characters
    const now = new Date();
    return {
        token,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + RESET_TTL_MINUTES * 60 * 1000),
        sentAt: now,
    };
}

function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// The email is written in the language the person used on the "forgot password" page
const EMAIL_COPY = {
    sl: {
        brand: 'Sidro',
        subject: 'Ponastavitev gesla za Sidro',
        hi: (name) => `Pozdravljeni, ${name}`,
        body: 'Nekdo (upamo, da vi) je zahteval novo geslo za vaš račun Sidro. Novo geslo nastavite tukaj:',
        button: 'Nastavi novo geslo',
        paste: 'Ali to povezavo prilepite v brskalnik:',
        expires: `Povezava velja ${RESET_TTL_MINUTES} minut in deluje enkrat. Če gesla niste zahtevali vi, to sporočilo prezrite: vaše geslo ostane enako.`,
        fallbackName: 'pozdravljeni',
    },
    en: {
        brand: 'Anchor',
        subject: 'Reset your Anchor password',
        hi: (name) => `Hi ${name}`,
        body: 'Someone (hopefully you) asked for a new password for your Anchor account. Set a new password here:',
        button: 'Set a new password',
        paste: 'Or paste this link into your browser:',
        expires: `The link works once and expires in ${RESET_TTL_MINUTES} minutes. If you didn't ask for this, ignore this email: your password stays the same.`,
        fallbackName: 'there',
    },
};

async function sendPasswordResetEmail({ email, fullname, token, lang = 'en' }) {
    const c = EMAIL_COPY[lang] || EMAIL_COPY.en;
    const appUrl = (process.env.APP_URL || 'http://localhost:3131').replace(/\/+$/, '');
    const link = `${appUrl}/reset-password?token=${token}`;
    const firstName = (fullname || '').trim().split(/\s+/)[0] || c.fallbackName;

    const text = `${c.hi(firstName)},

${c.body}

${link}

${c.expires}

${c.brand}`;

    const html = `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <h2 style="color: #1B2A41; margin: 0 0 16px;">${c.brand}</h2>
  <p>${escapeHtml(c.hi(firstName))},</p>
  <p>${c.body}</p>
  <p style="margin: 28px 0;">
    <a href="${link}" style="background: #3C6E91; color: #ffffff; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">${c.button}</a>
  </p>
  <p style="font-size: 13px; color: #6b7280;">${c.paste}<br><a href="${link}" style="color: #3C6E91; word-break: break-all;">${link}</a></p>
  <p style="font-size: 13px; color: #6b7280;">${c.expires}</p>
</div>`;

    return sendEmail({ to: email, subject: c.subject, html, text });
}

module.exports = { createResetToken, sendPasswordResetEmail, RESET_TTL_MINUTES, RESET_COOLDOWN_SECONDS };

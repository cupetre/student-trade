const crypto = require('crypto');
const { sendEmail } = require('./email');

const TOKEN_TTL_HOURS = 24;
const RESEND_COOLDOWN_SECONDS = 60;

// The emailed link carries a random token. The database only stores its
// SHA-256 hash, so someone reading the database can't confirm accounts.
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function createVerificationToken() {
    const token = crypto.randomBytes(32).toString('hex'); // 64 hex characters
    const now = new Date();
    return {
        token,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
        sentAt: now,
    };
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function sendVerificationEmail({ email, fullname, token, role = 'student' }) {
    const whatToConfirm = role === 'student' ? 'your university email' : 'your email address';
    const appUrl = (process.env.APP_URL || 'http://localhost:3131').replace(/\/+$/, '');
    const link = `${appUrl}/verify-email?token=${token}`;
    const firstName = (fullname || '').trim().split(/\s+/)[0] || 'there';

    const subject = 'Confirm your Anchor account';

    const text =
`Hi ${firstName},

Welcome to Anchor! Confirm ${whatToConfirm} to activate your account:

${link}

This link expires in ${TOKEN_TTL_HOURS} hours. If you didn't create an account, you can ignore this email.

Anchor`;

    const html = `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <h2 style="color: #1B2A41; margin: 0 0 16px;">Anchor</h2>
  <p>Hi ${escapeHtml(firstName)},</p>
  <p>Welcome to Anchor! Confirm ${whatToConfirm} to activate your account.</p>
  <p style="margin: 28px 0;">
    <a href="${link}" style="background: #3C6E91; color: #ffffff; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Confirm my email</a>
  </p>
  <p style="font-size: 13px; color: #6b7280;">Or paste this link into your browser:<br><a href="${link}" style="color: #3C6E91; word-break: break-all;">${link}</a></p>
  <p style="font-size: 13px; color: #6b7280;">This link expires in ${TOKEN_TTL_HOURS} hours. If you didn't create an account, you can ignore this email.</p>
</div>`;

    return sendEmail({ to: email, subject, html, text });
}

module.exports = {
    hashToken,
    createVerificationToken,
    sendVerificationEmail,
    RESEND_COOLDOWN_SECONDS,
};

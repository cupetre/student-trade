import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { postJson } from '../lib/api';
import { useLanguage } from '../lib/language';
import AuthShell from '../components/AuthShell.jsx';
import { authCopy } from './authCopy';

const RESEND_COOLDOWN = 60; // seconds, matches the backend
const STORAGE_KEY = 'pendingVerificationEmail';

// Remember the email across a page refresh (browser storage can be blocked, so never rely on it)
function readStoredEmail() {
    try { return sessionStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
}
function storeEmail(email) {
    try { sessionStorage.setItem(STORAGE_KEY, email); } catch { /* ignore */ }
}

const VerifyPendingPage = () => {
    const location = useLocation();
    const [lang] = useLanguage();
    const t = authCopy[lang];
    const p = t.pending;

    const fromLogin = Boolean(location.state?.fromLogin);
    const emailSendFailed = location.state?.emailSent === false;
    const isLandlord = location.state?.role === 'landlord';
    const emailWord = p.word[isLandlord ? 'landlord' : 'student'];

    const [email, setEmail] = useState(location.state?.email || readStoredEmail());
    const [knownEmail] = useState(Boolean(location.state?.email || readStoredEmail()));
    // Right after registering an email was just sent, so start the countdown.
    // Coming from login (or if sending failed), allow an immediate resend.
    const [cooldown, setCooldown] = useState(fromLogin || emailSendFailed ? 0 : RESEND_COOLDOWN);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    // A key from the copy ('sendFailed', 'enterEmail') or { text } from the server
    const [error, setError] = useState(emailSendFailed ? 'sendFailed' : '');

    useEffect(() => {
        if (email) storeEmail(email);
    }, [email]);

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleResend = async () => {
        if (sending || cooldown > 0) return;
        if (!email.trim()) {
            setError('enterEmail');
            return;
        }

        setSending(true);
        setError('');
        setSent(false);
        const { ok, data } = await postJson('/api/users/resend-verification', { email: email.trim() });
        setSending(false);

        if (ok) {
            setSent(true);
            setCooldown(RESEND_COOLDOWN);
        } else {
            setError({ text: data.error });
        }
    };

    const errorMessage = typeof error === 'object' ? error.text : (error ? p[error] : '');

    return (
        <AuthShell center>
            <div className="auth-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="30" height="30">
                    <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M3.5 6.5l8.5 6.5 8.5-6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
            </div>

            <h1 className="auth-title">{fromLogin ? p.titleFromLogin : p.title(emailWord)}</h1>

            {knownEmail && email ? (
                <p className="auth-subtitle">
                    {p.sentBefore}<strong className="auth-email">{email}</strong>{p.sentAfter}
                </p>
            ) : (
                <p className="auth-subtitle">{p.openLink(emailWord)}</p>
            )}

            <p className="auth-lock-note">{p.lockNote}</p>

            {errorMessage && <div className="auth-alert auth-alert--error" role="alert">{errorMessage}</div>}
            {sent && <div className="auth-alert auth-alert--success" role="status">{p.sent}</div>}

            {!knownEmail && (
                <div className="auth-field auth-field--left">
                    <label htmlFor="email">{p.yourEmail(emailWord)}</label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            )}

            <p className="auth-hint auth-hint--center">{p.spamHint}</p>

            <button
                type="button"
                className="auth-submit"
                onClick={handleResend}
                disabled={sending || cooldown > 0}
            >
                {sending && <span className="auth-spinner" aria-hidden="true" />}
                {sending ? p.sending : cooldown > 0 ? p.resendIn(cooldown) : p.resend}
            </button>

            <p className="auth-switch">
                {p.alreadyConfirmed} <Link to="/login">{p.login}</Link>
            </p>
        </AuthShell>
    );
};

export default VerifyPendingPage;

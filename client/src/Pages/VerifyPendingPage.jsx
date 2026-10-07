import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { postJson } from '../lib/api';
import './AuthPages.css';

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
    const fromLogin = Boolean(location.state?.fromLogin);
    const emailSendFailed = location.state?.emailSent === false;

    const [email, setEmail] = useState(location.state?.email || readStoredEmail());
    const [knownEmail] = useState(Boolean(location.state?.email || readStoredEmail()));
    // Right after registering an email was just sent, so start the countdown.
    // Coming from login (or if sending failed), allow an immediate resend.
    const [cooldown, setCooldown] = useState(fromLogin || emailSendFailed ? 0 : RESEND_COOLDOWN);
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState(emailSendFailed ? "We couldn't send the confirmation email. Press the button below to try again." : '');

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
            setError('Enter the email you registered with.');
            return;
        }

        setSending(true);
        setError('');
        setNotice('');
        const { ok, data } = await postJson('/api/users/resend-verification', { email: email.trim() });
        setSending(false);

        if (ok) {
            setNotice('A new confirmation link is on its way. Check your inbox and spam folder.');
            setCooldown(RESEND_COOLDOWN);
        } else {
            setError(data.error);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card auth-card--center">
                <div className="auth-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="30" height="30">
                        <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M3.5 6.5l8.5 6.5 8.5-6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                </div>

                <span className="auth-brand">Student Trade</span>
                <h1 className="auth-title">
                    {fromLogin ? 'Your email isn’t confirmed yet' : 'Confirm your university email'}
                </h1>

                {knownEmail && email ? (
                    <p className="auth-subtitle">
                        We sent a confirmation link to <strong className="auth-email">{email}</strong>.
                        Open it to activate your account.
                    </p>
                ) : (
                    <p className="auth-subtitle">Open the confirmation link we sent to your university email.</p>
                )}

                <p className="auth-lock-note">
                    Until you confirm your existing university email, you can&apos;t access Student Trade.
                </p>

                {error && <div className="auth-alert auth-alert--error" role="alert">{error}</div>}
                {notice && <div className="auth-alert auth-alert--success" role="status">{notice}</div>}

                {!knownEmail && (
                    <div className="auth-field auth-field--left">
                        <label htmlFor="email">Your university email</label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                )}

                <p className="auth-hint auth-hint--center">Didn&apos;t get it? Check your spam folder, or send a new link.</p>

                <button
                    type="button"
                    className="auth-submit"
                    onClick={handleResend}
                    disabled={sending || cooldown > 0}
                >
                    {sending && <span className="auth-spinner" aria-hidden="true" />}
                    {sending
                        ? 'Sending…'
                        : cooldown > 0
                            ? `Resend email in ${cooldown}s`
                            : 'Resend confirmation email'}
                </button>

                <p className="auth-switch">
                    Already confirmed? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    );
};

export default VerifyPendingPage;

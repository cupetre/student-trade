import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { postJson } from '../lib/api';
import { useLanguage } from '../lib/language';
import AuthShell from '../components/AuthShell.jsx';
import { authCopy } from './authCopy';

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN = 60; // seconds, the server sends at most one email a minute anyway

// /forgot-password: step 1 of a password reset. Asks for the email and sends a link.
// The answer is the same whether or not the account exists (nobody can use
// this page to find out who has an account).
const ForgotPasswordPage = () => {
    const location = useLocation();
    const [lang] = useLanguage();
    const t = authCopy[lang];
    const f = t.forgot;

    const [email, setEmail] = useState(location.state?.email || '');
    const [fieldError, setFieldError] = useState(''); // key in t.errors
    const [error, setError] = useState('');           // from the server
    const [sending, setSending] = useState(false);
    const [sentTo, setSentTo] = useState('');
    const [wait, setWait] = useState(0);

    useEffect(() => {
        if (wait <= 0) return undefined;
        const timer = setTimeout(() => setWait(w => w - 1), 1000);
        return () => clearTimeout(timer);
    }, [wait]);

    const send = async (e) => {
        e?.preventDefault();
        if (sending) return;
        const address = (sentTo || email).trim();
        if (!address) { setFieldError('emailRequired'); return; }
        if (!EMAIL_FORMAT.test(address)) { setFieldError('emailInvalid'); return; }

        setSending(true);
        setError('');
        const { ok, data } = await postJson('/api/users/forgot-password', { email: address, language: lang });
        setSending(false);
        if (!ok) { setError(data.error); return; }
        setSentTo(address);
        setWait(COOLDOWN);
    };

    if (sentTo) {
        return (
            <AuthShell center>
                <div className="auth-icon" aria-hidden="true">&#9993;</div>
                <h1 className="auth-title">{f.sentTitle}</h1>
                <p className="auth-subtitle" role="status">
                    {f.sentBefore}<strong>{sentTo}</strong>{f.sentAfter}
                </p>
                <p className="auth-hint auth-hint--center">{f.spamHint}</p>
                {error && <div className="auth-alert auth-alert--error" role="alert">{error}</div>}
                <button type="button" className="auth-submit auth-submit--spaced" onClick={send} disabled={sending || wait > 0}>
                    {sending && <span className="auth-spinner" aria-hidden="true" />}
                    {sending ? f.submitting : wait > 0 ? f.resendIn(wait) : f.resend}
                </button>
                <p className="auth-switch">
                    <button type="button" className="auth-link-btn" onClick={() => { setSentTo(''); setWait(0); }}>{f.otherEmail}</button>
                    {' · '}
                    <Link to="/login" state={{ email: sentTo }}>{f.login}</Link>
                </p>
            </AuthShell>
        );
    }

    return (
        <AuthShell>
            <div className="auth-header">
                <h1 className="auth-title">{f.title}</h1>
                <p className="auth-subtitle">{f.subtitle}</p>
            </div>

            {error && <div className="auth-alert auth-alert--error" role="alert">{error}</div>}

            <form className="auth-form" onSubmit={send} noValidate>
                <div className="auth-field">
                    <label htmlFor="email">{f.email}</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        value={email}
                        className={fieldError ? 'has-error' : ''}
                        aria-invalid={Boolean(fieldError)}
                        aria-describedby={fieldError ? 'email-error' : undefined}
                        onChange={(e) => { setEmail(e.target.value); setFieldError(''); setError(''); }}
                    />
                    {fieldError && <p className="auth-field-error" id="email-error">{t.errors[fieldError]}</p>}
                </div>

                <button type="submit" className="auth-submit" disabled={sending}>
                    {sending && <span className="auth-spinner" aria-hidden="true" />}
                    {sending ? f.submitting : f.submit}
                </button>
            </form>

            <p className="auth-switch">
                {f.remembered} <Link to="/login" state={{ email: email.trim() || undefined }}>{f.login}</Link>
            </p>
        </AuthShell>
    );
};

export default ForgotPasswordPage;

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { postJson } from '../lib/api';
import { useLanguage } from '../lib/language';
import AuthShell from '../components/AuthShell.jsx';
import { authCopy } from './authCopy';

// Which part of the app someone was trying to open before being asked to log in
function areaFor(path) {
    if (!path) return null;
    if (path.startsWith('/housing')) return 'housing';
    if (path.startsWith('/marketplace')) return 'market';
    if (path.startsWith('/settle-in')) return 'settle';
    if (path.startsWith('/chatpage')) return 'messages';
    return 'other';
}

const Login = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [lang] = useLanguage();
    const t = authCopy[lang];

    // Set by the confirmation page after the email link worked
    const justVerified = Boolean(location.state?.verified);
    const from = location.state?.from;
    const area = areaFor(from);

    const [email, setEmail] = useState(location.state?.email || '');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');      // from the server, shown as sent
    const [missing, setMissing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const clearErrors = () => {
        if (error) setError('');
        if (missing) setMissing(false);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (submitting) return;

        if (!email.trim() || !password) {
            setMissing(true);
            return;
        }

        setSubmitting(true);
        setError('');
        const { ok, status, data } = await postJson('/api/users/login', {
            email: email.trim(),
            password,
        });
        setSubmitting(false);

        // Right password, but the email isn't confirmed yet
        if (status === 403 && data.code === 'EMAIL_NOT_VERIFIED') {
            navigate('/verify-pending', { state: { email: data.email || email.trim(), fromLogin: true } });
            return;
        }

        if (ok && data.token) {
            localStorage.setItem('token', data.token);
            // Back to the page they originally tried to open (e.g. a chat link), else their home.
            // replace: the back button shouldn't bring you back to the login form
            navigate(from || '/', { replace: true });
            return;
        }

        setError(data.error || t.login.failed);
        setPassword('');
    };

    const shownError = missing ? t.login.missing : error;

    return (
        <AuthShell>
            <div className="auth-header">
                <h1 className="auth-title">{t.login.title}</h1>
                <p className="auth-subtitle">{t.login.subtitle}</p>
            </div>

            {shownError && <div className="auth-alert auth-alert--error" role="alert">{shownError}</div>}
            {justVerified && !shownError && (
                <div className="auth-alert auth-alert--success" role="status">{t.login.verified}</div>
            )}
            {area && !justVerified && !shownError && (
                <div className="auth-alert auth-alert--info" role="status">{t.login.continue[area]}</div>
            )}

            <form className="auth-form" onSubmit={handleLogin} noValidate>
                <div className="auth-field">
                    <label htmlFor="email">{t.login.email}</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="password">{t.login.password}</label>
                    <div className="auth-password">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); clearErrors(); }}
                        />
                        <button
                            type="button"
                            className="auth-toggle"
                            onClick={() => setShowPassword(s => !s)}
                            aria-label={showPassword ? t.hidePassword : t.showPassword}
                        >
                            {showPassword ? t.hide : t.show}
                        </button>
                    </div>
                </div>

                <button type="submit" className="auth-submit" disabled={submitting}>
                    {submitting && <span className="auth-spinner" aria-hidden="true" />}
                    {submitting ? t.login.submitting : t.login.submit}
                </button>
            </form>

            <p className="auth-switch">
                {t.login.newHere} <Link to="/register">{t.login.createStudent}</Link>
            </p>
            <p className="auth-switch">
                {t.login.havePlace} <Link to="/register/landlord">{t.login.createLandlord}</Link>
            </p>
        </AuthShell>
    );
};

export default Login;

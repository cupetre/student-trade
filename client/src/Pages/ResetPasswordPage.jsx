import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { postJson } from '../lib/api';
import { useLanguage } from '../lib/language';
import AuthShell from '../components/AuthShell.jsx';
import { authCopy, MIN_PASSWORD_LENGTH } from './authCopy';

// /reset-password?token=...: step 2, the page the link in the email opens.
const ResetPasswordPage = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [lang] = useLanguage();
    const t = authCopy[lang];
    const r = t.reset;
    const token = params.get('token') || '';
    const tokenLooksRight = /^[a-f0-9]{64}$/.test(token);

    const [password, setPassword] = useState('');
    const [repeat, setRepeat] = useState('');
    const [show, setShow] = useState(false);
    const [errors, setErrors] = useState({}); // keys in t.errors, or { text } from the server
    const [error, setError] = useState('');
    const [state, setState] = useState(tokenLooksRight ? 'form' : 'invalid'); // form | done | invalid
    const [saving, setSaving] = useState(false);

    const fieldText = (err) => (!err ? '' : typeof err === 'object' ? err.text : (typeof t.errors[err] === 'function' ? t.errors[err](MIN_PASSWORD_LENGTH) : t.errors[err]));

    const submit = async (e) => {
        e.preventDefault();
        if (saving) return;
        const next = {};
        if (password.length < MIN_PASSWORD_LENGTH) next.password = 'password';
        if (!repeat) next.repeat = 'repeat';
        else if (repeat !== password) next.repeat = 'mismatch';
        setErrors(next);
        if (Object.keys(next).length) return;

        setSaving(true);
        setError('');
        const { ok, data } = await postJson('/api/users/reset-password', { token, password });
        setSaving(false);
        if (ok) { setState('done'); return; }
        if (data.code === 'RESET_LINK_INVALID') { setState('invalid'); return; }
        if (data.field === 'password') { setErrors({ password: { text: data.error } }); return; }
        setError(data.error);
    };

    if (state === 'done') {
        return (
            <AuthShell center>
                <div className="auth-icon auth-icon--success" aria-hidden="true">&#10003;</div>
                <h1 className="auth-title">{r.doneTitle}</h1>
                <p className="auth-subtitle" role="status">{r.done}</p>
                <button type="button" className="auth-submit auth-submit--spaced"
                    onClick={() => navigate('/login', { replace: true, state: { flash: r.loginFlash } })}>
                    {r.login}
                </button>
            </AuthShell>
        );
    }

    if (state === 'invalid') {
        return (
            <AuthShell center>
                <div className="auth-icon auth-icon--warning" aria-hidden="true">!</div>
                <h1 className="auth-title">{r.invalidTitle}</h1>
                <p className="auth-subtitle">{r.invalid}</p>
                <Link to="/forgot-password" className="auth-submit auth-submit--spaced">{r.newLink}</Link>
            </AuthShell>
        );
    }

    return (
        <AuthShell>
            <div className="auth-header">
                <h1 className="auth-title">{r.title}</h1>
                <p className="auth-subtitle">{r.subtitle}</p>
            </div>

            {error && <div className="auth-alert auth-alert--error" role="alert">{error}</div>}

            <form className="auth-form" onSubmit={submit} noValidate>
                {/* lets password managers save the new password for the right account */}
                <input type="text" name="username" autoComplete="username" hidden readOnly />

                <div className="auth-field">
                    <label htmlFor="password">{r.password}</label>
                    <div className="auth-password">
                        <input
                            id="password"
                            type={show ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={password}
                            className={errors.password ? 'has-error' : ''}
                            aria-invalid={Boolean(errors.password)}
                            aria-describedby="password-help"
                            onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })); }}
                        />
                        <button type="button" className="auth-toggle" onClick={() => setShow(s => !s)}
                            aria-label={show ? t.hidePassword : t.showPassword}>
                            {show ? t.hide : t.show}
                        </button>
                    </div>
                    {errors.password
                        ? <p className="auth-field-error" id="password-help">{fieldText(errors.password)}</p>
                        : <p className="auth-hint" id="password-help">{r.passwordHint(MIN_PASSWORD_LENGTH)}</p>}
                </div>

                <div className="auth-field">
                    <label htmlFor="repeat">{r.repeat}</label>
                    <input
                        id="repeat"
                        type={show ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={repeat}
                        className={errors.repeat ? 'has-error' : ''}
                        aria-invalid={Boolean(errors.repeat)}
                        aria-describedby={errors.repeat ? 'repeat-error' : undefined}
                        onChange={(e) => { setRepeat(e.target.value); setErrors(prev => ({ ...prev, repeat: '' })); }}
                    />
                    {errors.repeat && <p className="auth-field-error" id="repeat-error">{fieldText(errors.repeat)}</p>}
                </div>

                <button type="submit" className="auth-submit" disabled={saving}>
                    {saving && <span className="auth-spinner" aria-hidden="true" />}
                    {saving ? r.submitting : r.submit}
                </button>
            </form>
        </AuthShell>
    );
};

export default ResetPasswordPage;

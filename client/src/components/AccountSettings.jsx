import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { logout } from '../lib/auth';
import { useT } from '../lib/i18n';
import './AccountSettings.css';

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt reads only the first 72 bytes, same rule as sign-up

const PasswordInput = ({ id, label, value, onChange, error, autoComplete, hint }) => {
    const t = useT();
    const [shown, setShown] = useState(false);
    return (
        <div className={`hs-field ${error ? 'has-error' : ''}`}>
            <label htmlFor={id}>{label}</label>
            <div className="acc-password">
                <input
                    id={id}
                    type={shown ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoComplete={autoComplete}
                    maxLength={MAX_PASSWORD}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
                />
                <button type="button" className="acc-show" onClick={() => setShown(s => !s)} aria-pressed={shown}>
                    {shown ? t('Hide') : t('Show')}
                </button>
            </div>
            {error ? <p className="hs-field-error" id={`${id}-error`}>{error}</p> : hint && <p className="hs-hint" id={`${id}-hint`}>{hint}</p>}
        </div>
    );
};

/*
  "Account" on My profile: change the password, and delete the account.
  Both ask for the current password (the server checks it again).
  Deleting removes everything that belongs to the account at once, so the
  section says exactly what goes, and the button only works after typing the password.
*/
const AccountSettings = () => {
    const t = useT();
    const navigate = useNavigate();
    const [open, setOpen] = useState(null); // 'password' | 'delete' | null

    const [pw, setPw] = useState({ current: '', next: '', repeat: '' });
    const [pwErrors, setPwErrors] = useState({});
    const [pwBusy, setPwBusy] = useState(false);
    const [pwDone, setPwDone] = useState('');

    const [delPassword, setDelPassword] = useState('');
    const [delError, setDelError] = useState('');
    const [delBusy, setDelBusy] = useState(false);

    const toggle = (part) => {
        setOpen(prev => (prev === part ? null : part));
        setPwErrors({}); setDelError(''); setPwDone('');
    };

    const changePassword = async (e) => {
        e.preventDefault();
        const errors = {};
        if (!pw.current) errors.current = t('Enter your current password');
        if (pw.next.length < MIN_PASSWORD) errors.next = t('Use at least {n} characters.', { n: MIN_PASSWORD });
        else if (pw.next === pw.current) errors.next = t('The new password must be different from the current one');
        if (!errors.next && pw.repeat !== pw.next) errors.repeat = t('The two new passwords are not the same.');
        setPwErrors(errors);
        if (Object.keys(errors).length) return;

        setPwBusy(true);
        const { ok, data } = await apiRequest('/api/users/me/password', {
            method: 'PUT',
            body: { current_password: pw.current, new_password: pw.next },
        });
        setPwBusy(false);
        if (!ok) {
            if (data.field === 'current_password') setPwErrors({ current: data.error });
            else if (data.field === 'new_password') setPwErrors({ next: data.error });
            else setPwErrors({ form: data.error });
            return;
        }
        setPw({ current: '', next: '', repeat: '' });
        setOpen(null);
        setPwDone(data.message || t('Your password was changed.'));
    };

    const deleteAccount = async (e) => {
        e.preventDefault();
        if (!delPassword) { setDelError(t('Enter your password to confirm')); return; }
        setDelBusy(true);
        setDelError('');
        const { ok, data } = await apiRequest('/api/users/me', { method: 'DELETE', body: { password: delPassword } });
        setDelBusy(false);
        if (!ok) { setDelError(data.error); return; }
        logout();
        navigate('/login', { replace: true, state: { flash: t('Your account and everything in it was deleted.') } });
    };

    return (
        <section className="mp-card acc" aria-labelledby="acc-title">
            <h2 id="acc-title">{t('Account')}</h2>
            {pwDone && <div className="hs-alert hs-alert--success" role="status">{pwDone}</div>}

            <div className="acc-row">
                <div>
                    <strong>{t('Password')}</strong>
                    <span>{t('Change the password you log in with.')}</span>
                </div>
                <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" aria-expanded={open === 'password'} aria-controls="acc-password-form" onClick={() => toggle('password')}>
                    {open === 'password' ? t('Cancel') : t('Change password')}
                </button>
            </div>
            {open === 'password' && (
                <form id="acc-password-form" className="acc-form" onSubmit={changePassword} noValidate>
                    {pwErrors.form && <div className="hs-alert hs-alert--error" role="alert">{pwErrors.form}</div>}
                    <PasswordInput id="acc-current" label={t('Current password')} value={pw.current} onChange={(v) => setPw(p => ({ ...p, current: v }))} error={pwErrors.current} autoComplete="current-password" />
                    <PasswordInput id="acc-new" label={t('New password')} value={pw.next} onChange={(v) => setPw(p => ({ ...p, next: v }))} error={pwErrors.next} autoComplete="new-password" hint={t('At least {n} characters.', { n: MIN_PASSWORD })} />
                    <PasswordInput id="acc-repeat" label={t('New password again')} value={pw.repeat} onChange={(v) => setPw(p => ({ ...p, repeat: v }))} error={pwErrors.repeat} autoComplete="new-password" />
                    <p className="hs-hint">
                        {t('Forgot your current password?')} <Link to="/forgot-password">{t('Get a reset link by email')}</Link>
                    </p>
                    <div className="acc-actions">
                        <button type="submit" className="hs-btn" disabled={pwBusy}>{pwBusy ? t('Saving…') : t('Save new password')}</button>
                    </div>
                </form>
            )}

            <div className="acc-row acc-row--danger">
                <div>
                    <strong>{t('Delete account')}</strong>
                    <span>{t('Remove your account and everything in it, for good.')}</span>
                </div>
                <button type="button" className="hs-btn hs-btn--small hs-btn--ghost acc-danger-btn" aria-expanded={open === 'delete'} aria-controls="acc-delete-form" onClick={() => toggle('delete')}>
                    {open === 'delete' ? t('Cancel') : t('Delete account')}
                </button>
            </div>
            {open === 'delete' && (
                <form id="acc-delete-form" className="acc-form acc-form--danger" onSubmit={deleteAccount} noValidate>
                    <p><strong>{t('This can’t be undone.')}</strong> {t('Deleting your account removes, right away:')}</p>
                    <ul>
                        <li>{t('your profile, photo and rental profile')}</li>
                        <li>{t('your marketplace items and housing listings, with their photos')}</li>
                        <li>{t('your conversations and messages (also for the people you talked to)')}</li>
                        <li>{t('reviews you wrote and reviews about you, likes, reports and stays')}</li>
                    </ul>
                    <p className="hs-hint">{t('If you only want a break, you can simply log out. Your things stay as they are.')}</p>
                    <PasswordInput id="acc-delete-password" label={t('Your password')} value={delPassword} onChange={(v) => { setDelPassword(v); setDelError(''); }} error={delError} autoComplete="current-password" />
                    <div className="acc-actions">
                        <button type="submit" className="hs-btn hs-btn--danger" disabled={delBusy || !delPassword}>
                            {delBusy ? t('Deleting…') : t('Delete my account for good')}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
};

export default AccountSettings;

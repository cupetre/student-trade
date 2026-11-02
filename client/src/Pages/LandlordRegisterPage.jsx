import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postJson } from '../lib/api';
import { useLanguage } from '../lib/language';
import AuthShell from '../components/AuthShell.jsx';
import { authCopy, errorText, MIN_PASSWORD_LENGTH } from './authCopy';

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign-up for landlords and agencies. Any email works (no university check),
// they can only post rental listings, and in production they are reviewed first.
const LandlordRegisterPage = () => {
    const navigate = useNavigate();
    const [lang] = useLanguage();
    const t = authCopy[lang];

    const [form, setForm] = useState({ fullname: '', email: '', phone: '', password: '', repeatPassword: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
        if (formError) setFormError('');
    };

    const validate = () => {
        const errors = {};
        const email = form.email.trim();
        if (form.fullname.trim().length < 2) errors.fullname = 'nameError';
        if (!email) errors.email = 'emailRequired';
        else if (!EMAIL_FORMAT.test(email)) errors.email = 'emailInvalid';
        if (form.phone.trim() && !/^[+\d][\d\s/-]{5,}$/.test(form.phone.trim())) errors.phone = 'phoneError';
        if (form.password.length < MIN_PASSWORD_LENGTH) errors.password = 'password';
        if (!form.repeatPassword) errors.repeatPassword = 'repeat';
        else if (form.repeatPassword !== form.password) errors.repeatPassword = 'mismatch';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting || !validate()) return;

        setSubmitting(true);
        const { ok, data } = await postJson('/api/users/register-landlord', {
            fullname: form.fullname.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            password: form.password,
        });
        setSubmitting(false);

        if (ok) {
            navigate('/verify-pending', {
                replace: true,
                state: { email: data.email || form.email.trim().toLowerCase(), emailSent: data.emailSent, role: 'landlord' },
            });
            return;
        }
        if (data.field) setFieldErrors(prev => ({ ...prev, [data.field]: { text: data.error } }));
        else setFormError(data.error);
    };

    const field = (name, hintId) => ({
        id: name,
        name,
        value: form[name],
        onChange: handleChange,
        className: fieldErrors[name] ? 'has-error' : '',
        'aria-invalid': Boolean(fieldErrors[name]),
        'aria-describedby': fieldErrors[name] ? `${name}-error` : hintId,
    });

    const error = (name) => fieldErrors[name] && (
        <p id={`${name}-error`} className="auth-field-error">{errorText(t, fieldErrors[name])}</p>
    );

    return (
        <AuthShell
            roleTabs
            aside={{ kind: 'landlord', href: '/#for-landlords', ...t.landlord.aside }}
        >
            <div className="auth-header">
                <h1 className="auth-title">{t.landlord.title}</h1>
                <p className="auth-subtitle">{t.landlord.subtitle}</p>
            </div>

            {formError && <div className="auth-alert auth-alert--error" role="alert">{formError}</div>}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <div className="auth-field">
                    <label htmlFor="fullname">{t.landlord.fullname}</label>
                    <input {...field('fullname')} type="text" autoComplete="name" />
                    {error('fullname')}
                </div>

                <div className="auth-field">
                    <label htmlFor="email">{t.landlord.email}</label>
                    <input {...field('email')} type="email" autoComplete="email" inputMode="email" />
                    {error('email')}
                </div>

                <div className="auth-field">
                    <label htmlFor="phone">{t.landlord.phone}</label>
                    <input {...field('phone', 'phone-hint')} type="tel" autoComplete="tel" inputMode="tel" placeholder="+386 …" />
                    {error('phone') || <p id="phone-hint" className="auth-hint">{t.landlord.phoneHint}</p>}
                </div>

                <div className="auth-field">
                    <label htmlFor="password">{t.landlord.password}</label>
                    <div className="auth-password">
                        <input {...field('password', 'password-hint')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" />
                        <button
                            type="button"
                            className="auth-toggle"
                            onClick={() => setShowPassword(s => !s)}
                            aria-label={showPassword ? t.hidePassword : t.showPassword}
                        >
                            {showPassword ? t.hide : t.show}
                        </button>
                    </div>
                    {error('password') || <p id="password-hint" className="auth-hint">{t.landlord.passwordHint(MIN_PASSWORD_LENGTH)}</p>}
                </div>

                <div className="auth-field">
                    <label htmlFor="repeatPassword">{t.landlord.repeat}</label>
                    <input {...field('repeatPassword')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" />
                    {error('repeatPassword')}
                </div>

                <button type="submit" className="auth-submit" disabled={submitting}>
                    {submitting && <span className="auth-spinner" aria-hidden="true" />}
                    {submitting ? t.landlord.submitting : t.landlord.submit}
                </button>
            </form>

            <p className="auth-switch">
                {t.landlord.haveAccount} <Link to="/login">{t.landlord.login}</Link>
            </p>
        </AuthShell>
    );
};

export default LandlordRegisterPage;

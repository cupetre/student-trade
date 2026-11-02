import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { postJson } from '../lib/api';
import { useLanguage } from '../lib/language';
import AuthShell from '../components/AuthShell.jsx';
import { authCopy, errorText, MIN_PASSWORD_LENGTH } from './authCopy';

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Register = () => {
    // The landing page can pass the email the student already typed in
    const location = useLocation();
    const navigate = useNavigate();
    const [lang] = useLanguage();
    const t = authCopy[lang];

    const [form, setForm] = useState({ fullname: '', email: location.state?.email || '', password: '', repeatPassword: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));

        // clear the error on a field as soon as the user starts fixing it
        if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
        if (formError) setFormError('');
    };

    // Quick checks so people get instant feedback. The backend checks all of
    // this again (and the university domain), because this part can be bypassed.
    const validate = () => {
        const errors = {};
        const email = form.email.trim();

        if (form.fullname.trim().length < 2) errors.fullname = 'name';
        if (!email) errors.email = 'emailRequired';
        else if (!EMAIL_FORMAT.test(email)) errors.email = 'emailInvalid';
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
        const { ok, data } = await postJson('/api/users/register', {
            fullname: form.fullname.trim(),
            email: form.email.trim(),
            password: form.password,
        });
        setSubmitting(false);

        if (ok) {
            // Next stop: the "check your email" screen. emailSent is false if
            // the backend couldn't send it, so that screen can offer a resend right away.
            navigate('/verify-pending', {
                replace: true,
                state: { email: data.email || form.email.trim().toLowerCase(), emailSent: data.emailSent },
            });
            return;
        }

        // When the backend knows which field is wrong, show it under that field
        if (data.field) {
            setFieldErrors(prev => ({ ...prev, [data.field]: { text: data.error } }));
        } else {
            setFormError(data.error);
        }
    };

    const fieldProps = (name) => ({
        id: name,
        name,
        value: form[name],
        onChange: handleChange,
        className: fieldErrors[name] ? 'has-error' : '',
        'aria-invalid': Boolean(fieldErrors[name]),
    });

    const err = (name) => fieldErrors[name] && (
        <p id={`${name}-error`} className="auth-field-error">{errorText(t, fieldErrors[name])}</p>
    );

    return (
        <AuthShell
            roleTabs
            aside={{ kind: 'student', href: '/#for-students', ...t.register.aside }}
        >
            <div className="auth-header">
                <h1 className="auth-title">{t.register.title}</h1>
                <p className="auth-subtitle">{t.register.subtitle}</p>
            </div>

            {formError && <div className="auth-alert auth-alert--error" role="alert">{formError}</div>}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <div className="auth-field">
                    <label htmlFor="fullname">{t.register.fullname}</label>
                    <input
                        {...fieldProps('fullname')}
                        type="text"
                        autoComplete="name"
                        aria-describedby={fieldErrors.fullname ? 'fullname-error' : undefined}
                    />
                    {err('fullname')}
                </div>

                <div className="auth-field">
                    <label htmlFor="email">{t.register.email}</label>
                    <input
                        {...fieldProps('email')}
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        aria-describedby={fieldErrors.email ? 'email-error' : 'email-hint'}
                    />
                    {err('email') || <p id="email-hint" className="auth-hint">{t.register.emailHint}</p>}
                </div>

                <div className="auth-field">
                    <label htmlFor="password">{t.register.password}</label>
                    <div className="auth-password">
                        <input
                            {...fieldProps('password')}
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
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
                    {err('password') || <p id="password-hint" className="auth-hint">{t.register.passwordHint(MIN_PASSWORD_LENGTH)}</p>}
                </div>

                <div className="auth-field">
                    <label htmlFor="repeatPassword">{t.register.repeat}</label>
                    <input
                        {...fieldProps('repeatPassword')}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        aria-describedby={fieldErrors.repeatPassword ? 'repeatPassword-error' : undefined}
                    />
                    {err('repeatPassword')}
                </div>

                <button type="submit" className="auth-submit" disabled={submitting}>
                    {submitting && <span className="auth-spinner" aria-hidden="true" />}
                    {submitting ? t.register.submitting : t.register.submit}
                </button>
            </form>

            <p className="auth-switch">
                {t.register.haveAccount} <Link to="/login">{t.register.login}</Link>
            </p>
        </AuthShell>
    );
};

export default Register;

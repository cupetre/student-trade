import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postJson } from '../lib/api';
import './AuthPages.css';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Register = () => {
    const [form, setForm] = useState({ fullname: '', email: '', password: '', repeatPassword: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate();

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

        if (form.fullname.trim().length < 2) {
            errors.fullname = 'Please enter your full name.';
        }

        if (!email) {
            errors.email = 'Email is required.';
        } else if (!EMAIL_FORMAT.test(email)) {
            errors.email = "That doesn't look like a valid email address.";
        }

        if (form.password.length < MIN_PASSWORD_LENGTH) {
            errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
        }

        if (!form.repeatPassword) {
            errors.repeatPassword = 'Please repeat your password.';
        } else if (form.repeatPassword !== form.password) {
            errors.repeatPassword = 'Passwords do not match.';
        }

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
            setFieldErrors(prev => ({ ...prev, [data.field]: data.error }));
        } else {
            setFormError(data.error);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <span className="auth-brand">Student Trade</span>
                    <h1 className="auth-title">Create your account</h1>
                    <p className="auth-subtitle">Buy, sell and chat with students from your university.</p>
                </div>

                {formError && (
                    <div className="auth-alert auth-alert--error" role="alert">{formError}</div>
                )}

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    <div className="auth-field">
                        <label htmlFor="fullname">Full name</label>
                        <input
                            id="fullname"
                            name="fullname"
                            type="text"
                            autoComplete="name"
                            value={form.fullname}
                            onChange={handleChange}
                            className={fieldErrors.fullname ? 'has-error' : ''}
                            aria-invalid={Boolean(fieldErrors.fullname)}
                            aria-describedby={fieldErrors.fullname ? 'fullname-error' : undefined}
                        />
                        {fieldErrors.fullname && (
                            <p id="fullname-error" className="auth-field-error">{fieldErrors.fullname}</p>
                        )}
                    </div>

                    <div className="auth-field">
                        <label htmlFor="email">University email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            value={form.email}
                            onChange={handleChange}
                            className={fieldErrors.email ? 'has-error' : ''}
                            aria-invalid={Boolean(fieldErrors.email)}
                            aria-describedby={fieldErrors.email ? 'email-error' : 'email-hint'}
                        />
                        {fieldErrors.email ? (
                            <p id="email-error" className="auth-field-error">{fieldErrors.email}</p>
                        ) : (
                            <p id="email-hint" className="auth-hint">Use the email address your university gave you.</p>
                        )}
                    </div>

                    <div className="auth-field">
                        <label htmlFor="password">Password</label>
                        <div className="auth-password">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={form.password}
                                onChange={handleChange}
                                className={fieldErrors.password ? 'has-error' : ''}
                                aria-invalid={Boolean(fieldErrors.password)}
                                aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
                            />
                            <button
                                type="button"
                                className="auth-toggle"
                                onClick={() => setShowPassword(s => !s)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        {fieldErrors.password ? (
                            <p id="password-error" className="auth-field-error">{fieldErrors.password}</p>
                        ) : (
                            <p id="password-hint" className="auth-hint">At least {MIN_PASSWORD_LENGTH} characters.</p>
                        )}
                    </div>

                    <div className="auth-field">
                        <label htmlFor="repeatPassword">Repeat password</label>
                        <input
                            id="repeatPassword"
                            name="repeatPassword"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={form.repeatPassword}
                            onChange={handleChange}
                            className={fieldErrors.repeatPassword ? 'has-error' : ''}
                            aria-invalid={Boolean(fieldErrors.repeatPassword)}
                            aria-describedby={fieldErrors.repeatPassword ? 'repeatPassword-error' : undefined}
                        />
                        {fieldErrors.repeatPassword && (
                            <p id="repeatPassword-error" className="auth-field-error">{fieldErrors.repeatPassword}</p>
                        )}
                    </div>

                    <button type="submit" className="auth-submit" disabled={submitting}>
                        {submitting && <span className="auth-spinner" aria-hidden="true" />}
                        {submitting ? 'Creating account…' : 'Create account'}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;

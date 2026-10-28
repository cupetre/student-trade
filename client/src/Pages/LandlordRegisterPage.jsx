import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postJson } from '../lib/api';
import './AuthPages.css';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign-up for landlords and agencies. Any email works (no university check),
// they can only post rental listings, and in production they are reviewed first.
const LandlordRegisterPage = () => {
    const [form, setForm] = useState({ fullname: '', email: '', phone: '', password: '', repeatPassword: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
        if (formError) setFormError('');
    };

    const validate = () => {
        const errors = {};
        const email = form.email.trim();
        if (form.fullname.trim().length < 2) errors.fullname = 'Please enter your name or your agency’s name.';
        if (!email) errors.email = 'Email is required.';
        else if (!EMAIL_FORMAT.test(email)) errors.email = "That doesn't look like a valid email address.";
        if (form.phone.trim() && !/^[+\d][\d\s/-]{5,}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number, or leave it empty.';
        if (form.password.length < MIN_PASSWORD_LENGTH) errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
        if (!form.repeatPassword) errors.repeatPassword = 'Please repeat your password.';
        else if (form.repeatPassword !== form.password) errors.repeatPassword = 'Passwords do not match.';
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
        if (data.field) setFieldErrors(prev => ({ ...prev, [data.field]: data.error }));
        else setFormError(data.error);
    };

    const field = (name) => ({
        id: name,
        name,
        value: form[name],
        onChange: handleChange,
        className: fieldErrors[name] ? 'has-error' : '',
        'aria-invalid': Boolean(fieldErrors[name]),
        'aria-describedby': fieldErrors[name] ? `${name}-error` : undefined,
    });

    const error = (name) => fieldErrors[name] && <p id={`${name}-error`} className="auth-field-error">{fieldErrors[name]}</p>;

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <Link to="/" className="auth-brand">Student Trade</Link>
                    <h1 className="auth-title">Rent to students</h1>
                    <p className="auth-subtitle">A landlord account for homeowners and agencies. Post rooms and flats, and talk to students directly.</p>
                </div>

                {formError && <div className="auth-alert auth-alert--error" role="alert">{formError}</div>}

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    <div className="auth-field">
                        <label htmlFor="fullname">Name or agency</label>
                        <input {...field('fullname')} type="text" autoComplete="name" />
                        {error('fullname')}
                    </div>

                    <div className="auth-field">
                        <label htmlFor="email">Email</label>
                        <input {...field('email')} type="email" autoComplete="email" inputMode="email" />
                        {error('email')}
                    </div>

                    <div className="auth-field">
                        <label htmlFor="phone">Phone (optional)</label>
                        <input {...field('phone')} type="tel" autoComplete="tel" inputMode="tel" placeholder="+386 …" />
                        {error('phone') || <p className="auth-hint">Only used by us to verify you. It isn’t shown on your listings.</p>}
                    </div>

                    <div className="auth-field">
                        <label htmlFor="password">Password</label>
                        <div className="auth-password">
                            <input {...field('password')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" />
                            <button type="button" className="auth-toggle" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        {error('password') || <p className="auth-hint">At least {MIN_PASSWORD_LENGTH} characters.</p>}
                    </div>

                    <div className="auth-field">
                        <label htmlFor="repeatPassword">Repeat password</label>
                        <input {...field('repeatPassword')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" />
                        {error('repeatPassword')}
                    </div>

                    <button type="submit" className="auth-submit" disabled={submitting}>
                        {submitting && <span className="auth-spinner" aria-hidden="true" />}
                        {submitting ? 'Creating account…' : 'Create landlord account'}
                    </button>
                </form>

                <p className="auth-switch">
                    A student? <Link to="/register">Sign up with your university email</Link>
                </p>
                <p className="auth-switch">
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    );
};

export default LandlordRegisterPage;

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { postJson } from '../lib/api';
import './AuthPages.css';

const Login = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Set by the confirmation page after the email link worked
    const justVerified = Boolean(location.state?.verified);

    const [email, setEmail] = useState(location.state?.email || '');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (submitting) return;

        if (!email.trim() || !password) {
            setError('Please enter your email and password.');
            return;
        }

        setSubmitting(true);
        setError('');
        const { ok, status, data } = await postJson('/api/users/login', {
            email: email.trim(),
            password,
        });
        setSubmitting(false);

        // Right password, but the university email isn't confirmed yet
        if (status === 403 && data.code === 'EMAIL_NOT_VERIFIED') {
            navigate('/verify-pending', { state: { email: data.email || email.trim(), fromLogin: true } });
            return;
        }

        if (ok && data.token) {
            localStorage.setItem('token', data.token);
            // replace: the back button shouldn't bring you back to the login form
            navigate('/', { replace: true });
            return;
        }

        setError(data.error || 'Login failed. Please try again.');
        setPassword('');
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <span className="auth-brand">Student Trade</span>
                    <h1 className="auth-title">Welcome back</h1>
                    <p className="auth-subtitle">Log in with your university email.</p>
                </div>

                {error && (
                    <div className="auth-alert auth-alert--error" role="alert">{error}</div>
                )}
                {justVerified && !error && (
                    <div className="auth-alert auth-alert--success" role="status">
                        Email confirmed. Log in to get started.
                    </div>
                )}

                <form className="auth-form" onSubmit={handleLogin} noValidate>
                    <div className="auth-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="password">Password</label>
                        <div className="auth-password">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
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
                    </div>

                    <button type="submit" className="auth-submit" disabled={submitting}>
                        {submitting && <span className="auth-spinner" aria-hidden="true" />}
                        {submitting ? 'Logging in…' : 'Log in'}
                    </button>
                </form>

                <p className="auth-switch">
                    New to Student Trade? <Link to="/register">Create an account</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;

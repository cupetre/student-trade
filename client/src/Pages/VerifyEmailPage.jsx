import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { postJson } from '../lib/api';
import './AuthPages.css';

// The page the link in the confirmation email opens: /verify-email?token=...
const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    // 'loading' | 'success' | 'expired' | 'invalid' | 'error'
    const [status, setStatus] = useState(token ? 'loading' : 'invalid');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');

    // Links are single-use, so make sure we only ever send the token once
    const sentRef = useRef(false);

    useEffect(() => {
        if (!token || sentRef.current) return;
        sentRef.current = true;

        (async () => {
            const { ok, data } = await postJson('/api/users/verify-email', { token });

            if (ok) {
                setEmail(data.email || '');
                setStatus('success');
            } else if (data.code === 'TOKEN_EXPIRED') {
                setEmail(data.email || '');
                setMessage(data.error);
                setStatus('expired');
            } else if (data.code === 'INVALID_TOKEN') {
                setMessage(data.error);
                setStatus('invalid');
            } else {
                setMessage(data.error);
                setStatus('error');
            }
        })();
    }, [token]);

    return (
        <div className="auth-page">
            <div className="auth-card auth-card--center">
                <Link to="/" className="auth-brand">Student Trade</Link>

                {status === 'loading' && (
                    <>
                        <div className="auth-icon"><span className="auth-spinner auth-spinner--dark" aria-hidden="true" /></div>
                        <h1 className="auth-title">Confirming your email…</h1>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="auth-icon auth-icon--success" aria-hidden="true">&#10003;</div>
                        <h1 className="auth-title">Email confirmed!</h1>
                        <p className="auth-subtitle">Your account is active. Log in to start using Student Trade.</p>
                        <button
                            type="button"
                            className="auth-submit auth-submit--spaced"
                            onClick={() => navigate('/login', { replace: true, state: { verified: true, email } })}
                        >
                            Log in
                        </button>
                    </>
                )}

                {status === 'expired' && (
                    <>
                        <div className="auth-icon auth-icon--warning" aria-hidden="true">!</div>
                        <h1 className="auth-title">This link has expired</h1>
                        <p className="auth-subtitle">{message}</p>
                        <button
                            type="button"
                            className="auth-submit auth-submit--spaced"
                            onClick={() => navigate('/verify-pending', { state: { email, fromLogin: true } })}
                        >
                            Send a new link
                        </button>
                    </>
                )}

                {(status === 'invalid' || status === 'error') && (
                    <>
                        <div className="auth-icon auth-icon--warning" aria-hidden="true">!</div>
                        <h1 className="auth-title">
                            {status === 'invalid' ? 'This link doesn’t work' : 'Something went wrong'}
                        </h1>
                        <p className="auth-subtitle">
                            {message || 'This confirmation link is missing or incomplete.'}
                        </p>
                        <p className="auth-hint auth-hint--center">
                            If you already confirmed your email, you can just log in.
                        </p>
                        <p className="auth-switch">
                            <Link to="/login">Go to login</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default VerifyEmailPage;

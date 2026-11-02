import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { postJson } from '../lib/api';
import { useLanguage } from '../lib/language';
import AuthShell from '../components/AuthShell.jsx';
import { authCopy } from './authCopy';

// The page the link in the confirmation email opens: /verify-email?token=...
const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [lang] = useLanguage();
    const v = authCopy[lang].verify;
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
        <AuthShell center>
            {status === 'loading' && (
                <>
                    <div className="auth-icon"><span className="auth-spinner auth-spinner--dark" aria-hidden="true" /></div>
                    <h1 className="auth-title" role="status">{v.confirming}</h1>
                </>
            )}

            {status === 'success' && (
                <>
                    <div className="auth-icon auth-icon--success" aria-hidden="true">&#10003;</div>
                    <h1 className="auth-title">{v.confirmed}</h1>
                    <p className="auth-subtitle">{v.active}</p>
                    <button
                        type="button"
                        className="auth-submit auth-submit--spaced"
                        onClick={() => navigate('/login', { replace: true, state: { verified: true, email } })}
                    >
                        {v.login}
                    </button>
                </>
            )}

            {status === 'expired' && (
                <>
                    <div className="auth-icon auth-icon--warning" aria-hidden="true">!</div>
                    <h1 className="auth-title">{v.expired}</h1>
                    <p className="auth-subtitle">{message}</p>
                    <button
                        type="button"
                        className="auth-submit auth-submit--spaced"
                        onClick={() => navigate('/verify-pending', { state: { email, fromLogin: true } })}
                    >
                        {v.newLink}
                    </button>
                </>
            )}

            {(status === 'invalid' || status === 'error') && (
                <>
                    <div className="auth-icon auth-icon--warning" aria-hidden="true">!</div>
                    <h1 className="auth-title">{status === 'invalid' ? v.invalid : v.error}</h1>
                    <p className="auth-subtitle">{message || v.missing}</p>
                    <p className="auth-hint auth-hint--center">{v.already}</p>
                    <p className="auth-switch">
                        <Link to="/login">{v.goLogin}</Link>
                    </p>
                </>
            )}
        </AuthShell>
    );
};

export default VerifyEmailPage;

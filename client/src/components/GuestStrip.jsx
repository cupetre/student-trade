import React from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../lib/i18n';
import { rememberReturn } from '../lib/returnTo';
import './SignUpPrompt.css';

// A slim line on top of the pages a visitor can browse without an account:
// what they're missing, and a way in that brings them back to this page.
const GuestStrip = ({ text }) => {
    const t = useT();
    const here = () => rememberReturn(window.location.pathname + window.location.search);
    return (
        <aside className="guest-strip" aria-label={t('Browsing as a guest')}>
            <p>{text}</p>
            <div className="guest-strip-actions">
                <Link to="/register" className="guest-strip-main" onClick={here}>{t('Sign up')}</Link>
                <Link to="/login" state={{ from: window.location.pathname + window.location.search }} onClick={here}>{t('Log in')}</Link>
            </div>
        </aside>
    );
};

export default GuestStrip;

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../lib/i18n';
import { rememberReturn } from '../lib/returnTo';
import './SignUpPrompt.css';

/*
  Shown when a visitor without an account tries to do something that needs one
  (message, like, see who posted). Says why, and brings them back to the same
  page after they sign up or log in. `reason` is one short sentence, already
  translated, e.g. "Create a free account to message the seller."
*/
const SignUpPrompt = ({ reason, onClose }) => {
    const t = useT();
    const firstRef = useRef(null);
    const boxRef = useRef(null);

    useEffect(() => {
        const before = document.activeElement;
        firstRef.current?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key !== 'Tab' || !boxRef.current) return;
            const focusable = boxRef.current.querySelectorAll('a[href], button');
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            if (before && typeof before.focus === 'function') before.focus();
        };
    }, [onClose]);

    const here = window.location.pathname + window.location.search;

    return (
        <div className="sup-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="sup" role="dialog" aria-modal="true" aria-labelledby="sup-title" ref={boxRef}>
                <h2 id="sup-title">{t('Join to continue')}</h2>
                <p className="sup-reason">{reason}</p>
                <p className="sup-why">{t('Only verified students and checked landlords can contact people here. It keeps everyone safe, and it’s free.')}</p>
                <div className="sup-actions">
                    <Link to="/register" className="sup-btn sup-btn--main" ref={firstRef} onClick={() => rememberReturn(here)}>{t('Sign up')}</Link>
                    <Link to="/login" state={{ from: here }} className="sup-btn" onClick={() => rememberReturn(here)}>{t('Log in')}</Link>
                </div>
                <button type="button" className="sup-later" onClick={onClose}>{t('Keep browsing')}</button>
            </div>
        </div>
    );
};

export default SignUpPrompt;

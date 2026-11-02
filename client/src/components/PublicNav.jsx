import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import { BRAND_NAMES } from '../lib/brand';
import { LANGUAGES, useLanguage } from '../lib/language';
import './PublicNav.css';

const COPY = {
    sl: {
        brand: BRAND_NAMES.sl, main: 'Glavni meni', home: `${BRAND_NAMES.sl}, na začetek`, language: 'Jezik',
        housing: 'Bivanje', market: 'Tržnica', settle: 'Udomači se', landlords: 'Za najemodajalce', partners: 'Partnerji',
        login: 'Prijava', signup: 'Registracija',
    },
    en: {
        brand: BRAND_NAMES.en, main: 'Main', home: `${BRAND_NAMES.en}, home`, language: 'Language',
        housing: 'Housing', market: 'Marketplace', settle: 'Settle In', landlords: 'For landlords', partners: 'Partners',
        login: 'Log in', signup: 'Sign up',
    },
};

// Where each link goes on the landing page. "#for-landlords" opens the landlord explainer.
const LINKS = [
    ['housing', '#lane-housing'],
    ['market', '#lane-market'],
    ['settle', '#lane-settle'],
    ['landlords', '#for-landlords', 'quiet'],
    ['partners', '#partners', 'quiet'],
];

function scrollBehavior() {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    } catch {
        return 'auto';
    }
}

/*
  Top bar for everyone who isn't logged in: the landing page, log in, sign up and
  email confirmation all share it, so the same buttons are always in the same place.
  Logged-in pages use AppNav instead.
*/
const PublicNav = () => {
    const { pathname } = useLocation();
    const [lang, setLang] = useLanguage();
    const t = COPY[lang];
    const onLanding = pathname === '/';

    // On the landing page, section links just scroll (no new history entry).
    // From any other page they go to the landing page and it scrolls there.
    const handleSection = (e, hash) => {
        if (!onLanding || hash === '#for-landlords') return;
        const target = document.getElementById(hash.slice(1));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    };

    const handleLogo = (e) => {
        if (!onLanding) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
    };

    const onLogin = pathname.startsWith('/login');
    const onSignup = pathname.startsWith('/register');

    return (
        <header className="pn">
            <div className="pn-inner">
                <Link to="/" className="pn-logo" aria-label={t.home} onClick={handleLogo}>
                    <Logo size={34} hideWordOnPhone name={t.brand} />
                </Link>

                <nav className="pn-links" aria-label={t.main}>
                    {LINKS.map(([key, hash, tone]) => (
                        <Link
                            key={key}
                            to={`/${hash}`}
                            className={tone === 'quiet' ? 'is-quiet' : ''}
                            onClick={(e) => handleSection(e, hash)}
                        >
                            {t[key]}
                        </Link>
                    ))}
                </nav>

                <div className="pn-actions">
                    <div className="pn-lang" role="group" aria-label={t.language}>
                        {LANGUAGES.map(code => (
                            <button
                                key={code}
                                type="button"
                                className={code === lang ? 'is-active' : ''}
                                aria-pressed={code === lang}
                                onClick={() => setLang(code)}
                            >
                                {code.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <Link to="/login" className={`pn-login ${onLogin ? 'is-current' : ''}`} aria-current={onLogin ? 'page' : undefined}>
                        {t.login}
                    </Link>
                    <Link to="/register" className={`pn-signup ${onSignup ? 'is-current' : ''}`} aria-current={onSignup ? 'page' : undefined}>
                        {t.signup}
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default PublicNav;

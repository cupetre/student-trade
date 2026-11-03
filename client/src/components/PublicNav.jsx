import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import { BRAND_NAMES } from '../lib/brand';
import { LANGUAGES, useLanguage } from '../lib/language';
import './PublicNav.css';

const COPY = {
    sl: {
        brand: BRAND_NAMES.sl, main: 'Glavni meni', menu: 'Meni', closeMenu: 'Zapri meni', home: `${BRAND_NAMES.sl}, na začetek`, language: 'Jezik',
        housing: 'Bivanje', market: 'Tržnica', settle: 'Udomači se', landlords: 'Za najemodajalce', partners: 'Partnerji',
        login: 'Prijava', signup: 'Registracija',
    },
    en: {
        brand: BRAND_NAMES.en, main: 'Main', menu: 'Menu', closeMenu: 'Close menu', home: `${BRAND_NAMES.en}, home`, language: 'Language',
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

    // Narrower screens: the section links move into a menu under the bar
    const [menuOpen, setMenuOpen] = useState(false);
    const barRef = useRef(null);
    useEffect(() => { setMenuOpen(false); }, [pathname]);
    useEffect(() => {
        if (!menuOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
        const onClick = (e) => { if (barRef.current && !barRef.current.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onClick);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onClick);
        };
    }, [menuOpen]);

    // On the landing page, section links just scroll (no new history entry).
    // From any other page they go to the landing page and it scrolls there.
    const handleSection = (e, hash) => {
        setMenuOpen(false);
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

    const sectionLinks = (where) => LINKS.map(([key, hash, tone]) => (
        <Link
            key={key}
            to={`/${hash}`}
            className={tone === 'quiet' ? 'is-quiet' : ''}
            onClick={(e) => handleSection(e, hash)}
            data-where={where}
        >
            {t[key]}
        </Link>
    ));

    const languageSwitch = (extraClass = '') => (
        <div className={`pn-lang ${extraClass}`} role="group" aria-label={t.language}>
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
    );

    return (
        <header className="pn" ref={barRef}>
            <div className="pn-inner">
                <Link to="/" className="pn-logo" aria-label={t.home} onClick={handleLogo}>
                    <Logo size={34} hideWordOnPhone name={t.brand} />
                </Link>

                {/* Wide screens: all links in the bar. The quieter two move into the menu first. */}
                <nav className="pn-links" aria-label={t.main}>
                    {sectionLinks('bar')}
                </nav>

                <div className="pn-actions">
                    {languageSwitch('pn-lang--bar')}
                    <Link to="/login" className={`pn-login ${onLogin ? 'is-current' : ''}`} aria-current={onLogin ? 'page' : undefined}>
                        {t.login}
                    </Link>
                    <Link to="/register" className={`pn-signup ${onSignup ? 'is-current' : ''}`} aria-current={onSignup ? 'page' : undefined}>
                        {t.signup}
                    </Link>
                    <button
                        type="button"
                        className="pn-menu-btn"
                        aria-expanded={menuOpen}
                        aria-controls="pn-menu"
                        aria-label={menuOpen ? t.closeMenu : t.menu}
                        onClick={() => setMenuOpen(open => !open)}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                        </svg>
                    </button>
                </div>
            </div>

            {menuOpen && (
                <nav id="pn-menu" className="pn-menu" aria-label={t.main}>
                    {sectionLinks('menu')}
                    {languageSwitch('pn-lang--menu')}
                </nav>
            )}
        </header>
    );
};

export default PublicNav;

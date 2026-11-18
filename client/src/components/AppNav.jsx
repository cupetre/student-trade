import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import Logo from './Logo.jsx';
import { useBrand } from '../lib/brand';
import { logout, isLoggedIn } from '../lib/auth';
import { LANGUAGES, useLanguage } from '../lib/language';
import { useT } from '../lib/i18n';
import { rememberReturn } from '../lib/returnTo';
import { resolveMediaUrl } from '../lib/media';
import { useCurrentUser, isLandlord } from '../lib/useCurrentUser';
import { useUnreadCount } from '../lib/unread';
import { STUDENT_HOME, LANDLORD_HOME } from './RouteGuards.jsx';
import './AppNav.css';

// The three platforms students can switch between
const PLATFORMS = [
    { key: 'market', to: '/marketplace', label: 'Marketplace' },
    { key: 'housing', to: '/housing', label: 'Housing' },
    { key: 'settle', to: '/settle-in', label: 'Settle In' },
];

function platformFor(pathname) {
    if (pathname.startsWith('/marketplace')) return 'market';
    if (pathname.startsWith('/housing')) return 'housing';
    if (pathname.startsWith('/settle-in')) return 'settle';
    return null;
}

const Icon = ({ name }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="appnav-icon">
        {name === 'chat' && <path d="M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-7l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />}
        {name === 'plus' && <path d="M12 5v14M5 12h14" />}
        {name === 'down' && <path d="M6 9l6 6 6-6" />}
    </svg>
);

/*
  Top bar for the app pages.
  - Students: Marketplace / Housing / Settle In switch.
  - Landlords: housing only, no switch.
  - Visitors without an account (on the pages they may browse): Marketplace /
    Housing, the language switch, Log in and Sign up.
  `action` replaces the default button on the right: { label, onClick } or { label, to }.
  By default Housing pages get "Post a place"; other pages get no button.
*/
const AppNav = ({ action }) => {
    const navigate = useNavigate();
    const { pathname, search } = useLocation();
    const { user } = useCurrentUser();
    const t = useT();
    const brand = useBrand();
    const [lang, setLang] = useLanguage();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const guest = !isLoggedIn();
    const unread = useUnreadCount();

    const landlord = isLandlord(user);
    const current = platformFor(pathname);

    // Close the account menu on outside click or Escape
    useEffect(() => {
        if (!menuOpen) return undefined;
        const onClick = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    // A new page closes the menu
    useEffect(() => { setMenuOpen(false); }, [pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const DEFAULT_BUTTONS = {
        housing: { label: t('Post a place'), to: '/housing/new' },
        market: { label: t('Sell an item'), to: '/marketplace/new' },
    };
    const button = guest ? null : (action || DEFAULT_BUTTONS[current] || null);
    const platforms = guest ? PLATFORMS.filter(p => !p.soon) : PLATFORMS;
    const here = pathname + search;

    const languageSwitch = (
        <div className="appnav-lang" role="group" aria-label={t('Language')}>
            {LANGUAGES.map(code => (
                <button key={code} type="button" className={lang === code ? 'is-active' : ''} aria-pressed={lang === code} onClick={() => setLang(code)}>
                    {code.toUpperCase()}
                </button>
            ))}
        </div>
    );

    return (
        <header className="appnav">
            <div className="appnav-inner">
                <Link to={guest ? '/' : landlord ? LANDLORD_HOME : STUDENT_HOME} className="appnav-logo" aria-label={t('{brand}, home', { brand })}>
                    <Logo size={32} hideWordOnPhone />
                </Link>

                {(guest || (user && !landlord)) && (
                    <nav className="appnav-switch" aria-label={t('Platforms')}>
                        {platforms.map(p => (
                            <NavLink
                                key={p.key}
                                to={p.to}
                                className={current === p.key ? 'is-active' : ''}
                                aria-current={current === p.key ? 'page' : undefined}
                            >
                                {t(p.label)}
                                {p.soon && <span className="appnav-soon">{t('Soon')}</span>}
                            </NavLink>
                        ))}
                    </nav>
                )}
                {landlord && <span className="appnav-badge">{t('Housing · for landlords')}</span>}

                {guest ? (
                    <div className="appnav-actions">
                        {languageSwitch}
                        <Link to="/login" state={{ from: here }} className="appnav-guestlink" onClick={() => rememberReturn(here)}>{t('Log in')}</Link>
                        <Link to="/register" className="appnav-btn appnav-btn--signup" onClick={() => rememberReturn(here)}>{t('Sign up')}</Link>
                    </div>
                ) : (
                    <div className="appnav-actions">
                        {button && (button.to
                            ? <Link to={button.to} className="appnav-btn"><Icon name="plus" />{button.label}</Link>
                            : <button type="button" className="appnav-btn" onClick={button.onClick}><Icon name="plus" />{button.label}</button>
                        )}

                        <NavLink to="/chatpage" className="appnav-iconlink" aria-label={unread > 0 ? t('Messages, {n} unread', { n: unread }) : t('Messages')} title={t('Messages')}>
                            <Icon name="chat" />
                            {unread > 0 && <span className="appnav-unread" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
                        </NavLink>

                        <div className="appnav-account" ref={menuRef}>
                            <button
                                type="button"
                                className="appnav-account-btn"
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                onClick={() => setMenuOpen(open => !open)}
                            >
                                <Avatar src={resolveMediaUrl(user?.profile_picture)} name={user?.fullname} size={32} />
                                <span className="appnav-account-name">{user?.fullname?.split(' ')[0] || t('Account')}</span>
                                <Icon name="down" />
                            </button>

                            {menuOpen && (
                                <div className="appnav-menu" role="menu">
                                    <div className="appnav-menu-head">
                                        <strong>{user?.fullname || t('Your account')}</strong>
                                        <span>{landlord ? t('Landlord account') : t('Student account')}</span>
                                    </div>
                                    <Link role="menuitem" to="/profilepage">{t('My profile')}</Link>
                                    {!landlord && <Link role="menuitem" to="/profile/student">{t('Rental profile')}</Link>}
                                    {user?.id && <Link role="menuitem" to={`/users/${user.id}`}>{t('How others see me')}</Link>}

                                    {!landlord && (
                                        <>
                                            <p className="appnav-menu-label">{t('Marketplace')}</p>
                                            <Link role="menuitem" to="/marketplace/mine">{t('My items')}</Link>
                                            <Link role="menuitem" to="/marketplace/liked">{t('Liked items')}</Link>
                                        </>
                                    )}

                                    <p className="appnav-menu-label">{t('Housing')}</p>
                                    {landlord && <Link role="menuitem" to="/housing">{t('Browse places')}</Link>}
                                    <Link role="menuitem" to="/housing/mine">{t('My listings')}</Link>
                                    {!landlord && <Link role="menuitem" to="/housing/saved">{t('Liked listings')}</Link>}
                                    {!landlord && <Link role="menuitem" to="/housing/stays">{t('My stays')}</Link>}

                                    <div className="appnav-menu-lang">
                                        <span>{t('Language')}</span>
                                        {languageSwitch}
                                    </div>

                                    <div className="appnav-menu-foot">
                                        <button type="button" role="menuitem" onClick={handleLogout}>{t('Log out')}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default AppNav;

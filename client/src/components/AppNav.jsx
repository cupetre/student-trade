import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import Logo from './Logo.jsx';
import { BRAND } from '../lib/brand';
import { logout } from '../lib/auth';
import { resolveMediaUrl } from '../lib/media';
import { useCurrentUser, isLandlord } from '../lib/useCurrentUser';
import { STUDENT_HOME, LANDLORD_HOME } from './RouteGuards.jsx';
import './AppNav.css';

// The three platforms students can switch between
const PLATFORMS = [
    { key: 'market', to: '/marketplace', label: 'Marketplace' },
    { key: 'housing', to: '/housing', label: 'Housing' },
    { key: 'settle', to: '/settle-in', label: 'Settle In', soon: true },
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
  Top bar for every logged-in page.
  - Students: Marketplace / Housing / Settle In switch.
  - Landlords: housing only, no switch.
  `action` replaces the default button on the right: { label, onClick } or { label, to }.
  By default Housing pages get "Post a place"; other pages get no button.
*/
const AppNav = ({ action }) => {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user } = useCurrentUser();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

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
        housing: { label: 'Post a place', to: '/housing/new' },
        market: { label: 'Sell an item', to: '/marketplace/new' },
    };
    const button = action || DEFAULT_BUTTONS[current] || null;

    return (
        <header className="appnav">
            <div className="appnav-inner">
                <Link to={landlord ? LANDLORD_HOME : STUDENT_HOME} className="appnav-logo" aria-label={`${BRAND}, home`}>
                    <Logo size={32} hideWordOnPhone />
                </Link>

                {user && !landlord && (
                    <nav className="appnav-switch" aria-label="Platforms">
                        {PLATFORMS.map(p => (
                            <NavLink
                                key={p.key}
                                to={p.to}
                                className={current === p.key ? 'is-active' : ''}
                                aria-current={current === p.key ? 'page' : undefined}
                            >
                                {p.label}
                                {p.soon && <span className="appnav-soon">Soon</span>}
                            </NavLink>
                        ))}
                    </nav>
                )}
                {landlord && <span className="appnav-badge">Housing · for landlords</span>}

                <div className="appnav-actions">
                    {button && (button.to
                        ? <Link to={button.to} className="appnav-btn"><Icon name="plus" />{button.label}</Link>
                        : <button type="button" className="appnav-btn" onClick={button.onClick}><Icon name="plus" />{button.label}</button>
                    )}

                    <NavLink to="/chatpage" className="appnav-iconlink" aria-label="Messages" title="Messages">
                        <Icon name="chat" />
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
                            <span className="appnav-account-name">{user?.fullname?.split(' ')[0] || 'Account'}</span>
                            <Icon name="down" />
                        </button>

                        {menuOpen && (
                            <div className="appnav-menu" role="menu">
                                <div className="appnav-menu-head">
                                    <strong>{user?.fullname || 'Your account'}</strong>
                                    <span>{landlord ? 'Landlord account' : 'Student account'}</span>
                                </div>
                                <Link role="menuitem" to="/profilepage">My profile</Link>
                                {!landlord && <Link role="menuitem" to="/profile/student">Rental profile</Link>}
                                {user?.id && <Link role="menuitem" to={`/users/${user.id}`}>How others see me</Link>}

                                {!landlord && (
                                    <>
                                        <p className="appnav-menu-label">Marketplace</p>
                                        <Link role="menuitem" to="/marketplace/mine">My items</Link>
                                    </>
                                )}

                                <p className="appnav-menu-label">Housing</p>
                                <Link role="menuitem" to="/housing/mine">My places</Link>
                                {!landlord && <Link role="menuitem" to="/housing/saved">Saved places</Link>}
                                {!landlord && <Link role="menuitem" to="/housing/stays">My stays</Link>}

                                <div className="appnav-menu-foot">
                                    <button type="button" role="menuitem" onClick={handleLogout}>Log out</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AppNav;

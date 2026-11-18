import React from 'react';
import { NavLink } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import { useT } from '../../lib/i18n';
import { useCurrentUser } from '../../lib/useCurrentUser';
import '../SettleInPage.css';

// The parts of Settle In. The ones without `to` aren't built yet: they show
// with a Soon tag and aren't links, so nobody lands on an empty page.
const TABS = [
    { to: '/settle-in', label: 'Start', end: true },
    { to: '/settle-in/guides', label: 'Guides' },
    { to: '/settle-in/cost', label: 'Cost of living' },
    { label: 'Deals' },
    { label: 'Community' },
    { label: 'My faculty' },
];

// Top bar + the Settle In tab row + the page
const SettleLayout = ({ children, wide = false }) => {
    const t = useT();
    const { user } = useCurrentUser();
    const admin = user?.role === 'admin';

    return (
        <div className="si-shell">
            <AppNav />
            <nav className="si-tabs" aria-label={t('Settle In')}>
                <div className="si-tabs-inner">
                    {TABS.map(tab => (tab.to ? (
                        <NavLink key={tab.label} to={tab.to} end={tab.end} className={({ isActive }) => `si-tab${isActive ? ' is-active' : ''}`}>
                            {t(tab.label)}
                        </NavLink>
                    ) : (
                        <span key={tab.label} className="si-tab si-tab--soon" aria-disabled="true">
                            {t(tab.label)} <span className="si-soon">{t('Soon')}</span>
                        </span>
                    )))}
                    {admin && (
                        <NavLink to="/settle-in/admin" className={({ isActive }) => `si-tab si-tab--admin${isActive ? ' is-active' : ''}`}>
                            {t('Editor')}
                        </NavLink>
                    )}
                </div>
            </nav>
            <main className={`si-page${wide ? ' si-page--wide' : ''}`}>{children}</main>
        </div>
    );
};

export default SettleLayout;

import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useCurrentUser, isLandlord } from '../lib/useCurrentUser';
import { isLoggedIn } from '../lib/auth';
import { useT } from '../lib/i18n';
import './AppFooter.css';

/*
  The footer under every logged-in page (added once in main.jsx, not per page).
  Same width as the pages (--page-max). Links follow the role: landlords only
  get Housing; students get all three platforms and their own shortcuts.
*/
const AppFooter = () => {
    const { user } = useCurrentUser();
    const t = useT();
    const guest = !isLoggedIn();
    const landlord = isLandlord(user);
    const year = new Date().getFullYear();

    return (
        <footer className="app-footer">
            <div className="app-footer-inner">
                <div className="app-footer-brand">
                    <Link to="/" className="app-footer-logo" aria-label={t('Home')}><Logo size={30} /></Link>
                    <p>{t('Housing, a marketplace and help with settling in, for students in Slovenia.')}</p>
                    <p className="app-footer-made">{t('Made by students in Koper, Slovenia.')}</p>
                </div>

                <nav className="app-footer-col" aria-label={t('Platforms')}>
                    <h2>{t('Platforms')}</h2>
                    <Link to="/housing">{t('Housing')}</Link>
                    {!landlord && <Link to="/marketplace">{t('Marketplace')}</Link>}
                    {!landlord && <Link to="/settle-in">{t('Settle In')}</Link>}
                </nav>

                {guest ? (
                    <nav className="app-footer-col" aria-label={t('Your account')}>
                        <h2>{t('Your account')}</h2>
                        <Link to="/register">{t('Sign up')}</Link>
                        <Link to="/login">{t('Log in')}</Link>
                        <Link to="/register/landlord">{t('For landlords')}</Link>
                    </nav>
                ) : (
                    <nav className="app-footer-col" aria-label={t('Your account')}>
                        <h2>{t('Your account')}</h2>
                        <Link to="/profilepage">{t('My profile')}</Link>
                        {!landlord && <Link to="/profile/student">{t('Rental profile')}</Link>}
                        <Link to="/chatpage">{t('Messages')}</Link>
                        <Link to="/housing/mine">{t('My listings')}</Link>
                        {!landlord && <Link to="/housing/saved">{t('Liked listings')}</Link>}
                        {!landlord && <Link to="/marketplace/mine">{t('My items')}</Link>}
                        {!landlord && <Link to="/marketplace/liked">{t('Liked items')}</Link>}
                    </nav>
                )}

                <div className="app-footer-col">
                    <h2>{t('Stay safe')}</h2>
                    <p>{t('Never pay before you’ve seen a place or an item. Keep the conversation in Anchor messages until you’ve met.')}</p>
                </div>
            </div>
            <div className="app-footer-bottom">
                <div className="app-footer-inner app-footer-inner--bottom">
                    <span>© {year} Anchor · Sidro</span>
                    <span className="app-footer-legal">
                        <Link to="/privacy">{t('Privacy policy')}</Link>
                        <Link to="/terms">{t('Terms of use')}</Link>
                    </span>
                    <span>{t('Verified students and checked landlords only.')}</span>
                </div>
            </div>
        </footer>
    );
};

export default AppFooter;

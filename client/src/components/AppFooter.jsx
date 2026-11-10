import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useCurrentUser, isLandlord } from '../lib/useCurrentUser';
import './AppFooter.css';

/*
  The footer under every logged-in page (added once in main.jsx, not per page).
  Same width as the pages (--page-max). Links follow the role: landlords only
  get Housing; students get all three platforms and their own shortcuts.
*/
const AppFooter = () => {
    const { user } = useCurrentUser();
    const landlord = isLandlord(user);
    const year = new Date().getFullYear();

    return (
        <footer className="app-footer">
            <div className="app-footer-inner">
                <div className="app-footer-brand">
                    <Link to="/" className="app-footer-logo" aria-label="Anchor home"><Logo size={30} /></Link>
                    <p>Housing, a marketplace and help with settling in, for students in Slovenia.</p>
                    <p className="app-footer-made">Made by students in Koper, Slovenia.</p>
                </div>

                <nav className="app-footer-col" aria-label="Platforms">
                    <h2>Platforms</h2>
                    <Link to="/housing">Housing</Link>
                    {!landlord && <Link to="/marketplace">Marketplace</Link>}
                    {!landlord && <Link to="/settle-in">Settle In <span className="app-footer-soon">Soon</span></Link>}
                </nav>

                <nav className="app-footer-col" aria-label="Your account">
                    <h2>Your account</h2>
                    <Link to="/profilepage">My profile</Link>
                    {!landlord && <Link to="/profile/student">Rental profile</Link>}
                    <Link to="/chatpage">Messages</Link>
                    <Link to="/housing/mine">My listings</Link>
                    {!landlord && <Link to="/housing/saved">Liked listings</Link>}
                    {!landlord && <Link to="/marketplace/mine">My items</Link>}
                </nav>

                <div className="app-footer-col">
                    <h2>Stay safe</h2>
                    <p>Never pay before you’ve seen a place or an item. Keep the conversation in Anchor messages until you’ve met.</p>
                </div>
            </div>
            <div className="app-footer-bottom">
                <div className="app-footer-inner app-footer-inner--bottom">
                    <span>© {year} Anchor · Sidro</span>
                    <span>Verified students and checked landlords only.</span>
                </div>
            </div>
        </footer>
    );
};

export default AppFooter;

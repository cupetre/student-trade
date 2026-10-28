import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../lib/auth';
import './AppNav.css';

// Top bar for the newer pages (housing). Links to every main area of the app.
const AppNav = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="appnav">
            <div className="appnav-inner">
                <NavLink to="/" className="appnav-logo">Student Trade</NavLink>
                <nav className="appnav-links" aria-label="Main">
                    <NavLink to="/" end>Marketplace</NavLink>
                    <NavLink to="/housing">Housing</NavLink>
                    <NavLink to="/chatpage">Messages</NavLink>
                    <NavLink to="/profilepage">Profile</NavLink>
                    <button type="button" onClick={handleLogout}>Log out</button>
                </nav>
            </div>
        </header>
    );
};

export default AppNav;

import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import PublicNav from './PublicNav.jsx';
import SideArt from './SideArt.jsx';
import { useLanguage } from '../lib/language';
import { authCopy } from '../Pages/authCopy';
import housingImg from '../assets/landing/housing.svg';
import marketImg from '../assets/landing/market.svg';
import settleImg from '../assets/landing/settle.svg';
import '../Pages/AuthPages.css';

const ArrowLeft = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="auth-arrow"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
);
const ArrowRight = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="auth-arrow"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const Check = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="auth-check"><path d="M5 12l4 4 10-10" /></svg>
);

/*
  The frame around log in, sign up and email confirmation: the same top bar as the
  landing page, a way back home, and (on the two sign-up pages) a Student / Landlord
  switch plus a side panel that links to that side's explainer on the landing page.
  The student panel sits on the left and the landlord panel on the right, like on the landing page.
*/
const AuthShell = ({ children, aside, roleTabs = false, center = false }) => {
    const [lang] = useLanguage();
    const t = authCopy[lang];

    return (
        <div className="auth-page">
            <PublicNav />
            {/* The three landing-page scenes (room, desk, map), faded and blended into one quiet background */}
            <div className="auth-backdrop" aria-hidden="true">
                <img src={housingImg} alt="" />
                <img src={marketImg} alt="" />
                <img src={settleImg} alt="" />
            </div>
            <main className="auth-main">
                <Link to="/" className="auth-back"><ArrowLeft />{t.backHome}</Link>

                <div className={`auth-layout ${aside ? `auth-layout--split auth-layout--${aside.kind}` : ''}`}>
                    <div className={`auth-card ${center ? 'auth-card--center' : ''}`}>
                        {roleTabs && (
                            <nav className="auth-roles" aria-label={t.rolesLabel}>
                                <NavLink to="/register" end>{t.roleStudent}</NavLink>
                                <NavLink to="/register/landlord">{t.roleLandlord}</NavLink>
                            </nav>
                        )}
                        {children}
                    </div>

                    {aside && (
                        <aside className="auth-aside">
                            <SideArt kind={aside.kind} className="auth-aside-art" />
                            <h2>{aside.title}</h2>
                            <ul>
                                {aside.points.map(point => <li key={point}><Check />{point}</li>)}
                            </ul>
                            <Link to={aside.href} className="auth-aside-more">
                                {aside.kind === 'student' && <ArrowLeft />}
                                {aside.more}
                                {aside.kind === 'landlord' && <ArrowRight />}
                            </Link>
                        </aside>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AuthShell;

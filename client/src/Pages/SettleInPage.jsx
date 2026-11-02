import React from 'react';
import { Link } from 'react-router-dom';
import AppNav from '../components/AppNav.jsx';
import './SettleInPage.css';

// Settle In isn't built yet. This page says what's coming, so the switch in
// the top bar leads somewhere honest instead of a dead link.
const COMING = [
    { title: 'Student deals & discounts', text: 'Offers from local shops, apps and services, only for verified students.' },
    { title: 'Documents & residence', text: 'Address registration, residence permit and health insurance, step by step.' },
    { title: 'Bank, SIM & transport', text: 'What to set up in your first week, and which student options exist.' },
    { title: 'Guide to Slovenia', text: 'A first-month checklist for international students, city by city.' },
    { title: 'Community & events', text: 'Groups for your university and city, from student organisations and Erasmus groups.' },
];

const SettleInPage = () => (
    <div className="si-shell">
        <AppNav />
        <main className="si-page">
            <p className="si-eyebrow">Settle In · coming soon</p>
            <h1>Everything else you need for your first months here</h1>
            <p className="si-lede">
                We're building this part next. Until then, Housing and the Marketplace are open, and you can
                message anyone from a listing.
            </p>

            <ul className="si-list">
                {COMING.map(item => (
                    <li key={item.title}>
                        <div>
                            <strong>{item.title}</strong>
                            <span>{item.text}</span>
                        </div>
                        <span className="si-soon">Soon</span>
                    </li>
                ))}
            </ul>

            <div className="si-actions">
                <Link to="/housing" className="si-btn">Find a place</Link>
                <Link to="/marketplace" className="si-btn si-btn--quiet">Browse the marketplace</Link>
            </div>
        </main>
    </div>
);

export default SettleInPage;

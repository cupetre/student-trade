import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BRAND, brandFor } from '../lib/brand';
import { useLanguage } from '../lib/language';

// Browser tab titles for every page, in one place: "Prijava · Sidro" / "Log in · Anchor".
// Public pages follow the SL/EN switch; logged-in pages are English (Anchor).
const PUBLIC_TITLES = [
    ['/login', { sl: 'Prijava', en: 'Log in' }],
    ['/register/landlord', { sl: 'Registracija za najemodajalce', en: 'Landlord sign up' }],
    ['/register', { sl: 'Registracija', en: 'Sign up' }],
    ['/verify-pending', { sl: 'Potrdite e-naslov', en: 'Confirm your email' }],
    ['/verify-email', { sl: 'Potrdite e-naslov', en: 'Confirm your email' }],
    ['/forgot-password', { sl: 'Pozabljeno geslo', en: 'Forgot password' }],
    ['/reset-password', { sl: 'Novo geslo', en: 'New password' }],
];

const APP_TITLES = [
    ['/marketplace/new', 'Sell an item'],
    ['/marketplace/mine', 'My items'],
    ['/marketplace', 'Marketplace'],
    ['/housing', 'Housing'],
    ['/settle-in', 'Settle In'],
    ['/chatpage', 'Messages'],
    ['/profilepage', 'My profile'],
    ['/profile/student', 'Rental profile'],
    ['/users/', 'Profile'],
];

const RouteTitle = () => {
    const { pathname } = useLocation();
    const [lang] = useLanguage();
    useEffect(() => {
        const publicMatch = PUBLIC_TITLES.find(([prefix]) => pathname.startsWith(prefix));
        if (publicMatch || pathname === '/') {
            const name = brandFor(lang);
            document.title = publicMatch ? `${publicMatch[1][lang] || publicMatch[1].sl} · ${name}` : name;
            return;
        }
        const match = APP_TITLES.find(([prefix]) => pathname.startsWith(prefix));
        document.title = match ? `${match[1]} · ${BRAND}` : BRAND;
    }, [pathname, lang]);
    return null;
};

export default RouteTitle;

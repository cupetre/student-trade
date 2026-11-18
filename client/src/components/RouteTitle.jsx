import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { brandFor } from '../lib/brand';
import { useLanguage } from '../lib/language';
import { translate } from '../lib/i18n';

// Browser tab titles for every page, in one place: "Prijava · Sidro" / "Log in · Anchor".
// Every page follows the SL/EN switch (app titles are translated through lib/sl.js).
const PUBLIC_TITLES = [
    ['/login', { sl: 'Prijava', en: 'Log in' }],
    ['/register/landlord', { sl: 'Registracija za najemodajalce', en: 'Landlord sign up' }],
    ['/register', { sl: 'Registracija', en: 'Sign up' }],
    ['/verify-pending', { sl: 'Potrdite e-naslov', en: 'Confirm your email' }],
    ['/verify-email', { sl: 'Potrdite e-naslov', en: 'Confirm your email' }],
    ['/forgot-password', { sl: 'Pozabljeno geslo', en: 'Forgot password' }],
    ['/reset-password', { sl: 'Novo geslo', en: 'New password' }],
    ['/privacy', { sl: 'Pravilnik o zasebnosti', en: 'Privacy policy' }],
    ['/terms', { sl: 'Pogoji uporabe', en: 'Terms of use' }],
];

const APP_TITLES = [
    ['/marketplace/new', 'Sell an item'],
    ['/marketplace/mine', 'My items'],
    ['/marketplace/liked', 'Liked items'],
    ['/marketplace', 'Marketplace'],
    ['/housing', 'Housing'],
    ['/settle-in/guides', 'Guides'],
    ['/settle-in/cost', 'Cost of living'],
    ['/settle-in/admin', 'Editor'],
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
        const brand = brandFor(lang);
        document.title = match ? `${translate(lang, match[1])} · ${brand}` : brand;
    }, [pathname, lang]);
    return null;
};

export default RouteTitle;

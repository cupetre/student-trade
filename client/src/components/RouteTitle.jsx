import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BRAND } from '../lib/brand';

// Browser tab titles for every page, in one place: "Log in · Kampus"
const TITLES = [
    ['/login', 'Log in'],
    ['/register/landlord', 'Landlord sign up'],
    ['/register', 'Sign up'],
    ['/verify-pending', 'Confirm your email'],
    ['/verify-email', 'Confirm your email'],
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
    useEffect(() => {
        const match = TITLES.find(([prefix]) => pathname.startsWith(prefix));
        document.title = match ? `${match[1]} · ${BRAND}` : BRAND;
    }, [pathname]);
    return null;
};

export default RouteTitle;

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../lib/auth';
import { useCurrentUser, isLandlord } from '../lib/useCurrentUser';

// Where each kind of account starts after logging in
export const STUDENT_HOME = '/marketplace';
export const LANDLORD_HOME = '/housing/mine';

// Pages that need an account. Logged-out visitors are sent to the login page.
export function RequireAuth({ children }) {
    const location = useLocation();
    if (!isLoggedIn()) {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    }
    return children;
}

// Student areas (marketplace, Settle In, saved places, stays).
// Landlord accounts only use housing, so they go to their listings instead.
export function StudentOnly({ children }) {
    const { user, loading } = useCurrentUser();
    if (loading) return null;
    if (isLandlord(user)) return <Navigate to={LANDLORD_HOME} replace />;
    return children;
}

// Login and register. Someone who is already logged in goes straight to the app.
export function PublicOnly({ children }) {
    if (isLoggedIn()) {
        return <Navigate to="/" replace />;
    }
    return children;
}

// "/" is the landing page for visitors. Logged-in users go to the marketplace
// (and StudentOnly sends landlords on to their housing listings).
export function HomeSwitch({ landing }) {
    return isLoggedIn() ? <Navigate to={STUDENT_HOME} replace /> : landing;
}

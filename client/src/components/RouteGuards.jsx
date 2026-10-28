import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../lib/auth';

// Pages that need an account. Logged-out visitors are sent to the login page.
export function RequireAuth({ children }) {
    const location = useLocation();
    if (!isLoggedIn()) {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    }
    return children;
}

// Login and register. Someone who is already logged in goes straight to the app.
export function PublicOnly({ children }) {
    if (isLoggedIn()) {
        return <Navigate to="/" replace />;
    }
    return children;
}

// "/" shows the marketplace to logged-in users and the landing page to everyone else
export function HomeSwitch({ app, landing }) {
    return isLoggedIn() ? app : landing;
}

import { useEffect, useState } from 'react';
import { apiRequest } from './api';
import { getValidToken } from './auth';

// The profile is loaded once per login and shared: the navbar, the route
// guards and the page itself all ask for it, but only one request goes out.
// The cache is tied to the token, so logging in as someone else starts fresh.
let cache = { token: null, promise: null, result: null };

function loadCurrentUser() {
    const token = getValidToken();
    if (!token) return Promise.resolve({ ok: false, data: { error: 'Not logged in.' } });

    if (cache.token !== token) {
        const entry = { token, promise: null, result: null };
        entry.promise = apiRequest('/api/users/fetch_profile').then((result) => {
            if (cache === entry) {
                if (result.ok) entry.result = result;
                else cache = { token: null, promise: null, result: null }; // failed: try again next time
            }
            return result;
        });
        cache = entry;
    }
    return cache.promise;
}

function toState({ ok, data }) {
    return ok ? { user: data, loading: false, error: '' } : { user: null, loading: false, error: data.error };
}

// Call after the user changes their own name or photo, so the navbar picks it up
export function refreshCurrentUser() {
    cache = { token: null, promise: null, result: null };
}

// The logged-in user's profile (id, fullname, role, landlord_status...).
// Pages use it to decide what to show: "is this my listing?", "can I post rentals?"
export function useCurrentUser() {
    const [state, setState] = useState(() => {
        const ready = cache.result && cache.token === getValidToken();
        return ready ? toState(cache.result) : { user: null, loading: true, error: '' };
    });

    useEffect(() => {
        let cancelled = false;
        loadCurrentUser().then((result) => {
            if (!cancelled) setState(toState(result));
        });
        return () => { cancelled = true; };
    }, []);

    return state;
}

export function isLandlord(user) {
    return user?.role === 'landlord';
}

// Which listing types this user may post (mirrors postingProblem() on the server)
export function allowedListingTypes(user) {
    if (!user) return [];
    if (user.role === 'admin') return ['rental', 'sublet', 'roommate'];
    if (user.role === 'landlord') return user.landlord_status === 'approved' ? ['rental'] : [];
    return ['sublet', 'roommate'];
}

import { useEffect, useState } from 'react';
import { apiRequest } from './api';
import { getValidToken } from './auth';

// The profile is loaded once per login and shared: the navbar, the route
// guards and the page itself all ask for it, but only one request goes out.
// The cache is tied to the token, so logging in as someone else starts fresh.
let cache = { token: null, promise: null, result: null };

// Every mounted useCurrentUser (the top bar, the page...) listens here, so a
// new name or photo shows everywhere at once, without reloading the page.
const listeners = new Set();
function notify() { listeners.forEach(listener => listener()); }

function loadCurrentUser() {
    const token = getValidToken();
    if (!token) return Promise.resolve({ ok: false, data: { error: 'Not logged in.' } });
    if (cache.token === token && cache.result) return Promise.resolve(cache.result);

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

// Call after the user changes their own name, photo or bio: loads the profile
// again and updates everything that shows it (e.g. the top bar).
export function refreshCurrentUser() {
    cache = { token: null, promise: null, result: null };
    return loadCurrentUser().then(notify);
}

// Show a change right away (e.g. the new photo), then confirm it with the server
export function updateCurrentUser(changes) {
    if (cache.result && cache.result.ok) {
        cache.result = { ...cache.result, data: { ...cache.result.data, ...changes } };
        notify();
    }
    return refreshCurrentUser();
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
        const load = () => loadCurrentUser().then((result) => {
            if (!cancelled) setState(toState(result));
        });
        load();
        listeners.add(load);
        return () => { cancelled = true; listeners.delete(load); };
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

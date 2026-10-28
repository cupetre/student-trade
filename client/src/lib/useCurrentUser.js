import { useEffect, useState } from 'react';
import { apiRequest } from './api';

// Loads the logged-in user's profile once (id, fullname, role, landlord_status...).
// Pages use it to decide what to show: "is this my listing?", "can I post rentals?"
export function useCurrentUser() {
    const [state, setState] = useState({ user: null, loading: true, error: '' });

    useEffect(() => {
        let cancelled = false;
        apiRequest('/api/users/fetch_profile').then(({ ok, data }) => {
            if (cancelled) return;
            setState(ok ? { user: data, loading: false, error: '' } : { user: null, loading: false, error: data.error });
        });
        return () => { cancelled = true; };
    }, []);

    return state;
}

// Which listing types this user may post (mirrors postingProblem() on the server)
export function allowedListingTypes(user) {
    if (!user) return [];
    if (user.role === 'admin') return ['rental', 'sublet', 'roommate'];
    if (user.role === 'landlord') return user.landlord_status === 'approved' ? ['rental'] : [];
    return ['sublet', 'roommate'];
}

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCurrentUser, isLandlord } from '../../lib/useCurrentUser';

// "My listings · Liked listings" at the top right of the housing pages.
// The one you're on is shown in blue. Landlords don't like places, so they only get My listings.
const HousingLinks = () => {
    const { user } = useCurrentUser();
    const landlord = isLandlord(user);

    return (
        <nav className="hs-quicklinks" aria-label="Your housing">
            <NavLink to="/housing/mine">My listings</NavLink>
            {!landlord && <NavLink to="/housing/saved">Liked listings</NavLink>}
        </nav>
    );
};

export default HousingLinks;

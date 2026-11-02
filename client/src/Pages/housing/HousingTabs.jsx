import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCurrentUser, isLandlord } from '../../lib/useCurrentUser';

// Sub-navigation shared by the housing pages. "Post a place" lives in the top bar.
// Landlords don't save places or live in them, so they only get Browse and My listings.
const HousingTabs = () => {
    const { user } = useCurrentUser();
    const landlord = isLandlord(user);

    return (
        <div className="hs-tabs">
            <nav aria-label="Housing">
                <NavLink to="/housing" end>Browse</NavLink>
                {!landlord && <NavLink to="/housing/saved">Saved</NavLink>}
                <NavLink to="/housing/mine">My listings</NavLink>
                {!landlord && <NavLink to="/housing/stays">My stays</NavLink>}
            </nav>
        </div>
    );
};

export default HousingTabs;

import React from 'react';
import { NavLink, Link } from 'react-router-dom';

// Sub-navigation shared by the housing pages
const HousingTabs = () => (
    <div className="hs-tabs">
        <nav aria-label="Housing">
            <NavLink to="/housing" end>Browse</NavLink>
            <NavLink to="/housing/saved">Saved</NavLink>
            <NavLink to="/housing/mine">My listings</NavLink>
            <NavLink to="/housing/stays">My stays</NavLink>
        </nav>
        <Link to="/housing/new" className="hs-btn">Post a place</Link>
    </div>
);

export default HousingTabs;

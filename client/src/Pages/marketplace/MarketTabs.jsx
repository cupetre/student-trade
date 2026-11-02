import React from 'react';
import { NavLink } from 'react-router-dom';

// Sub-navigation shared by the marketplace pages, like HousingTabs.
// "Sell an item" lives in the top bar.
const MarketTabs = () => (
    <div className="hs-tabs">
        <nav aria-label="Marketplace">
            <NavLink to="/marketplace" end>Browse</NavLink>
            <NavLink to="/marketplace/mine">My items</NavLink>
        </nav>
    </div>
);

export default MarketTabs;

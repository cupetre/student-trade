import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_URL, TILE_ATTRIBUTION } from '../lib/mapConfig';
import './LocationPicker.css';

const pinIcon = L.divIcon({
    className: 'loc-pin',
    html: '<span class="loc-pin-head"></span>',
    iconSize: [30, 40],
    iconAnchor: [15, 38],
});

// How big the "somewhere in here" circle is. The server moves the public point
// 80–200 m from the real one, so 300 m always contains the place.
const AREA_RADIUS_M = 300;

/*
  The map in the Location tab of a listing.
  Everyone else sees a shaded circle around the approximate spot; the owner
  (who gets exact_location from the server) sees their own pin.
*/
const ListingMap = ({ location, exactLocation }) => {
    const mapEl = useRef(null);

    useEffect(() => {
        const exact = exactLocation && exactLocation.latitude !== null && exactLocation.latitude !== undefined;
        const point = exact ? [exactLocation.latitude, exactLocation.longitude] : [location.latitude, location.longitude];

        const map = L.map(mapEl.current, {
            scrollWheelZoom: false, // scrolling the page shouldn't zoom the map
            minZoom: 7,
            maxBounds: [[44.9, 12.8], [47.4, 17.2]],
        }).setView(point, exact ? 16 : 15);
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

        if (exact) {
            L.marker(point, { icon: pinIcon, keyboard: false }).addTo(map);
        } else {
            L.circle(point, {
                radius: AREA_RADIUS_M,
                color: '#3C6E91',
                weight: 2,
                fillColor: '#3C6E91',
                fillOpacity: 0.16,
            }).addTo(map);
        }

        const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
        observer.observe(mapEl.current);
        return () => { observer.disconnect(); map.remove(); };
    }, [location, exactLocation]);

    return <div ref={mapEl} className="hs-listing-map" role="region" aria-label="Map of the area" />;
};

export default ListingMap;

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_URL, TILE_ATTRIBUTION, SLOVENIA_VIEW, SLOVENIA_BOUNDS, cityCentre } from '../lib/mapConfig';
import { formatEuro } from '../lib/housingOptions';
import './LocationPicker.css';

// Code-made moves jump instead of animating: Leaflet crashes if the page
// closes in the middle of a zoom animation
const JUMP = { animate: false };

function priceIcon(listing, active) {
    return L.divIcon({
        className: `hs-map-price${active ? ' is-active' : ''}`,
        html: `<span>${formatEuro(listing.rent_per_person) || '€–'}</span>`,
        iconSize: null,
        iconAnchor: [0, 0],
    });
}

/*
  The small map on the housing browse page.
  - Each listing is a price tag at its approximate spot (never the exact address:
    the server only sends a point moved 80–200 m).
  - Choosing a city in the filters moves the map to that city; otherwise it
    fits the listings on the page, or shows all of Slovenia.
  - Hovering a card lights up its tag; clicking a tag opens the listing.
*/
const HousingBrowseMap = ({ listings, city, activeId, onOpen }) => {
    const mapEl = useRef(null);
    const mapRef = useRef(null);
    const layerRef = useRef(null);
    const markersRef = useRef(new Map());
    const onOpenRef = useRef(onOpen);
    useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);

    // Create the map once
    useEffect(() => {
        const map = L.map(mapEl.current, {
            scrollWheelZoom: false,
            maxBounds: [[44.9, 12.8], [47.4, 17.2]],
            minZoom: 7,
        }).setView(SLOVENIA_VIEW.center, SLOVENIA_VIEW.zoom);
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;

        // The side column changes width with the window; keep the tiles filling it
        const observer = new ResizeObserver(() => map.invalidateSize(JUMP));
        observer.observe(mapEl.current);

        const markers = markersRef.current;
        return () => {
            observer.disconnect();
            map.remove();
            mapRef.current = null;
            layerRef.current = null;
            markers.clear();
        };
    }, []);

    // Price tags for the listings on this page
    useEffect(() => {
        const layer = layerRef.current;
        if (!layer) return;
        layer.clearLayers();
        markersRef.current.clear();
        listings.forEach((listing) => {
            const point = listing.location;
            if (!point || point.latitude === null || point.latitude === undefined) return;
            const marker = L.marker([point.latitude, point.longitude], {
                icon: priceIcon(listing, false),
                title: listing.title,
                keyboard: true,
                riseOnHover: true,
            });
            marker.on('click', () => onOpenRef.current?.(listing.id));
            marker.addTo(layer);
            markersRef.current.set(listing.id, { marker, listing });
        });
    }, [listings]);

    // Where to look: the chosen city, else the listings, else Slovenia
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const centre = cityCentre(city);
        if (centre) { map.setView(centre, 13, JUMP); return; }
        const points = [...markersRef.current.values()].map(({ marker }) => marker.getLatLng());
        if (points.length === 1) map.setView(points[0], 14, JUMP);
        else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { ...JUMP, paddingTopLeft: [56, 40], paddingBottomRight: [28, 24], maxZoom: 14 });
        else map.fitBounds(SLOVENIA_BOUNDS, JUMP);
    }, [city, listings]);

    // Light up the tag of the card under the mouse
    useEffect(() => {
        markersRef.current.forEach(({ marker, listing }, id) => {
            const active = id === activeId;
            marker.setIcon(priceIcon(listing, active));
            marker.setZIndexOffset(active ? 1000 : 0);
        });
    }, [activeId, listings]);

    return (
        <div className="hs-map">
            <div ref={mapEl} className="hs-map-canvas" role="region" aria-label="Map of the places on this page" />
        </div>
    );
};

export default HousingBrowseMap;

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_URL, TILE_ATTRIBUTION, SLOVENIA_VIEW, cityCentre } from '../lib/mapConfig';
import './LocationPicker.css';

const pinIcon = L.divIcon({
    className: 'loc-pin',
    html: '<span class="loc-pin-head"></span>',
    iconSize: [30, 40],
    iconAnchor: [15, 38],
});

const inSlovenia = (lat, lng) => lat >= 45.40 && lat <= 46.90 && lng >= 13.35 && lng <= 16.65;
const round6 = (n) => Math.round(n * 1e6) / 1e6;
const JUMP = { animate: false }; // Leaflet crashes if the page closes mid-animation

/*
  "Where can people pick it up?" in the sell form. Simpler than the housing
  picker: no address lookup, the seller clicks roughly where it is (the map
  starts on the chosen city) and can drag the pin. Buyers only ever see a
  circle around a point moved 80-200 m from it.
  value: { latitude, longitude } or null.
*/
const AreaPicker = ({ city, value, onChange }) => {
    const mapEl = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    // Create the map once
    useEffect(() => {
        const map = L.map(mapEl.current, { scrollWheelZoom: false, minZoom: 7, maxBounds: [[44.9, 12.8], [47.4, 17.2]] })
            .setView(SLOVENIA_VIEW.center, SLOVENIA_VIEW.zoom);
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
        map.on('click', (e) => {
            if (!inSlovenia(e.latlng.lat, e.latlng.lng)) return;
            onChangeRef.current({ latitude: round6(e.latlng.lat), longitude: round6(e.latlng.lng) });
        });
        mapRef.current = map;
        const observer = new ResizeObserver(() => map.invalidateSize(JUMP));
        observer.observe(mapEl.current);
        return () => { observer.disconnect(); map.remove(); mapRef.current = null; markerRef.current = null; };
    }, []);

    // The pin follows `value`
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (!value) {
            if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
            return;
        }
        const position = [value.latitude, value.longitude];
        if (!markerRef.current) {
            markerRef.current = L.marker(position, { icon: pinIcon, draggable: true, keyboard: false, title: 'Drag to move the pin' }).addTo(map);
            markerRef.current.on('dragend', () => {
                const p = markerRef.current.getLatLng();
                if (inSlovenia(p.lat, p.lng)) onChangeRef.current({ latitude: round6(p.lat), longitude: round6(p.lng) });
            });
            map.setView(position, Math.max(map.getZoom(), 15), JUMP);
        } else {
            markerRef.current.setLatLng(position);
        }
    }, [value]);

    // Choosing a city moves the map there (only while there's no pin yet)
    useEffect(() => {
        const map = mapRef.current;
        const centre = cityCentre(city);
        if (map && centre && !markerRef.current) map.setView(centre, 13, JUMP);
    }, [city]);

    return (
        <div className="mk-area">
            <div ref={mapEl} className="mk-area-map" role="region" aria-label="Map: click where people can pick it up" />
            <div className="mk-area-foot">
                <p className="hs-hint">
                    {value
                        ? 'Pin placed. Buyers see a circle around the area, never the exact spot.'
                        : 'Click roughly where people can pick it up. Optional.'}
                </p>
                {value && <button type="button" className="hs-link-btn" onClick={() => onChange(null)}>Remove pin</button>}
            </div>
        </div>
    );
};

export default AreaPicker;

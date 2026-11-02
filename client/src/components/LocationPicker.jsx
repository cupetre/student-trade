import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiRequest } from '../lib/api';
import { TILE_URL, TILE_ATTRIBUTION, SLOVENIA_VIEW, SLOVENIA_BOUNDS, cityCentre } from '../lib/mapConfig';
import './LocationPicker.css';

// Our own pin (Leaflet's default marker images don't survive the Vite build)
const pinIcon = L.divIcon({
    className: 'loc-pin',
    html: '<span class="loc-pin-head"></span>',
    iconSize: [30, 40],
    iconAnchor: [15, 38],
});

const inSlovenia = (lat, lng) => lat >= 45.40 && lat <= 46.90 && lng >= 13.35 && lng <= 16.65;
const round6 = (n) => Math.round(n * 1e6) / 1e6;

// Moves made by the code jump instead of animating: Leaflet crashes if the page
// closes in the middle of a zoom animation
const JUMP = { animate: false };

/*
  "Where is it?" in the housing form: finds the address on the map and lets the
  owner drag the pin to the right building (or click the map to place it).
  value: { latitude, longitude, source: 'pin' | 'address' } or null.
  The parent can call ref.findIfEmpty() when the address fields lose focus.
*/
const LocationPicker = forwardRef(({ street, city, postalCode, value, onChange, error }, ref) => {
    const mapEl = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    const [status, setStatus] = useState({ tone: '', text: '' });
    const [finding, setFinding] = useState(false);
    const triedRef = useRef(''); // the last address looked up automatically

    const canFind = street.trim().length >= 3 && city.trim().length >= 2;
    const addressKey = `${street.trim().toLowerCase()}|${postalCode.trim()}|${city.trim().toLowerCase()}`;

    const place = useCallback((lat, lng, source) => {
        if (!inSlovenia(lat, lng)) {
            setStatus({ tone: 'error', text: 'The pin has to be in Slovenia.' });
            return;
        }
        onChangeRef.current({ latitude: round6(lat), longitude: round6(lng), source });
    }, []);

    // Create the map once
    useEffect(() => {
        const map = L.map(mapEl.current, {
            scrollWheelZoom: false, // so scrolling the form doesn't zoom the map
            maxBounds: [[44.9, 12.8], [47.4, 17.2]],
            minZoom: 7,
        }).setView(SLOVENIA_VIEW.center, SLOVENIA_VIEW.zoom); // a map needs a view before anything else

        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
        map.on('click', (e) => {
            place(e.latlng.lat, e.latlng.lng, 'pin');
            setStatus({ tone: 'ok', text: 'Pin placed. Drag it if it’s not quite right.' });
        });
        mapRef.current = map;
        return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    }, [place]);

    // Keep the pin and the view in step with the value
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (!value) {
            if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
            const centre = cityCentre(city);
            if (centre) map.setView(centre, 13, JUMP);
            else map.fitBounds(SLOVENIA_BOUNDS, JUMP);
            return;
        }
        const position = [value.latitude, value.longitude];
        if (!markerRef.current) {
            markerRef.current = L.marker(position, { icon: pinIcon, draggable: true, keyboard: false, title: 'Drag to move the pin' }).addTo(map);
            markerRef.current.on('dragend', () => {
                const p = markerRef.current.getLatLng();
                place(p.lat, p.lng, 'pin');
                setStatus({ tone: 'ok', text: 'Pin moved.' });
            });
        } else {
            markerRef.current.setLatLng(position);
        }
        if (!map.getBounds().pad(-0.15).contains(position)) map.setView(position, Math.max(map.getZoom(), 16), JUMP);
    }, [value, city, place]);

    const find = useCallback(async ({ auto = false } = {}) => {
        if (!canFind || finding) return;
        setFinding(true);
        setStatus({ tone: '', text: 'Looking up the address…' });
        const params = new URLSearchParams({ street: street.trim(), city: city.trim(), postal_code: postalCode.trim() });
        const { ok, data } = await apiRequest(`/api/housing/geocode?${params}`);
        setFinding(false);
        if (!ok) {
            setStatus({ tone: auto ? '' : 'error', text: auto ? 'Click the map to place the pin.' : data.error });
            return;
        }
        place(data.latitude, data.longitude, 'address');
        mapRef.current?.setView([data.latitude, data.longitude], 17, JUMP);
        setStatus({ tone: 'ok', text: 'Found it. Check the pin is on the right building and drag it if not.' });
    }, [canFind, finding, street, city, postalCode, place]);

    useImperativeHandle(ref, () => ({
        // Once per address, only while there's no pin yet
        findIfEmpty() {
            if (value || !canFind || triedRef.current === addressKey) return;
            triedRef.current = addressKey;
            find({ auto: true });
        },
    }), [value, canFind, addressKey, find]);

    const pinCentre = () => {
        const c = mapRef.current?.getCenter();
        if (!c) return;
        place(c.lat, c.lng, 'pin');
        setStatus({ tone: 'ok', text: 'Pin placed in the middle of the map.' });
    };

    return (
        <div className={`loc ${error ? 'has-error' : ''}`} role="group" aria-labelledby="loc-title" aria-describedby="loc-hint">
            <p className="loc-title" id="loc-title">Where is it on the map? <span className="hs-optional">(recommended)</span></p>
            <p className="hs-hint" id="loc-hint">
                Students see an area of about 200 m around the pin, not the exact building. The street is shown on the listing as before.
            </p>

            <div className="loc-actions">
                <button type="button" className="hs-btn hs-btn--small" onClick={() => find()} disabled={!canFind || finding}>
                    {finding ? 'Looking…' : value ? 'Find the address again' : 'Find the address on the map'}
                </button>
                <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" onClick={pinCentre}>Pin the middle of the map</button>
                {value && (
                    <button type="button" className="hs-link-btn" onClick={() => { onChangeRef.current(null); setStatus({ tone: '', text: 'Pin removed.' }); }}>
                        Remove pin
                    </button>
                )}
            </div>
            {!canFind && !value && <p className="hs-hint loc-note">Fill in the street and city above, then find it on the map, or click the map yourself.</p>}

            <div className="loc-map" ref={mapEl} aria-label="Map. Use the arrow keys to move it, + and − to zoom." />

            <p className={`loc-status loc-status--${status.tone || 'plain'}`} role="status">
                {status.text || (value
                    ? 'Drag the pin to the right building, or click the map to move it.'
                    : 'No pin yet. If you skip this, we place it from the address when you save.')}
            </p>
            {error && <p className="hs-field-error" role="alert">{error}</p>}
        </div>
    );
});

LocationPicker.displayName = 'LocationPicker';

export default LocationPicker;

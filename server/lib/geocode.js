// Turns an address into map coordinates ("geocoding").
//
// Uses Nominatim, OpenStreetMap's free geocoder, by default. Its rules:
// at most one request per second for the whole app, a User-Agent that names
// the app, and no heavy use. So requests here go one at a time with a pause in
// between, answers are cached, and it's only called when a place is saved or
// the owner presses "Find on the map" - never while someone types.
//
// To switch to a paid provider later, point GEOCODER_URL at a
// Nominatim-compatible service (e.g. a self-hosted Nominatim) or replace
// lookup() below.
//
// Settings (.env): GEOCODER_URL, GEOCODER_EMAIL, GEOCODER_USER_AGENT

const DEFAULT_URL = 'https://nominatim.openstreetmap.org';

class GeocoderUnavailable extends Error {}

function createGeocoder({
    baseUrl = process.env.GEOCODER_URL || DEFAULT_URL,
    email = process.env.GEOCODER_EMAIL || '',
    userAgent = process.env.GEOCODER_USER_AGENT || 'Sidro-housing/1.0 (student housing map, Slovenia)',
    minIntervalMs = 1100,
    timeoutMs = 6000,
    fetchImpl = (...args) => fetch(...args),
    cacheSize = 500,
} = {}) {
    const cache = new Map();
    let queue = Promise.resolve();
    let lastRequestAt = 0;

    // One request at a time, at least minIntervalMs apart
    function throttled(task) {
        const run = queue.then(async () => {
            const wait = lastRequestAt + minIntervalMs - Date.now();
            if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
            lastRequestAt = Date.now();
            return task();
        });
        queue = run.catch(() => {}); // a failed request doesn't block the next one
        return run;
    }

    async function request(params) {
        const url = new URL('/search', baseUrl);
        Object.entries({ ...params, format: 'jsonv2', limit: '1', countrycodes: 'si', 'accept-language': 'sl,en' })
            .forEach(([key, value]) => { if (value) url.searchParams.set(key, value); });
        if (email) url.searchParams.set('email', email);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetchImpl(url.toString(), {
                headers: { 'User-Agent': userAgent, Accept: 'application/json' },
                signal: controller.signal,
            });
            if (!res.ok) throw new GeocoderUnavailable(`geocoder answered ${res.status}`);
            const rows = await res.json();
            const first = Array.isArray(rows) ? rows[0] : null;
            if (!first) return null;
            const latitude = Number(first.lat);
            const longitude = Number(first.lon);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
            return { latitude, longitude, label: first.display_name || '' };
        } catch (err) {
            if (err instanceof GeocoderUnavailable) throw err;
            throw new GeocoderUnavailable(err.name === 'AbortError' ? 'geocoder timed out' : err.message);
        } finally {
            clearTimeout(timer);
        }
    }

    // { street, city, postal_code } -> { latitude, longitude, label } or null if not found.
    // Throws GeocoderUnavailable when the service can't be reached.
    async function lookup({ street, city, postal_code }) {
        const key = [street, postal_code, city].map(v => String(v || '').trim().toLowerCase()).join('|');
        if (cache.has(key)) return cache.get(key);

        // First the structured search; if that finds nothing, the address as one line
        let result = await throttled(() => request({ street, city, postalcode: postal_code }));
        if (!result) {
            const q = [street, [postal_code, city].filter(Boolean).join(' '), 'Slovenia'].filter(Boolean).join(', ');
            result = await throttled(() => request({ q }));
        }

        cache.set(key, result);
        if (cache.size > cacheSize) cache.delete(cache.keys().next().value);
        return result;
    }

    return { lookup };
}

const defaultGeocoder = createGeocoder();

module.exports = { createGeocoder, GeocoderUnavailable, geocodeAddress: (address) => defaultGeocoder.lookup(address) };

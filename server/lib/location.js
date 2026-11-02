// Coordinates of housing listings.
//
// Every listing keeps two points:
//  - the exact one (latitude/longitude): where the owner put the pin. Only the
//    owner (and admins) ever get it back from the API.
//  - a public one (public_latitude/public_longitude): the exact point moved a
//    random 80–200 m in a random direction. Maps show this one, as a circle,
//    so nobody can find the exact building from the map. It's made once and
//    kept until the exact point changes, so saving again doesn't reveal the
//    real spot by averaging many random points.

// Slovenia with a small margin. Pins outside this box are refused.
const SLOVENIA = { south: 45.40, north: 46.90, west: 13.35, east: 16.65 };

const METRES_PER_DEGREE = 111320;

function isBlank(value) {
    return value === undefined || value === null || value === '';
}

function inSlovenia(latitude, longitude) {
    return latitude >= SLOVENIA.south && latitude <= SLOVENIA.north
        && longitude >= SLOVENIA.west && longitude <= SLOVENIA.east;
}

const round6 = (n) => Math.round(n * 1e6) / 1e6;

// Reads { latitude, longitude } from a form. Both empty -> no pin (value null).
// Returns { value, error }.
function readCoordinates(body) {
    const lat = body ? body.latitude : undefined;
    const lng = body ? body.longitude : undefined;
    if (isBlank(lat) && isBlank(lng)) return { value: null, error: null };

    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return { value: null, error: 'The map pin is missing. Find the address again or place the pin yourself.' };
    }
    if (!inSlovenia(latitude, longitude)) {
        return { value: null, error: 'Place the pin on the map in Slovenia' };
    }
    return { value: { latitude: round6(latitude), longitude: round6(longitude) }, error: null };
}

// The exact point moved 80–200 m in a random direction
function publicPoint(latitude, longitude, random = Math.random) {
    const distance = 80 + random() * 120;
    const angle = random() * 2 * Math.PI;
    const dLat = (distance * Math.cos(angle)) / METRES_PER_DEGREE;
    const dLng = (distance * Math.sin(angle)) / (METRES_PER_DEGREE * Math.cos((latitude * Math.PI) / 180));
    return { latitude: round6(latitude + dLat), longitude: round6(longitude + dLng) };
}

// Straight-line distance in metres (haversine)
function distanceMetres(a, b) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// The database fields for a new or moved pin. `previous` is the stored row (or
// null): if the exact point didn't move, the public point stays the same.
function locationFields(point, source, previous) {
    if (!point) return {};
    const unchanged = previous
        && previous.latitude === point.latitude
        && previous.longitude === point.longitude
        && previous.public_latitude != null;
    const shown = unchanged
        ? { latitude: previous.public_latitude, longitude: previous.public_longitude }
        : publicPoint(point.latitude, point.longitude);
    return {
        latitude: point.latitude,
        longitude: point.longitude,
        public_latitude: shown.latitude,
        public_longitude: shown.longitude,
        location_source: source,
    };
}

module.exports = { SLOVENIA, inSlovenia, readCoordinates, publicPoint, distanceMetres, locationFields };

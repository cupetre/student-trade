// Where the map pictures (tiles) come from. Set in client/.env:
//
//   VITE_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
//   VITE_MAP_ATTRIBUTION=© OpenStreetMap contributors
//
// The default is OpenStreetMap's free tile server: fine for development and
// early testing, but it can block heavy users without warning. Before launch,
// switch to a paid provider or self-hosted tiles by changing these two lines.
export const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION
    || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

// Slovenia as a whole, and a few city centres to start the map at
export const SLOVENIA_VIEW = { center: [46.12, 14.82], zoom: 8 };
export const SLOVENIA_BOUNDS = [[45.40, 13.35], [46.90, 16.65]];

const CITY_CENTRES = {
    ljubljana: [46.0511, 14.5051],
    maribor: [46.5547, 15.6459],
    koper: [45.5481, 13.7302],
    izola: [45.5389, 13.6606],
    piran: [45.5283, 13.5683],
    portoroz: [45.5144, 13.5911],
    'nova gorica': [45.9560, 13.6481],
    celje: [46.2309, 15.2604],
    kranj: [46.2389, 14.3556],
    'novo mesto': [45.8040, 15.1689],
    ptuj: [46.4200, 15.8700],
    velenje: [46.3592, 15.1103],
    'murska sobota': [46.6625, 16.1664],
    domzale: [46.1383, 14.5942],
    kamnik: [46.2259, 14.6121],
};

export function cityCentre(city) {
    const key = String(city || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return CITY_CENTRES[key] || null;
}

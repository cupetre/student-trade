import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import HousingCard from '../../components/HousingCard.jsx';
import HousingTabs from './HousingTabs.jsx';
import { apiRequest } from '../../lib/api';
import { LISTING_TYPES, PROPERTY_TYPES, FURNISHING, CITY_SUGGESTIONS } from '../../lib/housingOptions';
import './Housing.css';

// The filters live in the URL (?city=Koper&max_price=300...), so a search
// can be bookmarked or sent to a friend, and the back button works.
const FILTER_KEYS = ['city', 'listing_type', 'property_type', 'max_price', 'min_spots', 'furnishing', 'move_in', 'registration', 'subsidy', 'sort'];

// Like a heart toggle, but optimistic: flip it in the UI first, undo if the server says no
async function toggleSaved(listing) {
    const method = listing.is_saved ? 'DELETE' : 'POST';
    const { ok } = await apiRequest(`/api/housing/listings/${listing.id}/save`, { method });
    return ok;
}

const HousingListPage = ({ mode = 'browse' }) => {
    const saved = mode === 'saved';
    const [params, setParams] = useSearchParams();
    const [result, setResult] = useState({ items: [], total: 0, page: 1, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [profileMissing, setProfileMissing] = useState(false);

    // The city box updates the URL only after typing stops, not on every key
    const [cityInput, setCityInput] = useState(params.get('city') || '');

    const query = saved ? '' : params.toString();

    // Students with an unfinished rental profile get a reminder (landlords get a 400 here and see nothing)
    useEffect(() => {
        let cancelled = false;
        apiRequest('/api/users/me/student-profile').then(({ ok, data }) => {
            if (!cancelled && ok && !data.complete) setProfileMissing(true);
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');

        const url = saved ? '/api/housing/listings/saved' : `/api/housing/listings?${query}`;
        apiRequest(url).then(({ ok, data }) => {
            if (cancelled) return;
            setLoading(false);
            if (!ok) { setError(data.error); return; }
            // Saved returns a plain list, browse returns a page
            setResult(saved
                ? { items: data, total: data.length, page: 1, pages: 1 }
                : data);
        });
        return () => { cancelled = true; };
    }, [saved, query]);

    useEffect(() => {
        if (saved) return undefined;
        const current = params.get('city') || '';
        if (cityInput.trim() === current) return undefined;
        const timer = setTimeout(() => setFilter('city', cityInput.trim()), 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cityInput]);

    function setFilter(key, value) {
        setParams(prev => {
            const next = new URLSearchParams(prev);
            if (value === '' || value === false || value === null) next.delete(key);
            else next.set(key, value === true ? 'true' : value);
            next.delete('page'); // a new filter starts again from page 1
            return next;
        });
    }

    function goToPage(page) {
        setParams(prev => {
            const next = new URLSearchParams(prev);
            if (page <= 1) next.delete('page'); else next.set('page', String(page));
            return next;
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function clearFilters() {
        setCityInput('');
        setParams({});
    }

    const handleToggleSave = async (listing) => {
        const flip = (items) => items.map(item => (item.id === listing.id ? { ...item, is_saved: !item.is_saved } : item));

        // On the Saved tab, un-saving removes the card
        setResult(prev => ({
            ...prev,
            items: saved && listing.is_saved ? prev.items.filter(i => i.id !== listing.id) : flip(prev.items),
            total: saved && listing.is_saved ? prev.total - 1 : prev.total,
        }));

        const ok = await toggleSaved(listing);
        if (!ok) {
            setError("Couldn't update your saved places. Please try again.");
            setResult(prev => ({ ...prev, items: saved ? [...prev.items, listing] : flip(prev.items) }));
        }
    };

    const hasFilters = FILTER_KEYS.some(key => key !== 'sort' && params.get(key));

    return (
        <div className="hs-shell">
            <AppNav />
            <main className="hs-page">
                <HousingTabs />

                <header className="hs-head">
                    <h1>{saved ? 'Saved places' : 'Find a place to live'}</h1>
                    <p>
                        {saved
                            ? 'Places you saved with the heart. Message the owner when you are ready.'
                            : 'Rooms, flats and roommates from verified landlords and students, all over Slovenia.'}
                    </p>
                </header>

                {profileMissing && (
                    <div className="hs-alert hs-alert--info" role="status">
                        <strong>Finish your rental profile</strong> to message homeowners. They want to know who’s writing before they reply.
                        {' '}<Link to="/profile/student">Complete it</Link>
                    </div>
                )}

                {!saved && (
                    <form className="hs-filters" onSubmit={(e) => e.preventDefault()} aria-label="Filters">
                        <div className="hs-filter hs-filter--city">
                            <label htmlFor="f-city">City</label>
                            <input
                                id="f-city"
                                list="hs-cities"
                                placeholder="Any city"
                                value={cityInput}
                                onChange={(e) => setCityInput(e.target.value)}
                            />
                            <datalist id="hs-cities">
                                {CITY_SUGGESTIONS.map(city => <option key={city} value={city} />)}
                            </datalist>
                        </div>

                        <div className="hs-filter">
                            <label htmlFor="f-type">Listing</label>
                            <select id="f-type" value={params.get('listing_type') || ''} onChange={(e) => setFilter('listing_type', e.target.value)}>
                                <option value="">All</option>
                                {Object.entries(LISTING_TYPES).map(([value, t]) => <option key={value} value={value}>{t.badge}</option>)}
                            </select>
                        </div>

                        <div className="hs-filter">
                            <label htmlFor="f-prop">Place</label>
                            <select id="f-prop" value={params.get('property_type') || ''} onChange={(e) => setFilter('property_type', e.target.value)}>
                                <option value="">Any</option>
                                {Object.entries(PROPERTY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>

                        <div className="hs-filter hs-filter--small">
                            <label htmlFor="f-price">Max € / month</label>
                            <input
                                id="f-price"
                                type="number"
                                min="0"
                                inputMode="numeric"
                                placeholder="Any"
                                value={params.get('max_price') || ''}
                                onChange={(e) => setFilter('max_price', e.target.value)}
                            />
                        </div>

                        <div className="hs-filter hs-filter--small">
                            <label htmlFor="f-spots">Spots for</label>
                            <select id="f-spots" value={params.get('min_spots') || ''} onChange={(e) => setFilter('min_spots', e.target.value)}>
                                <option value="">1+</option>
                                <option value="2">2+ (with a friend)</option>
                                <option value="3">3+</option>
                                <option value="4">4+</option>
                            </select>
                        </div>

                        <div className="hs-filter">
                            <label htmlFor="f-furn">Furnishing</label>
                            <select id="f-furn" value={params.get('furnishing') || ''} onChange={(e) => setFilter('furnishing', e.target.value)}>
                                <option value="">Any</option>
                                {Object.entries(FURNISHING).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>

                        <div className="hs-filter">
                            <label htmlFor="f-move">Move in by</label>
                            <input id="f-move" type="date" value={params.get('move_in') || ''} onChange={(e) => setFilter('move_in', e.target.value)} />
                        </div>

                        <div className="hs-filter-checks">
                            <label>
                                <input type="checkbox" checked={params.get('registration') === 'true'} onChange={(e) => setFilter('registration', e.target.checked)} />
                                Address registration
                            </label>
                            <label>
                                <input type="checkbox" checked={params.get('subsidy') === 'true'} onChange={(e) => setFilter('subsidy', e.target.checked)} />
                                Student subsidy
                            </label>
                        </div>
                    </form>
                )}

                <div className="hs-results-bar">
                    <p aria-live="polite">
                        {loading ? 'Loading…' : `${result.total} ${result.total === 1 ? 'place' : 'places'}`}
                        {hasFilters && !loading && (
                            <button type="button" className="hs-link-btn" onClick={clearFilters}>Clear filters</button>
                        )}
                    </p>
                    {!saved && (
                        <label className="hs-sort">
                            Sort
                            <select value={params.get('sort') || 'newest'} onChange={(e) => setFilter('sort', e.target.value === 'newest' ? '' : e.target.value)}>
                                <option value="newest">Newest</option>
                                <option value="price_asc">Cheapest first</option>
                                <option value="price_desc">Most expensive first</option>
                                <option value="soonest">Available soonest</option>
                            </select>
                        </label>
                    )}
                </div>

                {error && <div className="hs-alert hs-alert--error" role="alert">{error}</div>}

                {!loading && !error && result.items.length === 0 && (
                    <div className="hs-empty">
                        {saved ? (
                            <>
                                <h2>Nothing saved yet</h2>
                                <p>Tap the heart on a place to keep it here.</p>
                                <Link to="/housing" className="hs-btn">Browse places</Link>
                            </>
                        ) : (
                            <>
                                <h2>No places match yet</h2>
                                <p>Try another city or fewer filters. New places are added every week.</p>
                                {hasFilters && <button type="button" className="hs-btn hs-btn--ghost" onClick={clearFilters}>Clear filters</button>}
                            </>
                        )}
                    </div>
                )}

                <div className="hs-grid">
                    {result.items.map(listing => (
                        <HousingCard key={listing.id} listing={listing} onToggleSave={handleToggleSave} />
                    ))}
                </div>

                {!saved && result.pages > 1 && (
                    <nav className="hs-pager" aria-label="Pages">
                        <button type="button" className="hs-btn hs-btn--ghost" disabled={result.page <= 1} onClick={() => goToPage(result.page - 1)}>Previous</button>
                        <span>Page {result.page} of {result.pages}</span>
                        <button type="button" className="hs-btn hs-btn--ghost" disabled={result.page >= result.pages} onClick={() => goToPage(result.page + 1)}>Next</button>
                    </nav>
                )}
            </main>
        </div>
    );
};

export default HousingListPage;

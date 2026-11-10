import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import SceneBackdrop from '../../components/SceneBackdrop.jsx';
import HousingRowCard from '../../components/HousingRowCard.jsx';
import HousingLinks from './HousingLinks.jsx';
import { apiRequest } from '../../lib/api';
import { LISTING_TYPES, PROPERTY_TYPES, FURNISHING, CITY_SUGGESTIONS, formatEuro, formatDate, toDateInput } from '../../lib/housingOptions';
import { STAY_LENGTHS } from '../../lib/profileOptions';
import './Housing.css';

// Leaflet is big, so the map loads after the listings
const HousingBrowseMap = lazy(() => import('../../components/HousingBrowseMap.jsx'));

// The filters live in the URL (?city=Koper&max_price=300...), so a search
// can be bookmarked or sent to a friend, and the back button works.
const FILTER_KEYS = ['city', 'listing_type', 'property_type', 'max_price', 'min_spots', 'furnishing', 'move_in', 'registration', 'subsidy', 'sort'];

// Like a heart toggle, but optimistic: flip it in the UI first, undo if the server says no
async function toggleSaved(listing) {
    const method = listing.is_saved ? 'DELETE' : 'POST';
    const { ok } = await apiRequest(`/api/housing/listings/${listing.id}/save`, { method });
    return ok;
}

// "What you're looking for", from the student's rental profile, beside the results
const SearchProfile = ({ profile, onApply }) => {
    const stay = STAY_LENGTHS[profile.stay_length];
    const rows = [
        ['City', profile.preferred_city],
        ['Budget', profile.budget_max ? `Up to ${formatEuro(profile.budget_max)} / month` : ''],
        ['Move in', profile.move_in_date ? `From ${formatDate(profile.move_in_date)}` : ''],
        ['Stay', stay ? stay.label : ''],
    ].filter(([, value]) => value);
    const canApply = Boolean(profile.preferred_city || profile.budget_max || profile.move_in_date);

    return (
        <section className="hs-side-card hs-lookfor" aria-labelledby="hs-lookfor-title">
            <div className="hs-side-head">
                <h2 id="hs-lookfor-title">What you’re looking for</h2>
                <Link to="/profile/student?edit=1" className="hs-side-edit">Edit</Link>
            </div>
            {rows.length > 0 ? (
                <dl className="hs-lookfor-list">
                    {rows.map(([label, value]) => (
                        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                    ))}
                </dl>
            ) : (
                <p className="hs-muted hs-side-text">Nothing added yet.</p>
            )}
            {canApply && (
                <button type="button" className="hs-btn hs-btn--ghost hs-btn--block" onClick={onApply}>Use as filters</button>
            )}
        </section>
    );
};

const HousingListPage = ({ mode = 'browse' }) => {
    const saved = mode === 'saved';
    const [params, setParams] = useSearchParams();
    const [result, setResult] = useState({ items: [], total: 0, page: 1, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [profileMissing, setProfileMissing] = useState(false);
    const [lookingFor, setLookingFor] = useState(null); // the student's housing wishes (landlords: none)
    const [hoveredId, setHoveredId] = useState(null);
    const [filtersOpen, setFiltersOpen] = useState(false); // phones: the filter panel folds away
    const navigate = useNavigate();

    // The city and price boxes keep their own value while you type and update
    // the URL only after typing stops (typing straight into the URL state loses
    // keystrokes, because the URL updates a moment later)
    const [cityInput, setCityInput] = useState(params.get('city') || '');
    const [priceInput, setPriceInput] = useState(params.get('max_price') || '');

    const query = saved ? '' : params.toString();

    // Students with an unfinished rental profile get a reminder (landlords get a 400 here and see nothing)
    useEffect(() => {
        let cancelled = false;
        apiRequest('/api/users/me/student-profile').then(({ ok, data }) => {
            if (cancelled || !ok) return;
            if (!data.complete) setProfileMissing(true);
            setLookingFor(data.profile || {});
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
        const city = cityInput.trim();
        if (city === (params.get('city') || '') && priceInput === (params.get('max_price') || '')) return undefined;
        const timer = setTimeout(() => setFilters({ city, max_price: priceInput }), 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cityInput, priceInput]);

    // Starts from the URL as it is now, not as it was when this render
    // happened, so a delayed update never undoes a newer one
    function setFilters(changes) {
        const next = new URLSearchParams(window.location.search);
        Object.entries(changes).forEach(([key, value]) => {
            if (value === '' || value === false || value === null) next.delete(key);
            else next.set(key, value === true ? 'true' : value);
        });
        next.delete('page'); // a new filter starts again from page 1
        setParams(next);
    }
    const setFilter = (key, value) => setFilters({ [key]: value });

    function goToPage(page) {
        const next = new URLSearchParams(window.location.search);
        if (page <= 1) next.delete('page'); else next.set('page', String(page));
        setParams(next);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Copies the wishes from the rental profile into the filters
    function applyProfile() {
        const p = lookingFor || {};
        const changes = {};
        if (p.preferred_city) { changes.city = p.preferred_city; setCityInput(p.preferred_city); }
        if (p.budget_max) { changes.max_price = String(p.budget_max); setPriceInput(String(p.budget_max)); }
        if (p.move_in_date) changes.move_in = toDateInput(p.move_in_date);
        setFilters(changes);
    }

    function clearFilters() {
        setCityInput('');
        setPriceInput('');
        setParams({});
    }

    const handleToggleSave = async (listing) => {
        const flip = (items) => items.map(item => (item.id === listing.id ? { ...item, is_saved: !item.is_saved } : item));

        // On Liked listings, un-liking removes the card
        setResult(prev => ({
            ...prev,
            items: saved && listing.is_saved ? prev.items.filter(i => i.id !== listing.id) : flip(prev.items),
            total: saved && listing.is_saved ? prev.total - 1 : prev.total,
        }));

        const ok = await toggleSaved(listing);
        if (!ok) {
            setError("Couldn't update your liked listings. Please try again.");
            setResult(prev => ({ ...prev, items: saved ? [...prev.items, listing] : flip(prev.items) }));
        }
    };

    const hasFilters = FILTER_KEYS.some(key => key !== 'sort' && params.get(key));
    const filterCount = FILTER_KEYS.filter(key => key !== 'sort' && params.get(key)).length;

    return (
        <div className="hs-shell">
            <AppNav /><SceneBackdrop />
            <main className="hs-page hs-page--browse">
                <div className="hs-topbar">
                    <h1 className="hs-visually-hidden">{saved ? 'Liked listings' : 'Housing'}</h1>
                    <HousingLinks />
                </div>

                {profileMissing && (
                    <div className="hs-alert hs-alert--info" role="status">
                        <strong>Finish your rental profile</strong> to message homeowners. They want to know who’s writing before they reply.
                        {' '}<Link to="/profile/student">Complete it</Link>
                    </div>
                )}

                <div className={`hs-browse ${saved ? 'hs-browse--saved' : ''}`}>
                    {!saved && (
                        <aside className="hs-browse-filters">
                            <button
                                type="button"
                                className="hs-filters-toggle"
                                aria-expanded={filtersOpen}
                                aria-controls="hs-filters"
                                onClick={() => setFiltersOpen(open => !open)}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
                                Filters{filterCount > 0 ? ` (${filterCount})` : ''}
                                <svg className="hs-filters-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                            </button>

                            <form
                                id="hs-filters"
                                className={`hs-filters ${filtersOpen ? 'is-open' : ''}`}
                                onSubmit={(e) => e.preventDefault()}
                                aria-label="Filters"
                            >
                                <h2 className="hs-filters-title">Filters</h2>

                                <div className="hs-filter">
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
                                    <label htmlFor="f-prop">Type of place</label>
                                    <select id="f-prop" value={params.get('property_type') || ''} onChange={(e) => setFilter('property_type', e.target.value)}>
                                        <option value="">Any</option>
                                        {Object.entries(PROPERTY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                </div>

                                <div className="hs-filter">
                                    <label htmlFor="f-price">Max rent (€ / month)</label>
                                    <input
                                        id="f-price"
                                        type="number"
                                        min="0"
                                        inputMode="numeric"
                                        placeholder="Any"
                                        value={priceInput}
                                        onChange={(e) => setPriceInput(e.target.value)}
                                    />
                                </div>

                                <div className="hs-filter">
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

                                <fieldset className="hs-filter-checks">
                                    <legend>Must have</legend>
                                    <label>
                                        <input type="checkbox" checked={params.get('registration') === 'true'} onChange={(e) => setFilter('registration', e.target.checked)} />
                                        Address registration
                                    </label>
                                    <label>
                                        <input type="checkbox" checked={params.get('subsidy') === 'true'} onChange={(e) => setFilter('subsidy', e.target.checked)} />
                                        Student subsidy
                                    </label>
                                </fieldset>

                                {hasFilters && (
                                    <button type="button" className="hs-link-btn hs-filters-clear" onClick={clearFilters}>Clear filters</button>
                                )}
                            </form>
                        </aside>
                    )}

                    <section className="hs-browse-main" aria-label="Places">
                        <div className="hs-results-bar">
                            <p aria-live="polite">
                                {loading ? 'Loading…' : `${result.total} ${result.total === 1 ? 'place' : 'places'}`}
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
                                        <h2>No liked listings yet</h2>
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

                        <div className="hs-rc-list">
                            {result.items.map(listing => (
                                <HousingRowCard
                                    key={listing.id}
                                    listing={listing}
                                    onToggleSave={handleToggleSave}
                                    onHover={setHoveredId}
                                />
                            ))}
                        </div>

                        {!saved && result.pages > 1 && (
                            <nav className="hs-pager" aria-label="Pages">
                                <button type="button" className="hs-btn hs-btn--ghost" disabled={result.page <= 1} onClick={() => goToPage(result.page - 1)}>Previous</button>
                                <span>Page {result.page} of {result.pages}</span>
                                <button type="button" className="hs-btn hs-btn--ghost" disabled={result.page >= result.pages} onClick={() => goToPage(result.page + 1)}>Next</button>
                            </nav>
                        )}
                    </section>

                    <aside className="hs-browse-side" aria-label="Your search and map">
                        {lookingFor && <SearchProfile profile={lookingFor} onApply={applyProfile} />}
                        <section className="hs-side-card hs-side-card--map">
                            <h2 className="hs-side-title">{params.get('city') && !saved ? `Map · ${params.get('city')}` : 'Map'}</h2>
                            <Suspense fallback={<div className="hs-map-canvas hs-map-loading">Loading map…</div>}>
                                <HousingBrowseMap
                                    listings={result.items}
                                    city={saved ? '' : params.get('city') || ''}
                                    activeId={hoveredId}
                                    onOpen={(id) => navigate(`/housing/${id}`)}
                                />
                            </Suspense>
                        </section>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default HousingListPage;

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppNav from './components/AppNav.jsx';
import MarketTabs from './Pages/marketplace/MarketTabs.jsx';
import MarketCard from './Pages/marketplace/MarketCard.jsx';
import { SORTS } from './Pages/marketplace/marketOptions';
import { apiRequest } from './lib/api';
import './Pages/housing/Housing.css';
import './Pages/marketplace/Market.css';

// Marketplace › Browse (/marketplace). Built like Housing › Browse: tabs, a page
// header, filters that live in the address (?q=lamp&max=20&sort=price_asc, so a
// search can be shared and the back button works) and a grid of cards.
const MarketplacePage = () => {
    const [params, setParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // The search and price boxes keep their own value while you type and update
    // the address only after typing stops (typing straight into the address
    // state loses keystrokes, because the address updates a moment later)
    const [searchInput, setSearchInput] = useState(params.get('q') || '');
    const [maxInput, setMaxInput] = useState(params.get('max') || '');

    useEffect(() => {
        let cancelled = false;
        apiRequest('/api/listings/show_listings').then(({ ok, data }) => {
            if (cancelled) return;
            setLoading(false);
            if (ok) setItems(Array.isArray(data) ? data : []);
            else setError(data.error);
        });
        return () => { cancelled = true; };
    }, []);

    // Starts from the address as it is now, not as it was when this render
    // happened, so a delayed update never undoes a newer one
    function setFilters(changes, replace = false) {
        const next = new URLSearchParams(window.location.search);
        Object.entries(changes).forEach(([key, value]) => {
            if (value === '' || value === null) next.delete(key);
            else next.set(key, value);
        });
        setParams(next, { replace });
    }

    useEffect(() => {
        const q = searchInput.trim();
        if (q === (params.get('q') || '') && maxInput === (params.get('max') || '')) return undefined;
        const timer = setTimeout(() => setFilters({ q, max: maxInput }, true), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput, maxInput]);

    const query = (params.get('q') || '').toLowerCase();
    const max = params.get('max') || '';  // what the list is filtered by right now
    const sort = params.get('sort') || 'newest';

    const shown = useMemo(() => {
        let list = items;
        if (query) list = list.filter(i => `${i.title} ${i.description || ''}`.toLowerCase().includes(query));
        if (max !== '') list = list.filter(i => Number(i.price) <= Number(max));
        const sorted = [...list];
        if (sort === 'price_asc') sorted.sort((a, b) => Number(a.price) - Number(b.price));
        else if (sort === 'price_desc') sorted.sort((a, b) => Number(b.price) - Number(a.price));
        else sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
        return sorted;
    }, [items, query, max, sort]);

    const hasFilters = Boolean(query || max);
    const clearFilters = () => {
        setSearchInput('');
        setMaxInput('');
        setParams({});
    };

    return (
        <div className="hs-shell">
            <AppNav />
            <main className="hs-page">
                <MarketTabs />

                <header className="hs-head">
                    <h1>Marketplace</h1>
                    <p>Second-hand furniture, books, tech and bikes from students near you.</p>
                </header>

                <form className="hs-filters mk-filters" role="search" onSubmit={(e) => e.preventDefault()} aria-label="Search and filters">
                    <div className="hs-filter mk-filter-search">
                        <label htmlFor="mk-q">Search</label>
                        <input
                            id="mk-q"
                            type="search"
                            placeholder="Books, bikes, furniture…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </div>
                    <div className="hs-filter hs-filter--small">
                        <label htmlFor="mk-max">Max price (€)</label>
                        <input
                            id="mk-max"
                            type="number"
                            min="0"
                            inputMode="decimal"
                            placeholder="Any"
                            value={maxInput}
                            onChange={(e) => setMaxInput(e.target.value)}
                        />
                    </div>
                </form>

                <div className="hs-results-bar">
                    <p aria-live="polite">
                        {loading ? 'Loading…' : `${shown.length} ${shown.length === 1 ? 'item' : 'items'}`}
                        {hasFilters && !loading && (
                            <button type="button" className="hs-link-btn" onClick={clearFilters}>Clear filters</button>
                        )}
                    </p>
                    <label className="hs-sort">
                        Sort
                        <select value={sort} onChange={(e) => setFilters({ sort: e.target.value === 'newest' ? '' : e.target.value })}>
                            {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </label>
                </div>

                {error && <div className="hs-alert hs-alert--error" role="alert">{error}</div>}

                {!loading && !error && shown.length === 0 && (
                    <div className="hs-empty">
                        {hasFilters ? (
                            <>
                                <h2>Nothing matches yet</h2>
                                <p>Try another word or a higher price. New items are posted every day.</p>
                                <button type="button" className="hs-btn hs-btn--ghost" onClick={clearFilters}>Clear filters</button>
                            </>
                        ) : (
                            <>
                                <h2>Nothing for sale yet</h2>
                                <p>Be the first: sell something you don’t need any more.</p>
                                <Link to="/marketplace/new" className="hs-btn">Sell an item</Link>
                            </>
                        )}
                    </div>
                )}

                <div className="hs-grid mk-grid">
                    {shown.map(item => <MarketCard key={item.id} item={item} />)}
                </div>
            </main>
        </div>
    );
};

export default MarketplacePage;

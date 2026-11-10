import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppNav from './components/AppNav.jsx';
import SceneBackdrop from './components/SceneBackdrop.jsx';
import MarketTabs from './Pages/marketplace/MarketTabs.jsx';
import MarketCard from './Pages/marketplace/MarketCard.jsx';
import MarketItemModal from './Pages/marketplace/MarketItemModal.jsx';
import { SORTS, CATEGORIES, CONDITIONS } from './Pages/marketplace/marketOptions';
import { apiRequest } from './lib/api';
import './Pages/housing/Housing.css';
import './Pages/marketplace/Market.css';

const FILTER_KEYS = ['q', 'category', 'condition', 'max', 'sort'];

// The page numbers to show: always the first and last, and two either side of
// the current one, with gaps as "…" (1 … 4 5 6 7 8 … 20)
function pageList(page, pages) {
    const out = [];
    for (let n = 1; n <= pages; n += 1) {
        if (n === 1 || n === pages || Math.abs(n - page) <= 2) out.push(n);
        else if (out[out.length - 1] !== '…') out.push('…');
    }
    return out;
}

// Marketplace › Browse (/marketplace, and /marketplace/:id with the item open on top).
// 30 items a page: 3 per row, 10 rows. Filters and the page live in the address
// (?q=lamp&category=books&page=2), so a search can be shared and Back works.
const MarketplacePage = () => {
    const rest = useParams()['*'] || ''; // "12" on /marketplace/12
    const openId = /^\d+$/.test(rest) ? Number(rest) : null;
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [result, setResult] = useState({ items: [], total: 0, page: 1, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const topRef = useRef(null);

    // The search and price boxes keep their own value while you type and update
    // the address only after typing stops (typing straight into the address
    // state loses keystrokes, because the address updates a moment later)
    const [searchInput, setSearchInput] = useState(params.get('q') || '');
    const [maxInput, setMaxInput] = useState(params.get('max') || '');

    // What the server is asked for: the filters plus the page, nothing else
    const query = (() => {
        const q = new URLSearchParams();
        [...FILTER_KEYS, 'page'].forEach(key => { if (params.get(key)) q.set(key, params.get(key)); });
        return q.toString();
    })();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        apiRequest(`/api/listings/show_listings?${query}`).then(({ ok, data }) => {
            if (cancelled) return;
            setLoading(false);
            if (!ok) { setError(data.error); return; }
            // An older server sends a plain list; treat it as one page
            const items = Array.isArray(data) ? data : (data.items || []);
            setResult({
                items,
                total: Array.isArray(data) ? items.length : (data.total ?? items.length),
                page: data.page || 1,
                pages: data.pages || 1,
                page_size: data.page_size || 30,
            });
            setError('');
        });
        return () => { cancelled = true; };
    }, [query]);

    // Starts from the address as it is now, not as it was when this render
    // happened, so a delayed update never undoes a newer one. Any filter change
    // goes back to page 1.
    function setFilters(changes, replace = false) {
        const next = new URLSearchParams(window.location.search);
        Object.entries(changes).forEach(([key, value]) => {
            if (value === '' || value === null || value === undefined) next.delete(key);
            else next.set(key, value);
        });
        if (!('page' in changes)) next.delete('page');
        setParams(next, { replace });
    }

    useEffect(() => {
        const q = searchInput.trim();
        if (q === (params.get('q') || '') && maxInput === (params.get('max') || '')) return undefined;
        const timer = setTimeout(() => setFilters({ q, max: maxInput }, true), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput, maxInput]);

    const goToPage = (page) => {
        setFilters({ page: page > 1 ? String(page) : '' });
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const hasFilters = FILTER_KEYS.some(key => key !== 'sort' && params.get(key));
    const clearFilters = () => {
        setSearchInput('');
        setMaxInput('');
        setParams({});
    };

    // Opening an item keeps the filters and page in the address, so closing it
    // lands on exactly the same view
    const search = params.toString() ? `?${params.toString()}` : '';
    const closeItem = () => navigate(`/marketplace${search}`);

    const from = (result.page - 1) * (result.page_size || 30) + 1;
    const to = from + result.items.length - 1;

    return (
        <div className="hs-shell mk-shell">
            <AppNav />
            <SceneBackdrop />
            <main className="hs-page mk-page" ref={topRef}>
                <h1 className="hs-visually-hidden">Marketplace</h1>
                <MarketTabs />

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
                    <div className="hs-filter">
                        <label htmlFor="mk-category">Category</label>
                        <select id="mk-category" value={params.get('category') || ''} onChange={(e) => setFilters({ category: e.target.value })}>
                            <option value="">All</option>
                            {Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                    <div className="hs-filter">
                        <label htmlFor="mk-condition">Condition</label>
                        <select id="mk-condition" value={params.get('condition') || ''} onChange={(e) => setFilters({ condition: e.target.value })}>
                            <option value="">Any</option>
                            {Object.entries(CONDITIONS).map(([value, c]) => <option key={value} value={value}>{c.label}</option>)}
                        </select>
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
                        {loading
                            ? 'Loading…'
                            : result.total === 0
                                ? 'No items'
                                : result.pages > 1
                                    ? `${from}–${to} of ${result.total} items`
                                    : `${result.total} ${result.total === 1 ? 'item' : 'items'}`}
                        {hasFilters && !loading && (
                            <button type="button" className="hs-link-btn" onClick={clearFilters}>Clear filters</button>
                        )}
                    </p>
                    <label className="hs-sort">
                        Sort
                        <select value={params.get('sort') || 'newest'} onChange={(e) => setFilters({ sort: e.target.value === 'newest' ? '' : e.target.value })}>
                            {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </label>
                </div>

                {error && <div className="hs-alert hs-alert--error" role="alert">{error}</div>}

                {!loading && !error && result.items.length === 0 && (
                    <div className="hs-empty mk-empty">
                        {hasFilters ? (
                            <>
                                <h2>Nothing matches yet</h2>
                                <p>Try another word, category or a higher price. New items are posted every day.</p>
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

                <div className={`mk-grid ${loading ? 'is-loading' : ''}`}>
                    {result.items.map(item => <MarketCard key={item.id} item={item} search={search} />)}
                </div>

                {result.pages > 1 && (
                    <nav className="mk-pager" aria-label="Pages">
                        <button type="button" className="hs-btn hs-btn--ghost hs-btn--small" disabled={result.page <= 1} onClick={() => goToPage(result.page - 1)}>
                            Previous
                        </button>
                        <ol>
                            {pageList(result.page, result.pages).map((n, i) => (
                                <li key={`${n}-${i}`}>
                                    {n === '…'
                                        ? <span className="mk-pager-gap" aria-hidden="true">…</span>
                                        : (
                                            <button
                                                type="button"
                                                className={n === result.page ? 'is-current' : ''}
                                                aria-current={n === result.page ? 'page' : undefined}
                                                aria-label={`Page ${n}`}
                                                onClick={() => goToPage(n)}
                                            >
                                                {n}
                                            </button>
                                        )}
                                </li>
                            ))}
                        </ol>
                        <button type="button" className="hs-btn hs-btn--ghost hs-btn--small" disabled={result.page >= result.pages} onClick={() => goToPage(result.page + 1)}>
                            Next
                        </button>
                    </nav>
                )}
            </main>

            {openId && <MarketItemModal id={openId} onClose={closeItem} />}
        </div>
    );
};

export default MarketplacePage;

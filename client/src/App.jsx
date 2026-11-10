import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppNav from './components/AppNav.jsx';
import SceneBackdrop from './components/SceneBackdrop.jsx';
import MarketCard from './Pages/marketplace/MarketCard.jsx';
import MarketItemModal from './Pages/marketplace/MarketItemModal.jsx';
import { SORTS, CATEGORIES, CONDITIONS } from './Pages/marketplace/marketOptions';
import { apiRequest } from './lib/api';
import './Pages/housing/Housing.css';
import './Pages/marketplace/Market.css';

const FILTER_KEYS = ['q', 'category', 'condition', 'min', 'max', 'sort'];

// "books,bikes" <-> ['books', 'bikes'] (several categories / conditions in one address field)
const toList = (value) => (value ? value.split(',').filter(Boolean) : []);
const sameList = (a, b) => a.length === b.length && a.every(v => b.includes(v));

// What the sidebar shows, read from the address
const draftFrom = (params) => ({
    categories: toList(params.get('category')),
    conditions: toList(params.get('condition')),
    max: params.get('max') || '',
    sort: params.get('sort') || 'newest',
});
const EMPTY_DRAFT = { categories: [], conditions: [], max: '', sort: 'newest' };

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
// 50 items a page: 5 per row, 10 rows. Search on top of the items; categories,
// condition and price on the left: tick what you want, then "Apply filters".
// Everything lives in the address (?q=lamp&category=books,bikes&max=20&page=2),
// so a search can be shared and Back works.
const MarketplacePage = () => {
    const rest = useParams()['*'] || ''; // "12" on /marketplace/12
    const openId = /^\d+$/.test(rest) ? Number(rest) : null;
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [result, setResult] = useState({ items: [], total: 0, page: 1, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const topRef = useRef(null);

    // The search box keeps its own value while you type and updates the address
    // only after typing stops (typing straight into the address state loses
    // keystrokes, because the address updates a moment later)
    const [searchInput, setSearchInput] = useState(params.get('q') || '');

    // The sidebar is a draft until "Apply filters": select -> apply -> filter
    const [draft, setDraft] = useState(() => draftFrom(params));
    const [filtersOpen, setFiltersOpen] = useState(false); // phones: the sidebar folds away
    const applied = draftFrom(params);
    const changed = !sameList(draft.categories, applied.categories)
        || !sameList(draft.conditions, applied.conditions)
        || draft.max !== applied.max
        || draft.sort !== applied.sort;
    // Back / forward or a shared link: the sidebar follows the address
    const appliedKey = ['category', 'condition', 'max', 'sort'].map(k => params.get(k) || '').join('|');
    useEffect(() => { setDraft(draftFrom(new URLSearchParams(window.location.search))); }, [appliedKey]);

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
                page_size: data.page_size || 50,
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
        if (q === (params.get('q') || '')) return undefined;
        const timer = setTimeout(() => setFilters({ q }, true), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    const toggleIn = (key, value) => setDraft(prev => ({
        ...prev,
        [key]: prev[key].includes(value) ? prev[key].filter(v => v !== value) : [...prev[key], value],
    }));

    const applyFilters = (e) => {
        e.preventDefault();
        const max = draft.max === '' ? '' : String(Math.max(0, Number(draft.max)));
        setFilters({
            category: draft.categories.join(','),
            condition: draft.conditions.join(','),
            min: '', // the "from" box is gone; old links with it are cleared on apply
            max,
            sort: draft.sort === 'newest' ? '' : draft.sort,
        });
        setFiltersOpen(false);
    };

    const goToPage = (page) => {
        setFilters({ page: page > 1 ? String(page) : '' });
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const hasFilters = FILTER_KEYS.some(key => key !== 'sort' && params.get(key));
    const sidebarCount = ['category', 'condition', 'max', 'sort'].filter(k => params.get(k)).length;
    const clearFilters = () => {
        setSearchInput('');
        setDraft(EMPTY_DRAFT);
        setParams({});
    };

    // Opening an item keeps the filters and page in the address, so closing it
    // lands on exactly the same view
    const search = params.toString() ? `?${params.toString()}` : '';
    const closeItem = () => navigate(`/marketplace${search}`);

    const from = (result.page - 1) * (result.page_size || 50) + 1;
    const to = from + result.items.length - 1;

    return (
        <div className="hs-shell mk-shell">
            <AppNav />
            <SceneBackdrop />
            <main className="hs-page mk-page" ref={topRef}>
                <h1 className="hs-visually-hidden">Marketplace</h1>

                <div className="mk-browse">
                    {/* ---- left: categories, condition, price ---- */}
                    <aside className="mk-side">
                        <button
                            type="button"
                            className="hs-filters-toggle mk-side-toggle"
                            aria-expanded={filtersOpen}
                            aria-controls="mk-side-form"
                            onClick={() => setFiltersOpen(open => !open)}
                        >
                            Filters{sidebarCount ? ` (${sidebarCount})` : ''}
                        </button>
                        <form id="mk-side-form" className={`mk-side-form ${filtersOpen ? 'is-open' : ''}`} onSubmit={applyFilters} aria-label="Filters">
                            <fieldset className="mk-side-group">
                                <legend>Budget</legend>
                                <label htmlFor="mk-max" className="mk-budget-label">Up to (€)</label>
                                <input
                                    id="mk-max"
                                    className="mk-budget-input"
                                    type="number"
                                    min="0"
                                    inputMode="decimal"
                                    value={draft.max}
                                    onChange={(e) => setDraft(prev => ({ ...prev, max: e.target.value }))}
                                />
                            </fieldset>

                            <fieldset className="mk-side-group">
                                <legend>Sort by</legend>
                                {Object.entries(SORTS).map(([value, label]) => (
                                    <label key={value} className="mk-check">
                                        <input type="radio" name="mk-sort" value={value} checked={draft.sort === value} onChange={() => setDraft(prev => ({ ...prev, sort: value }))} />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </fieldset>

                            <fieldset className="mk-side-group">
                                <legend>Categories</legend>
                                {Object.entries(CATEGORIES).map(([value, label]) => (
                                    <label key={value} className="mk-check">
                                        <input type="checkbox" checked={draft.categories.includes(value)} onChange={() => toggleIn('categories', value)} />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </fieldset>

                            <fieldset className="mk-side-group">
                                <legend>Condition</legend>
                                {Object.entries(CONDITIONS).map(([value, c]) => (
                                    <label key={value} className="mk-check">
                                        <input type="checkbox" checked={draft.conditions.includes(value)} onChange={() => toggleIn('conditions', value)} />
                                        <span>{c.label}</span>
                                    </label>
                                ))}
                            </fieldset>

                            <div className="mk-side-actions">
                                <button type="submit" className="hs-btn hs-btn--block" disabled={!changed}>Apply filters</button>
                                {(sidebarCount > 0 || changed) && (
                                    <button
                                        type="button"
                                        className="hs-link-btn"
                                        onClick={() => {
                                            setDraft(EMPTY_DRAFT);
                                            setFilters({ category: '', condition: '', min: '', max: '', sort: '' });
                                        }}
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </form>
                    </aside>

                    {/* ---- right: search on top, then the items ---- */}
                    <section className="mk-main" aria-label="Items for sale">
                        <div className="mk-search" role="search">
                            <label htmlFor="mk-q" className="hs-visually-hidden">Search the marketplace</label>
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="mk-search-icon"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
                            <input
                                id="mk-q"
                                type="search"
                                placeholder="Search books, bikes, furniture…"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                        </div>

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
                                    <button type="button" className="hs-link-btn" onClick={clearFilters}>Clear all</button>
                                )}
                            </p>
                        </div>

                        {error && <div className="hs-alert hs-alert--error" role="alert">{error}</div>}

                        {!loading && !error && result.items.length === 0 && (
                            <div className="hs-empty mk-empty">
                                {hasFilters ? (
                                    <>
                                        <h2>Nothing matches yet</h2>
                                        <p>Try another word, more categories or a bigger budget. New items are posted every day.</p>
                                        <button type="button" className="hs-btn hs-btn--ghost" onClick={clearFilters}>Clear all</button>
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
                    </section>
                </div>
            </main>

            {openId && <MarketItemModal id={openId} onClose={closeItem} />}
        </div>
    );
};

export default MarketplacePage;

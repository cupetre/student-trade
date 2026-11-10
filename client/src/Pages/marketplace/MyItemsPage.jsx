import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import SceneBackdrop from '../../components/SceneBackdrop.jsx';
import { NoPhoto } from './MarketCard.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { formatEuro, postedAgo } from './marketOptions';
import '../housing/Housing.css';
import './Market.css';

// Marketplace › My items (/marketplace/mine). Same list as Housing › My listings.
const MyItemsPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [flash, setFlash] = useState(location.state?.flash || '');
    const [busyId, setBusyId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    // Clear the flash from navigation state so a refresh doesn't show it again
    useEffect(() => {
        if (location.state?.flash) navigate(location.pathname, { replace: true, state: null });
    }, [location, navigate]);

    useEffect(() => {
        let cancelled = false;
        apiRequest('/api/listings/fetch_my_listings').then(({ ok, data }) => {
            if (cancelled) return;
            setLoading(false);
            if (ok) setItems(Array.isArray(data) ? [...data].sort((a, b) => new Date(b.date) - new Date(a.date)) : []);
            else setError(data.error);
        });
        return () => { cancelled = true; };
    }, []);

    const deleteItem = async (item) => {
        setBusyId(item.id);
        setError('');
        setFlash('');
        const { ok, data } = await apiRequest(`/api/listings/delete_listing/${item.id}`, { method: 'DELETE' });
        setBusyId(null);
        setConfirmDeleteId(null);
        if (!ok) { setError(data.error); return; }
        setItems(prev => prev.filter(i => i.id !== item.id));
        setFlash(`“${item.title}” was deleted.`);
    };

    return (
        <div className="hs-shell mk-shell">
            <AppNav /><SceneBackdrop />
            <main className="hs-page mk-page">
                <header className="hs-head">
                    <h1>My items</h1>
                </header>

                {flash && <div className="hs-alert hs-alert--success" role="status">{flash}</div>}
                {error && <div className="hs-alert hs-alert--error" role="alert">{error}</div>}
                {loading && <p className="hs-muted">Loading…</p>}

                {!loading && !error && items.length === 0 && (
                    <div className="hs-empty">
                        <h2>You’re not selling anything yet</h2>
                        <p>Books from last semester, a lamp, a bike: post it and students nearby will message you.</p>
                        <Link to="/marketplace/new" className="hs-btn">Sell an item</Link>
                    </div>
                )}

                <ul className="hs-mine">
                    {items.map(item => {
                        const photo = resolveMediaUrl(item.photo);
                        const busy = busyId === item.id;
                        return (
                            <li key={item.id} className="hs-mine-item">
                                <Link to={`/marketplace/${item.id}`} className="hs-mine-thumb" tabIndex={-1} aria-hidden="true">
                                    {photo ? <img src={photo} alt="" loading="lazy" /> : <NoPhoto />}
                                </Link>

                                <div className="hs-mine-info">
                                    <Link to={`/marketplace/${item.id}`} className="hs-mine-title">{item.title}</Link>
                                    <p className="hs-muted">
                                        <span className="mk-mine-price">{formatEuro(item.price)}</span> · posted {postedAgo(item.date).toLowerCase()}
                                    </p>
                                </div>

                                <div className="hs-mine-actions">
                                    <Link to={`/marketplace/${item.id}/edit`} className="hs-btn hs-btn--small hs-btn--ghost">Edit</Link>
                                    {confirmDeleteId === item.id ? (
                                        <span className="hs-confirm">
                                            Delete for good?
                                            <button type="button" className="hs-btn hs-btn--small hs-btn--danger" disabled={busy} onClick={() => deleteItem(item)}>Delete</button>
                                            <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                                        </span>
                                    ) : (
                                        <button type="button" className="hs-btn hs-btn--small hs-btn--text" onClick={() => setConfirmDeleteId(item.id)}>Delete</button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </main>
        </div>
    );
};

export default MyItemsPage;

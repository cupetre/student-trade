import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import SceneBackdrop from '../../components/SceneBackdrop.jsx';
import { NoPhoto } from './MarketCard.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { useT } from '../../lib/i18n';
import { postedAgo, priceText } from './marketOptions';
import '../housing/Housing.css';
import './Market.css';

// Marketplace › My items (/marketplace/mine). Same list as Housing › My listings.
// "Mark as sold" takes an item off the marketplace without deleting it.
const MyItemsPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const t = useT();

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
        setFlash(t('“{title}” was deleted.', { title: item.title }));
    };

    const setStatus = async (item, status) => {
        setBusyId(item.id);
        setError('');
        setFlash('');
        const { ok, data } = await apiRequest(`/api/listings/item/${item.id}/status`, { method: 'PATCH', body: { status } });
        setBusyId(null);
        if (!ok) { setError(data.error); return; }
        setItems(prev => prev.map(i => (i.id === item.id ? { ...i, status } : i)));
        setFlash(status === 'sold'
            ? t('“{title}” is marked as sold and no longer shows on the marketplace.', { title: item.title })
            : t('“{title}” is back on the marketplace.', { title: item.title }));
    };

    return (
        <div className="hs-shell mk-shell">
            <AppNav /><SceneBackdrop />
            <main className="hs-page mk-page">
                <header className="hs-head">
                    <h1>{t('My items')}</h1>
                </header>

                {flash && <div className="hs-alert hs-alert--success" role="status">{flash}</div>}
                {error && <div className="hs-alert hs-alert--error" role="alert">{error}</div>}
                {loading && <p className="hs-muted">{t('Loading…')}</p>}

                {!loading && !error && items.length === 0 && (
                    <div className="hs-empty">
                        <h2>{t('You’re not selling anything yet')}</h2>
                        <p>{t('Books from last semester, a lamp, a bike: post it and students nearby will message you.')}</p>
                        <Link to="/marketplace/new" className="hs-btn">{t('Sell an item')}</Link>
                    </div>
                )}

                <ul className="hs-mine">
                    {items.map(item => {
                        const photo = resolveMediaUrl(item.photo);
                        const busy = busyId === item.id;
                        const sold = item.status === 'sold';
                        return (
                            <li key={item.id} className={`hs-mine-item ${sold ? 'is-sold' : ''}`}>
                                <Link to={`/marketplace/${item.id}`} className="hs-mine-thumb" tabIndex={-1} aria-hidden="true">
                                    {photo ? <img src={photo} alt="" loading="lazy" /> : <NoPhoto />}
                                </Link>

                                <div className="hs-mine-info">
                                    <Link to={`/marketplace/${item.id}`} className="hs-mine-title">{item.title}</Link>
                                    <p className="hs-muted">
                                        <span className="mk-mine-price">{priceText(item.price, t)}</span> · {t('posted {when}', { when: postedAgo(item.date, t).toLowerCase() })}
                                        {sold && <> · <span className="mk-sold-tag">{t('Sold')}</span></>}
                                    </p>
                                </div>

                                <div className="hs-mine-actions">
                                    <button type="button" className="hs-btn hs-btn--small" disabled={busy} onClick={() => setStatus(item, sold ? 'available' : 'sold')}>
                                        {sold ? t('Put back on sale') : t('Mark as sold')}
                                    </button>
                                    <Link to={`/marketplace/${item.id}/edit`} className="hs-btn hs-btn--small hs-btn--ghost">{t('Edit')}</Link>
                                    {confirmDeleteId === item.id ? (
                                        <span className="hs-confirm">
                                            {t('Delete for good?')}
                                            <button type="button" className="hs-btn hs-btn--small hs-btn--danger" disabled={busy} onClick={() => deleteItem(item)}>{t('Delete')}</button>
                                            <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" onClick={() => setConfirmDeleteId(null)}>{t('Cancel')}</button>
                                        </span>
                                    ) : (
                                        <button type="button" className="hs-btn hs-btn--small hs-btn--text" onClick={() => setConfirmDeleteId(item.id)}>{t('Delete')}</button>
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

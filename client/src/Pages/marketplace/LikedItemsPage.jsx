import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import SceneBackdrop from '../../components/SceneBackdrop.jsx';
import MarketCard from './MarketCard.jsx';
import { apiRequest } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { useLikeItem } from './useLikeItem';
import '../housing/Housing.css';
import './Market.css';

// Marketplace › Liked items (/marketplace/liked): everything you hearted, newest
// like first. Sold items stay (marked "Sold") until you take the heart off.
const LikedItemsPage = () => {
    const t = useT();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        apiRequest('/api/listings/saved').then(({ ok, data }) => {
            if (cancelled) return;
            setLoading(false);
            if (ok) setItems(Array.isArray(data) ? data : []);
            else setError(data.error);
        });
        return () => { cancelled = true; };
    }, []);

    // Taking the heart off removes it from this page
    const applyLike = useCallback((id, on) => {
        setItems(prev => (on ? prev.map(i => (i.id === id ? { ...i, is_saved: true } : i)) : prev.filter(i => i.id !== id)));
    }, []);
    const onLike = useLikeItem(applyLike);

    return (
        <div className="hs-shell mk-shell">
            <AppNav /><SceneBackdrop />
            <main className="hs-page mk-page">
                <header className="hs-head">
                    <h1>{t('Liked items')}</h1>
                </header>

                {error && <div className="hs-alert hs-alert--error" role="alert">{error}</div>}
                {loading && <p className="hs-muted">{t('Loading…')}</p>}

                {!loading && !error && items.length === 0 && (
                    <div className="hs-empty mk-empty">
                        <h2>{t('No liked items yet')}</h2>
                        <p>{t('Tap the heart on an item to keep it here and message the seller later.')}</p>
                        <Link to="/marketplace" className="hs-btn">{t('Browse the marketplace')}</Link>
                    </div>
                )}

                <div className="mk-grid mk-grid--wide">
                    {items.map(item => <MarketCard key={item.id} item={item} onLike={onLike} />)}
                </div>
            </main>
        </div>
    );
};

export default LikedItemsPage;

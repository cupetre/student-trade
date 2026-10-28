import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import HousingTabs from './HousingTabs.jsx';
import TenantsPanel from './TenantsPanel.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { useCurrentUser } from '../../lib/useCurrentUser';
import {
    LISTING_TYPES, STATUSES, OWNER_STATUS_CHANGES, STATUS_ACTIONS, formatEuro, formatDate, spotsText,
} from '../../lib/housingOptions';
import './Housing.css';

const MyHousingPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useCurrentUser();

    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [flash, setFlash] = useState(location.state?.flash || '');
    const [busyId, setBusyId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [openTenantsId, setOpenTenantsId] = useState(null);

    // The flash message came in through navigation state; clear it so a
    // refresh doesn't show "Your listing is live" again
    useEffect(() => {
        if (location.state?.flash) navigate(location.pathname, { replace: true, state: null });
    }, [location, navigate]);

    useEffect(() => {
        let cancelled = false;
        apiRequest('/api/housing/mine').then(({ ok, data }) => {
            if (cancelled) return;
            setLoading(false);
            if (ok) setListings(data); else setError(data.error);
        });
        return () => { cancelled = true; };
    }, []);

    const changeStatus = async (listing, status) => {
        setBusyId(listing.id);
        setError('');
        setFlash('');
        const { ok, data } = await apiRequest(`/api/housing/listings/${listing.id}/status`, { method: 'PATCH', body: { status } });
        setBusyId(null);
        if (!ok) { setError(data.error); return; }
        setListings(prev => prev.map(l => (l.id === listing.id ? { ...l, status } : l)));
        setFlash(`“${listing.title}” is now ${STATUSES[status].label.toLowerCase()}.`);
    };

    const deleteListing = async (listing) => {
        setBusyId(listing.id);
        setError('');
        const { ok, data } = await apiRequest(`/api/housing/listings/${listing.id}`, { method: 'DELETE' });
        setBusyId(null);
        setConfirmDeleteId(null);
        if (!ok) { setError(data.error); return; }
        setListings(prev => prev.filter(l => l.id !== listing.id));
        setFlash(`“${listing.title}” was deleted.`);
    };

    const landlordPending = user?.role === 'landlord' && user.landlord_status !== 'approved';

    return (
        <div className="hs-shell">
            <AppNav />
            <main className="hs-page">
                <HousingTabs />
                <header className="hs-head">
                    <h1>My listings</h1>
                    <p>Pause a listing while you’re talking to someone, and mark it filled once the lease is signed.</p>
                </header>

                {landlordPending && (
                    <div className="hs-alert hs-alert--info" role="status">
                        Your landlord account is being reviewed. You can post places as soon as it’s approved.
                    </div>
                )}
                {flash && <div className="hs-alert hs-alert--success" role="status">{flash}</div>}
                {error && <div className="hs-alert hs-alert--error" role="alert">{error}</div>}

                {loading && <p className="hs-muted">Loading…</p>}

                {!loading && listings.length === 0 && !error && (
                    <div className="hs-empty">
                        <h2>You haven’t posted anything yet</h2>
                        <p>
                            {user?.role === 'landlord'
                                ? 'Post your first room or flat. It takes about five minutes.'
                                : 'Moving out, or looking for a flatmate? Post it and students will message you.'}
                        </p>
                        {!landlordPending && <Link to="/housing/new" className="hs-btn">Post a place</Link>}
                    </div>
                )}

                <ul className="hs-mine">
                    {listings.map(listing => {
                        const status = STATUSES[listing.status] || { label: listing.status, tone: 'muted' };
                        const actions = OWNER_STATUS_CHANGES[listing.status] || [];
                        const photo = resolveMediaUrl(listing.photos?.[0]?.url);
                        const busy = busyId === listing.id;

                        return (
                            <li key={listing.id} className="hs-mine-item">
                                <Link to={`/housing/${listing.id}`} className="hs-mine-thumb" tabIndex={-1} aria-hidden="true">
                                    {photo ? <img src={photo} alt="" loading="lazy" /> : <div className="hs-card-noimg" />}
                                </Link>

                                <div className="hs-mine-info">
                                    <div className="hs-mine-top">
                                        <span className={`hs-status hs-status--${status.tone}`}>{status.label}</span>
                                        <span className="hs-muted">{LISTING_TYPES[listing.listing_type]?.badge}</span>
                                    </div>
                                    <Link to={`/housing/${listing.id}`} className="hs-mine-title">{listing.title}</Link>
                                    <p className="hs-muted">
                                        {formatEuro(listing.rent_per_person)} / person · {spotsText(listing)} · {listing.city} · from {formatDate(listing.available_from)}
                                    </p>
                                </div>

                                <div className="hs-mine-actions">
                                    <button type="button" className={`hs-btn hs-btn--small ${openTenantsId === listing.id ? '' : 'hs-btn--ghost'}`}
                                        aria-expanded={openTenantsId === listing.id}
                                        onClick={() => setOpenTenantsId(openTenantsId === listing.id ? null : listing.id)}>
                                        Tenants
                                    </button>
                                    {listing.status !== 'archived' && (
                                        <Link to={`/housing/${listing.id}/edit`} className="hs-btn hs-btn--small hs-btn--ghost">Edit</Link>
                                    )}
                                    {actions.map(next => (
                                        <button key={next} type="button" className="hs-btn hs-btn--small hs-btn--ghost" disabled={busy}
                                            onClick={() => changeStatus(listing, next)}>
                                            {STATUS_ACTIONS[next]}
                                        </button>
                                    ))}
                                    {confirmDeleteId === listing.id ? (
                                        <span className="hs-confirm">
                                            Delete for good?
                                            <button type="button" className="hs-btn hs-btn--small hs-btn--danger" disabled={busy} onClick={() => deleteListing(listing)}>Delete</button>
                                            <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                                        </span>
                                    ) : (
                                        <button type="button" className="hs-btn hs-btn--small hs-btn--text" onClick={() => setConfirmDeleteId(listing.id)}>Delete</button>
                                    )}
                                </div>
                                {openTenantsId === listing.id && <TenantsPanel listing={listing} />}
                            </li>
                        );
                    })}
                </ul>
            </main>
        </div>
    );
};

export default MyHousingPage;

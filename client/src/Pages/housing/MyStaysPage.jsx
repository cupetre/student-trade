import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import Avatar from '../../components/Avatar.jsx';
import ReviewForm from '../../components/ReviewForm.jsx';
import { Stars } from '../../components/Stars.jsx';
import HousingTabs from './HousingTabs.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { formatDate, TENANCY_STATUS } from '../../lib/housingOptions';
import './Housing.css';

const STUDENT_STATUS = {
    ...TENANCY_STATUS,
    pending: { label: 'Please confirm', tone: 'soon' },
    confirmed: { label: 'You live here', tone: 'live' },
};

// Places a landlord said the student lives / lived at. Confirming one
// unlocks reviews in both directions.
const MyStaysPage = () => {
    const [stays, setStays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [reviewingId, setReviewingId] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const load = async () => {
        const { ok, data } = await apiRequest('/api/housing/stays');
        setLoading(false);
        if (ok) setStays(data); else setError(data.error);
    };

    useEffect(() => { load(); }, []);

    const change = async (stay, action) => {
        setBusyId(stay.id);
        setError('');
        const { ok, data } = await apiRequest(`/api/housing/tenancies/${stay.id}`, { method: 'PATCH', body: { action } });
        setBusyId(null);
        if (!ok) { setError(data.error); return; }
        setNotice(action === 'confirm' ? 'Confirmed. You can now review the place and your landlord.' : '');
        load();
    };

    const review = async (stay, input) => {
        const { ok, data } = await apiRequest(`/api/housing/tenancies/${stay.id}/review`, { method: 'POST', body: input });
        if (!ok) return { ok, error: data.error };
        setReviewingId(null);
        setNotice('Thanks! Your review helps other students.');
        load();
        return { ok };
    };

    return (
        <div className="hs-shell">
            <AppNav />
            <main className="hs-page">
                <HousingTabs />
                <header className="hs-head">
                    <h1>My stays</h1>
                    <p>When a landlord adds you as their tenant, it shows up here. Confirm it, and you can review the place and the landlord.</p>
                </header>

                {notice && <div className="hs-alert hs-alert--success" role="status">{notice}</div>}
                {error && <div className="hs-alert hs-alert--error" role="alert">{error}</div>}
                {loading && <p className="hs-muted">Loading…</p>}

                {!loading && !error && stays.length === 0 && (
                    <div className="hs-empty">
                        <h2>No stays yet</h2>
                        <p>Once you move in, ask your landlord to add you as a tenant on Anchor. Then you can leave a review.</p>
                        <Link to="/housing" className="hs-btn">Browse places</Link>
                    </div>
                )}

                <ul className="hs-mine">
                    {stays.map(stay => {
                        const status = STUDENT_STATUS[stay.status] || { label: stay.status, tone: 'muted' };
                        const photo = resolveMediaUrl(stay.listing?.photo);
                        const busy = busyId === stay.id;
                        return (
                            <li key={stay.id} className="hs-mine-item hs-stay">
                                <div className="hs-mine-thumb">
                                    {photo ? <img src={photo} alt="" loading="lazy" /> : <div className="hs-card-noimg" />}
                                </div>
                                <div className="hs-mine-info">
                                    <div className="hs-mine-top">
                                        <span className={`hs-status hs-status--${status.tone}`}>{status.label}</span>
                                        {stay.my_review && <span className="hs-tenant-myreview"><Stars value={stay.my_review.rating} size={13} /> your review</span>}
                                    </div>
                                    {stay.listing
                                        ? <Link to={`/housing/${stay.listing.id}`} className="hs-mine-title">{stay.listing.title}</Link>
                                        : <span className="hs-mine-title">{stay.listing_title} <small className="hs-muted">(listing removed)</small></span>}
                                    {stay.landlord && (
                                        <Link to={`/users/${stay.landlord.id}`} className="hs-stay-landlord">
                                            <Avatar src={resolveMediaUrl(stay.landlord.profile_picture)} name={stay.landlord.fullname} size={22} />
                                            {stay.landlord.fullname}
                                        </Link>
                                    )}
                                    <p className="hs-muted">
                                        Added {formatDate(stay.created_at)}
                                        {stay.ended_at ? ` · moved out ${formatDate(stay.ended_at)}` : ''}
                                    </p>
                                </div>
                                <div className="hs-mine-actions">
                                    {stay.status === 'pending' && (
                                        <>
                                            <button type="button" className="hs-btn hs-btn--small" disabled={busy} onClick={() => change(stay, 'confirm')}>Yes, I live here</button>
                                            <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" disabled={busy} onClick={() => change(stay, 'decline')}>Not me</button>
                                        </>
                                    )}
                                    {stay.can_review && (
                                        <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" onClick={() => setReviewingId(reviewingId === stay.id ? null : stay.id)}>
                                            {stay.my_review ? 'Edit review' : 'Write a review'}
                                        </button>
                                    )}
                                    {stay.status === 'confirmed' && (
                                        <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" disabled={busy} onClick={() => change(stay, 'end')}>I moved out</button>
                                    )}
                                </div>
                                {reviewingId === stay.id && (
                                    <div className="hs-stay-review">
                                        <ReviewForm
                                            initial={stay.my_review}
                                            prompt="How was the place and the landlord?"
                                            placeholder="Was it like the photos? Did repairs get done? Was the deposit returned fairly?"
                                            onCancel={() => setReviewingId(null)}
                                            onSubmit={(input) => review(stay, input)}
                                        />
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </main>
        </div>
    );
};

export default MyStaysPage;

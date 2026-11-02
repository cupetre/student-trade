import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import Avatar from '../../components/Avatar.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { useCurrentUser } from '../../lib/useCurrentUser';
import { NoPhoto } from './MarketCard.jsx';
import { formatEuro, postedAgo, REPORT_REASONS } from './marketOptions';
import '../housing/Housing.css';
import './Market.css';

// Marketplace › one item (/marketplace/:id). Same layout as a housing listing:
// photo, details on the left, price and actions on the right.
const MarketDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useCurrentUser();

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [messaging, setMessaging] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Report form (opens in the side panel)
    const [reportOpen, setReportOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [otherText, setOtherText] = useState('');
    const [reportState, setReportState] = useState('idle'); // idle | sending | sent
    const [reportError, setReportError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        apiRequest(`/api/listings/item/${id}`).then(({ ok, data }) => {
            if (cancelled) return;
            setLoading(false);
            if (ok) setItem(data); else setError(data.error);
        });
        return () => { cancelled = true; };
    }, [id]);

    const isOwner = Boolean(user && item && item.owner_id === user.id);
    const sellerFirstName = item?.owner_name?.split(' ')[0] || 'the seller';

    const handleMessage = async () => {
        setMessaging(true);
        setActionError('');
        const { ok, data } = await apiRequest('/api/messages/create_chat', { method: 'POST', body: { user2_id: item.owner_id } });
        setMessaging(false);
        if (ok && data.chat_id) { navigate(`/chatpage?chatId=${data.chat_id}`); return; }
        setActionError(data.error || "Couldn't open the chat. Please try again.");
    };

    const handleDelete = async () => {
        setDeleting(true);
        setActionError('');
        const { ok, data } = await apiRequest(`/api/listings/delete_listing/${item.id}`, { method: 'DELETE' });
        setDeleting(false);
        if (!ok) { setActionError(data.error); setConfirmDelete(false); return; }
        navigate('/marketplace/mine', { state: { flash: `“${item.title}” was deleted.` } });
    };

    const handleReport = async (e) => {
        e.preventDefault();
        const description = reason === 'Other' ? otherText.trim() : reason;
        if (!description) { setReportError('Choose a reason, or tell us what is wrong.'); return; }
        setReportState('sending');
        setReportError('');
        const { ok, data } = await apiRequest('/api/rr/submit_report', {
            method: 'POST',
            body: { reported_id: item.owner_id, item_id: item.id, description },
        });
        if (ok) { setReportState('sent'); return; }
        setReportState('idle');
        setReportError(data.error);
    };

    if (loading || error || !item) {
        return (
            <div className="hs-shell">
                <AppNav />
                <main className="hs-page">
                    {loading
                        ? <p className="hs-muted">Loading…</p>
                        : (
                            <div className="hs-empty">
                                <h1>Item not found</h1>
                                <p>{error}</p>
                                <Link to="/marketplace" className="hs-btn">Back to the marketplace</Link>
                            </div>
                        )}
                </main>
            </div>
        );
    }

    const photo = resolveMediaUrl(item.photo);

    return (
        <div className="hs-shell">
            <AppNav />
            <main className="hs-page hs-detail">
                <Link to="/marketplace" className="hs-back">← All items</Link>

                <div className="hs-detail-grid">
                    <div className="hs-detail-main">
                        <section className="hs-gallery mk-gallery" aria-label="Photo">
                            <div className="hs-gallery-main">
                                {photo ? <img src={photo} alt={item.title} /> : <NoPhoto />}
                            </div>
                        </section>

                        <div className="hs-detail-head">
                            <h1>{item.title}</h1>
                            <p className="hs-muted">Posted {postedAgo(item.date).toLowerCase()}</p>
                        </div>

                        <section className="hs-section">
                            <h2>About this item</h2>
                            {item.description
                                ? <p className="hs-description">{item.description}</p>
                                : <p className="hs-muted">No description. Ask {sellerFirstName} for details.</p>}
                        </section>
                    </div>

                    <aside className="hs-detail-side">
                        <div className="hs-panel">
                            <div className="hs-panel-price">{formatEuro(item.price)}</div>
                            {actionError && <div className="hs-alert hs-alert--error" role="alert">{actionError}</div>}

                            {isOwner ? (
                                <div className="hs-panel-actions">
                                    <Link to={`/marketplace/${item.id}/edit`} className="hs-btn">Edit item</Link>
                                    {confirmDelete ? (
                                        <span className="hs-confirm">
                                            Delete for good?
                                            <button type="button" className="hs-btn hs-btn--small hs-btn--danger" disabled={deleting} onClick={handleDelete}>Delete</button>
                                            <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
                                        </span>
                                    ) : (
                                        <button type="button" className="hs-btn hs-btn--ghost" onClick={() => setConfirmDelete(true)}>Delete</button>
                                    )}
                                    <Link to="/marketplace/mine" className="hs-btn hs-btn--text">My items</Link>
                                </div>
                            ) : (
                                <div className="hs-panel-actions">
                                    <button type="button" className="hs-btn" onClick={handleMessage} disabled={messaging}>
                                        {messaging ? 'Opening chat…' : `Message ${sellerFirstName}`}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="hs-panel hs-owner">
                            <Avatar src={resolveMediaUrl(item.owner_profile_picture)} name={item.owner_name} size={48} />
                            <div>
                                <Link to={`/users/${item.owner_id}`} className="hs-owner-name">{item.owner_name || 'Seller'}</Link>
                                <span className="hs-tag">Verified student</span>
                            </div>
                        </div>

                        <div className="hs-panel hs-safety">
                            <h2>Buy safely</h2>
                            <ul>
                                <li>Meet in a public place, on campus if you can.</li>
                                <li>Check the item before you pay.</li>
                                <li>Keep the conversation in Kampus messages until you’ve met.</li>
                            </ul>
                        </div>

                        {!isOwner && (
                            <div className="hs-panel mk-report">
                                {reportState === 'sent' ? (
                                    <p role="status">Thanks. We’ll look at this item and act if it breaks the rules.</p>
                                ) : !reportOpen ? (
                                    <button type="button" className="hs-link-btn" onClick={() => setReportOpen(true)} aria-expanded="false">
                                        Report this item
                                    </button>
                                ) : (
                                    <form onSubmit={handleReport} aria-label="Report this item">
                                        <fieldset>
                                            <legend>What’s wrong with it?</legend>
                                            {REPORT_REASONS.map(r => (
                                                <label key={r} className="mk-report-option">
                                                    <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={(e) => { setReason(e.target.value); setReportError(''); }} />
                                                    {r}
                                                </label>
                                            ))}
                                        </fieldset>
                                        {reason === 'Other' && (
                                            <div className="hs-field">
                                                <label htmlFor="mk-report-text">Tell us more</label>
                                                <textarea id="mk-report-text" rows="3" value={otherText} onChange={(e) => setOtherText(e.target.value)} />
                                            </div>
                                        )}
                                        {reportError && <p className="hs-field-error" role="alert">{reportError}</p>}
                                        <div className="mk-report-actions">
                                            <button type="submit" className="hs-btn hs-btn--small" disabled={reportState === 'sending'}>
                                                {reportState === 'sending' ? 'Sending…' : 'Send report'}
                                            </button>
                                            <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" onClick={() => setReportOpen(false)}>Cancel</button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default MarketDetailPage;

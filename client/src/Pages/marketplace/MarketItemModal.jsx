import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../../components/Avatar.jsx';
import ReviewList from '../../components/ReviewList.jsx';
import { RatingSummary } from '../../components/Stars.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { useCurrentUser } from '../../lib/useCurrentUser';
import { NoPhoto, PinIcon } from './MarketCard.jsx';
import {
    formatEuro, postedAgo, REPORT_REASONS, CATEGORIES, CONDITIONS, CONTACT_PREFERENCES,
    MAX_MESSAGE, universityCity, facultyShort,
} from './marketOptions';

// Leaflet only loads when an item with a pick-up spot is opened
const ListingMap = lazy(() => import('../../components/ListingMap.jsx'));

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mk-modal-icon"><path d="M6 6l12 12M18 6 6 18" /></svg>
);

const longDate = (value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/*
  One marketplace item, opened over the browse page (/marketplace/:id).
  Two columns, 70 / 30. Left: title + city, the photo, price, description,
  the facts, then the seller and their reviews. Right: the message box (sends a
  first message that names the item) with "Open chat" under it, and a small
  map of the pick-up area.
  Escape, the × or a click outside closes it.
*/
const MarketItemModal = ({ id, onClose }) => {
    const navigate = useNavigate();
    const { user } = useCurrentUser();
    const [item, setItem] = useState(null);
    const [loadError, setLoadError] = useState('');

    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(null); // chat id after a message went out
    const [contactError, setContactError] = useState('');
    const [opening, setOpening] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [otherText, setOtherText] = useState('');
    const [reportState, setReportState] = useState('idle'); // idle | sending | sent
    const [reportError, setReportError] = useState('');

    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; }, [onClose]);
    const dialogRef = useRef(null);
    const closeBtnRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        setItem(null);
        setLoadError('');
        setSent(null);
        setMessage('');
        apiRequest(`/api/listings/item/${id}`).then(({ ok, data }) => {
            if (cancelled) return;
            if (ok) setItem(data); else setLoadError(data.error || 'This item is no longer available.');
        });
        return () => { cancelled = true; };
    }, [id]);

    // Open: focus the close button, stop the page behind from scrolling, Escape closes,
    // Tab stays inside the window. Close: focus goes back to where it was.
    useEffect(() => {
        const before = document.activeElement;
        closeBtnRef.current?.focus();
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        const onKey = (e) => {
            if (e.key === 'Escape') { closeRef.current(); return; }
            if (e.key !== 'Tab' || !dialogRef.current) return;
            const focusable = dialogRef.current.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
            if (before && typeof before.focus === 'function') before.focus();
        };
    }, []);

    const isOwner = Boolean(user && item && item.owner_id === user.id);
    const seller = item?.seller;
    const firstName = (seller?.fullname || item?.owner_name || 'the seller').split(' ')[0];

    const contact = async ({ withMessage }) => {
        const text = withMessage ? message.trim() : '';
        if (withMessage && !text) { setContactError(`Write a message to ${firstName} first.`); return; }
        setContactError('');
        if (withMessage) setSending(true); else setOpening(true);
        const { ok, data } = await apiRequest(`/api/listings/item/${item.id}/contact`, { method: 'POST', body: text ? { message: text } : {} });
        setSending(false);
        setOpening(false);
        if (!ok) { setContactError(data.error || 'Couldn’t reach the seller. Please try again.'); return; }
        if (withMessage) { setSent(data.chat_id); setMessage(''); return; }
        navigate(`/chatpage?chatId=${data.chat_id}`);
    };

    const handleDelete = async () => {
        setDeleting(true);
        const { ok, data } = await apiRequest(`/api/listings/delete_listing/${item.id}`, { method: 'DELETE' });
        setDeleting(false);
        if (!ok) { setContactError(data.error); setConfirmDelete(false); return; }
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

    const photo = item && resolveMediaUrl(item.photo);
    const place = item && [item.pickup_area, item.city].filter(Boolean).join(', ');
    const condition = item && CONDITIONS[item.condition];
    const contactPref = item && CONTACT_PREFERENCES[item.contact_preference || 'message'];
    const hasMap = Boolean(item && (item.location || (isOwner && item.exact_location)));
    const studyLine = seller && [universityCity(seller.university), facultyShort(seller.faculty)].filter(Boolean).join(' · ');

    return (
        <div className="mk-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="mk-modal" role="dialog" aria-modal="true" aria-labelledby="mk-modal-title" ref={dialogRef}>
                <button type="button" className="mk-modal-close" onClick={onClose} ref={closeBtnRef} aria-label="Close">
                    <CloseIcon />
                </button>

                {!item && !loadError && <p className="mk-modal-status" id="mk-modal-title">Loading…</p>}
                {loadError && (
                    <div className="mk-modal-status">
                        <h2 id="mk-modal-title">Item not found</h2>
                        <p>{loadError}</p>
                        <button type="button" className="hs-btn" onClick={onClose}>Back to the marketplace</button>
                    </div>
                )}

                {item && (
                    <div className="mk-modal-grid">
                        {/* ---------- the item ---------- */}
                        <div className="mk-modal-main">
                            <div className="mk-modal-titlerow">
                                <h2 id="mk-modal-title">{item.title}</h2>
                            </div>
                            <div className="mk-modal-photo">
                                {photo ? <img src={photo} alt={item.title} /> : <NoPhoto />}
                            </div>

                            <div className="mk-modal-pricerow">
                                <p className="mk-modal-price">{Number(item.price) === 0 ? 'Free' : formatEuro(item.price)}</p>
                                {item.date && (
                                    <time className="mk-modal-posted" dateTime={item.date} title={longDate(item.date)}>
                                        Posted {postedAgo(item.date).toLowerCase()}
                                    </time>
                                )}
                            </div>

                            {item.description
                                ? <p className="mk-modal-description">{item.description}</p>
                                : <p className="hs-muted">No description. Ask {firstName} for details.</p>}

                            <dl className="mk-facts">
                                <div>
                                    <dt>Condition</dt>
                                    <dd>{condition ? <>{condition.label}<small>{condition.hint}</small></> : 'Not given'}</dd>
                                </div>
                                <div>
                                    <dt>Category</dt>
                                    <dd>{CATEGORIES[item.category] || 'Other'}</dd>
                                </div>
                                <div>
                                    <dt>Pick-up</dt>
                                    <dd>{place || 'Ask the seller'}</dd>
                                </div>
                            </dl>

                        </div>

                        {/* ---------- contact ---------- */}
                        <aside className="mk-modal-side">
                            {isOwner ? (
                                <div className="mk-contact">
                                    <h3>This is your item</h3>
                                    <div className="mk-contact-actions">
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
                                    </div>
                                    {contactError && <div className="hs-alert hs-alert--error" role="alert">{contactError}</div>}
                                </div>
                            ) : (
                                <form className="mk-contact" onSubmit={(e) => { e.preventDefault(); contact({ withMessage: true }); }}>
                                    <h3>Message {firstName}</h3>
                                    {contactPref && (
                                        <p className="mk-contact-pref">
                                            <strong>{firstName} prefers:</strong> {contactPref.label.toLowerCase()}. {contactPref.hint}.
                                        </p>
                                    )}
                                    {sent ? (
                                        <div className="mk-contact-sent" role="status">
                                            <strong>Sent.</strong> {firstName} sees it in Messages.
                                        </div>
                                    ) : (
                                        <>
                                            <label htmlFor="mk-message" className="hs-visually-hidden">Message to {firstName}</label>
                                            <textarea
                                                id="mk-message"
                                                rows={4}
                                                maxLength={MAX_MESSAGE}
                                                placeholder={`Hi ${firstName}, is it still available?`}
                                                value={message}
                                                onChange={(e) => { setMessage(e.target.value); if (contactError) setContactError(''); }}
                                            />
                                            <button type="submit" className="hs-btn hs-btn--block" disabled={sending}>
                                                {sending ? 'Sending…' : 'Send message'}
                                            </button>
                                        </>
                                    )}
                                    {contactError && <div className="hs-alert hs-alert--error" role="alert">{contactError}</div>}
                                    <button
                                        type="button"
                                        className="hs-btn hs-btn--ghost hs-btn--block"
                                        onClick={() => (sent ? navigate(`/chatpage?chatId=${sent}`) : contact({ withMessage: false }))}
                                        disabled={opening}
                                    >
                                        {opening ? 'Opening…' : `Open chat with ${firstName}`}
                                    </button>
                                    <p className="hs-hint">Your number stays private. Meet in a public place and check the item before you pay.</p>
                                </form>
                            )}

                            {hasMap && (
                                <section className="mk-modal-section mk-map-card" aria-label="Where to pick it up">
                                    <h3>Pick-up area</h3>
                                    {place && <p className="mk-map-place"><PinIcon />{place}</p>}
                                    <Suspense fallback={<div className="hs-listing-map mk-modal-map hs-map-loading">Loading map…</div>}>
                                        <div className="mk-modal-map">
                                            <ListingMap location={item.location} exactLocation={isOwner ? item.exact_location : null} />
                                        </div>
                                    </Suspense>
                                    <p className="hs-hint">
                                        {isOwner ? 'You see your exact pin. Buyers see the shaded area.' : 'The circle shows the area. The exact spot is agreed in messages.'}
                                    </p>
                                </section>
                            )}

                            {!isOwner && (
                                <div className="mk-report">
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

                        {/* ---------- the seller ---------- */}
                        <section className="mk-seller" aria-labelledby="mk-seller-title">
                            <h3 id="mk-seller-title" className="mk-seller-heading">Seller</h3>
                            {seller && (
                                <div className="mk-seller-card">
                                    <Avatar src={resolveMediaUrl(seller.profile_picture)} name={seller.fullname} size={72} />
                                    <div className="mk-seller-text">
                                        <Link to={`/users/${seller.id}`} className="mk-seller-name">{seller.fullname}</Link>
                                        <p className="mk-seller-study">
                                            {studyLine || (seller.is_student ? 'Verified student' : '')}
                                            {seller.age ? `${studyLine || seller.is_student ? ' · ' : ''}${seller.age} years old` : ''}
                                        </p>
                                        <RatingSummary rating={seller.rating} size={14} />
                                    </div>
                                    <Link to={`/users/${seller.id}`} className="hs-btn hs-btn--ghost hs-btn--small mk-seller-link">View profile</Link>
                                </div>
                            )}

                            <div className="mk-seller-reviews">
                                <h4>What people say about {firstName}</h4>
                                <ReviewList
                                    reviews={item.seller_reviews || []}
                                    emptyText={`No reviews yet. People can review ${firstName} after they’ve talked or traded.`}
                                    myId={user?.id}
                                />
                            </div>

                        </section>

                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketItemModal;

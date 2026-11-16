import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../../components/Avatar.jsx';
import ReviewList from '../../components/ReviewList.jsx';
import { RatingSummary } from '../../components/Stars.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { useCurrentUser } from '../../lib/useCurrentUser';
import { useT, localeFor } from '../../lib/i18n';
import { rememberReturn } from '../../lib/returnTo';
import { NoPhoto, PinIcon, HeartIcon } from './MarketCard.jsx';
import {
    postedAgo, priceText, REPORT_REASONS, CATEGORIES, CONDITIONS, CONTACT_PREFERENCES,
    MAX_MESSAGE, universityCity, facultyShort,
} from './marketOptions';

// Leaflet only loads when an item with a pick-up spot is opened
const ListingMap = lazy(() => import('../../components/ListingMap.jsx'));

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mk-modal-icon"><path d="M6 6l12 12M18 6 6 18" /></svg>
);

const longDate = (value, lang) => new Date(value).toLocaleDateString(localeFor(lang), { day: 'numeric', month: 'long', year: 'numeric' });

/*
  One marketplace item, opened over the browse page (/marketplace/:id).
  Two columns, 70 / 30. Left: title, the photo, price | posted, description,
  the facts, then the seller and their reviews. Right: the message box (sends a
  first message that names the item) with "Open chat" and Like under it, a small
  map of the pick-up area, and "Report this item" at the bottom.
  The seller sees Edit / Mark as sold / Delete instead of the message box.
  A visitor without an account (`guest`) sees the item without the seller, the
  description or the map, and a "join" box in place of the message box.
  Escape, the × or a click outside closes it.
*/
const MarketItemModal = ({ id, onClose, guest = false, onLikeChange }) => {
    const navigate = useNavigate();
    const t = useT();
    const { user } = useCurrentUser();
    const [item, setItem] = useState(null);
    const [loadError, setLoadError] = useState('');

    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(null); // chat id after a message went out
    const [contactError, setContactError] = useState('');
    const [opening, setOpening] = useState(false);
    const [liking, setLiking] = useState(false);
    const [statusBusy, setStatusBusy] = useState(false);

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
        apiRequest(guest ? `/api/public/market/${id}` : `/api/listings/item/${id}`).then(({ ok, data }) => {
            if (cancelled) return;
            if (ok) setItem(data); else setLoadError(data.error || t('This item is no longer available.'));
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, guest]);

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
    const sold = item?.status === 'sold';
    const seller = item?.seller;
    const firstName = (seller?.fullname || item?.owner_name || t('the seller')).split(' ')[0];

    const contact = async ({ withMessage }) => {
        const text = withMessage ? message.trim() : '';
        if (withMessage && !text) { setContactError(t('Write a message to {name} first.', { name: firstName })); return; }
        setContactError('');
        if (withMessage) setSending(true); else setOpening(true);
        const { ok, data } = await apiRequest(`/api/listings/item/${item.id}/contact`, { method: 'POST', body: text ? { message: text } : {} });
        setSending(false);
        setOpening(false);
        if (!ok) { setContactError(data.error || t('Couldn’t reach the seller. Please try again.')); return; }
        if (withMessage) { setSent(data.chat_id); setMessage(''); return; }
        navigate(`/chatpage?chatId=${data.chat_id}`);
    };

    const toggleLike = async () => {
        if (liking) return;
        const next = !item.is_saved;
        setLiking(true);
        setItem(prev => ({ ...prev, is_saved: next }));
        onLikeChange?.(item.id, next);
        const { ok, data } = await apiRequest(`/api/listings/item/${item.id}/save`, { method: next ? 'POST' : 'DELETE' });
        setLiking(false);
        if (!ok) {
            setItem(prev => ({ ...prev, is_saved: !next }));
            onLikeChange?.(item.id, !next);
            setContactError(data.error);
        }
    };

    // The seller: sold items leave the browse page; "Put back on sale" returns them
    const setStatus = async (status) => {
        setStatusBusy(true);
        setContactError('');
        const { ok, data } = await apiRequest(`/api/listings/item/${item.id}/status`, { method: 'PATCH', body: { status } });
        setStatusBusy(false);
        if (!ok) { setContactError(data.error); return; }
        setItem(prev => ({ ...prev, status }));
    };

    const handleDelete = async () => {
        setDeleting(true);
        const { ok, data } = await apiRequest(`/api/listings/delete_listing/${item.id}`, { method: 'DELETE' });
        setDeleting(false);
        if (!ok) { setContactError(data.error); setConfirmDelete(false); return; }
        navigate('/marketplace/mine', { state: { flash: t('“{title}” was deleted.', { title: item.title }) } });
    };

    const handleReport = async (e) => {
        e.preventDefault();
        const description = reason === 'Other' ? otherText.trim() : reason;
        if (!description) { setReportError(t('Choose a reason, or tell us what is wrong.')); return; }
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
    const hasMap = Boolean(item && !guest && (item.location || (isOwner && item.exact_location)));
    const studyLine = seller && [universityCity(seller.university), facultyShort(seller.faculty)].filter(Boolean).join(' · ');
    const here = `/marketplace/${id}${window.location.search}`;

    return (
        <div className="mk-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="mk-modal" role="dialog" aria-modal="true" aria-labelledby="mk-modal-title" ref={dialogRef}>
                <button type="button" className="mk-modal-close" onClick={onClose} ref={closeBtnRef} aria-label={t('Close')}>
                    <CloseIcon />
                </button>

                {!item && !loadError && <p className="mk-modal-status" id="mk-modal-title">{t('Loading…')}</p>}
                {loadError && (
                    <div className="mk-modal-status">
                        <h2 id="mk-modal-title">{t('Item not found')}</h2>
                        <p>{t(loadError)}</p>
                        <button type="button" className="hs-btn" onClick={onClose}>{t('Back to the marketplace')}</button>
                    </div>
                )}

                {item && (
                    <div className="mk-modal-grid">
                        {/* ---------- the item ---------- */}
                        <div className="mk-modal-main">
                            <div className="mk-modal-titlerow">
                                <h2 id="mk-modal-title">{item.title}</h2>
                                {sold && <span className="mk-sold-tag">{t('Sold')}</span>}
                            </div>
                            <div className="mk-modal-photo">
                                {photo ? <img src={photo} alt={item.title} /> : <NoPhoto />}
                            </div>

                            <div className="mk-modal-pricerow">
                                <p className="mk-modal-price">{priceText(item.price, t)}</p>
                                {item.date && (
                                    <time className="mk-modal-posted" dateTime={item.date} title={longDate(item.date, t.lang)}>
                                        {t('Posted {when}', { when: postedAgo(item.date, t).toLowerCase() })}
                                    </time>
                                )}
                            </div>

                            {guest
                                ? <p className="mk-modal-locked">{t('The description, the pick-up spot and the seller show once you have an account.')}</p>
                                : item.description
                                    ? <p className="mk-modal-description">{item.description}</p>
                                    : <p className="hs-muted">{t('No description. Ask {name} for details.', { name: firstName })}</p>}

                            <dl className="mk-facts">
                                <div>
                                    <dt>{t('Condition')}</dt>
                                    <dd>{condition ? <>{t(condition.label)}<small>{t(condition.hint)}</small></> : t('Not given')}</dd>
                                </div>
                                <div>
                                    <dt>{t('Category')}</dt>
                                    <dd>{t(CATEGORIES[item.category] || 'Other')}</dd>
                                </div>
                                <div>
                                    <dt>{guest ? t('City') : t('Pick-up')}</dt>
                                    <dd>{guest ? (item.city || t('Not given')) : (place || t('Ask the seller'))}</dd>
                                </div>
                            </dl>

                        </div>

                        {/* ---------- contact ---------- */}
                        <aside className="mk-modal-side">
                            {guest ? (
                                <div className="mk-contact mk-join">
                                    <h3>{sold ? t('This item has been sold') : t('Want it?')}</h3>
                                    <p>{t('Create a free account to see who’s selling and message them. Only verified students can contact people here.')}</p>
                                    <Link to="/register" className="hs-btn hs-btn--block mk-join-main" onClick={() => rememberReturn(here)}>{t('Sign up')}</Link>
                                    <Link to="/login" state={{ from: here }} className="hs-btn hs-btn--ghost hs-btn--block" onClick={() => rememberReturn(here)}>{t('Log in')}</Link>
                                </div>
                            ) : isOwner ? (
                                <div className="mk-contact">
                                    <h3>{t('This is your item')}</h3>
                                    <div className="mk-contact-actions">
                                        <Link to={`/marketplace/${item.id}/edit`} className="hs-btn">{t('Edit item')}</Link>
                                        <button type="button" className="hs-btn hs-btn--ghost" disabled={statusBusy} onClick={() => setStatus(sold ? 'available' : 'sold')}>
                                            {sold ? t('Put back on sale') : t('Mark as sold')}
                                        </button>
                                        {confirmDelete ? (
                                            <span className="hs-confirm">
                                                {t('Delete for good?')}
                                                <button type="button" className="hs-btn hs-btn--small hs-btn--danger" disabled={deleting} onClick={handleDelete}>{t('Delete')}</button>
                                                <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" onClick={() => setConfirmDelete(false)}>{t('Cancel')}</button>
                                            </span>
                                        ) : (
                                            <button type="button" className="hs-btn hs-btn--ghost" onClick={() => setConfirmDelete(true)}>{t('Delete')}</button>
                                        )}
                                    </div>
                                    {sold && <p className="hs-hint">{t('Sold items are hidden from the marketplace. People you talked to can still see it.')}</p>}
                                    {contactError && <div className="hs-alert hs-alert--error" role="alert">{t(contactError)}</div>}
                                </div>
                            ) : (
                                <form className="mk-contact" onSubmit={(e) => { e.preventDefault(); contact({ withMessage: true }); }}>
                                    <h3>{sold ? t('This item has been sold') : t('Message {name}', { name: firstName })}</h3>
                                    {!sold && contactPref && (
                                        <p className="mk-contact-pref">
                                            <strong>{t('{name} prefers:', { name: firstName })}</strong> {t(contactPref.label).toLowerCase()}. {t(contactPref.hint)}.
                                        </p>
                                    )}
                                    {sold ? null : sent ? (
                                        <div className="mk-contact-sent" role="status">
                                            <strong>{t('Sent.')}</strong> {t('{name} sees it in Messages.', { name: firstName })}
                                        </div>
                                    ) : (
                                        <>
                                            <label htmlFor="mk-message" className="hs-visually-hidden">{t('Message to {name}', { name: firstName })}</label>
                                            <textarea
                                                id="mk-message"
                                                rows={4}
                                                maxLength={MAX_MESSAGE}
                                                placeholder={t('Hi {name}, is it still available?', { name: firstName })}
                                                value={message}
                                                onChange={(e) => { setMessage(e.target.value); if (contactError) setContactError(''); }}
                                            />
                                            <button type="submit" className="hs-btn hs-btn--block" disabled={sending}>
                                                {sending ? t('Sending…') : t('Send message')}
                                            </button>
                                        </>
                                    )}
                                    {contactError && <div className="hs-alert hs-alert--error" role="alert">{t(contactError)}</div>}
                                    <button
                                        type="button"
                                        className="hs-btn hs-btn--ghost hs-btn--block"
                                        onClick={() => (sent ? navigate(`/chatpage?chatId=${sent}`) : contact({ withMessage: false }))}
                                        disabled={opening}
                                    >
                                        {opening ? t('Opening…') : t('Open chat with {name}', { name: firstName })}
                                    </button>
                                    <button
                                        type="button"
                                        className={`hs-btn hs-btn--ghost hs-btn--block mk-like-btn ${item.is_saved ? 'is-on' : ''}`}
                                        aria-pressed={Boolean(item.is_saved)}
                                        onClick={toggleLike}
                                        disabled={liking}
                                    >
                                        <HeartIcon on={Boolean(item.is_saved)} />{item.is_saved ? t('Liked') : t('Like')}
                                    </button>
                                    <p className="hs-hint">{t('Your number stays private. Meet in a public place and check the item before you pay.')}</p>
                                </form>
                            )}

                            {hasMap && (
                                <section className="mk-modal-section mk-map-card" aria-label={t('Where to pick it up')}>
                                    <h3>{t('Pick-up area')}</h3>
                                    {place && <p className="mk-map-place"><PinIcon />{place}</p>}
                                    <Suspense fallback={<div className="hs-listing-map mk-modal-map hs-map-loading">{t('Loading map…')}</div>}>
                                        <div className="mk-modal-map">
                                            <ListingMap location={item.location} exactLocation={isOwner ? item.exact_location : null} />
                                        </div>
                                    </Suspense>
                                    <p className="hs-hint">
                                        {isOwner ? t('You see your exact pin. Buyers see the shaded area.') : t('The circle shows the area. The exact spot is agreed in messages.')}
                                    </p>
                                </section>
                            )}

                            {!isOwner && !guest && (
                                <div className="mk-report">
                                    {reportState === 'sent' ? (
                                        <p role="status">{t('Thanks. We’ll look at this item and act if it breaks the rules.')}</p>
                                    ) : !reportOpen ? (
                                        <button type="button" className="hs-link-btn" onClick={() => setReportOpen(true)} aria-expanded="false">
                                            {t('Report this item')}
                                        </button>
                                    ) : (
                                        <form onSubmit={handleReport} aria-label={t('Report this item')}>
                                            <fieldset>
                                                <legend>{t('What’s wrong with it?')}</legend>
                                                {REPORT_REASONS.map(r => (
                                                    <label key={r} className="mk-report-option">
                                                        <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={(e) => { setReason(e.target.value); setReportError(''); }} />
                                                        {t(r)}
                                                    </label>
                                                ))}
                                            </fieldset>
                                            {reason === 'Other' && (
                                                <div className="hs-field">
                                                    <label htmlFor="mk-report-text">{t('Tell us more')}</label>
                                                    <textarea id="mk-report-text" rows="3" value={otherText} onChange={(e) => setOtherText(e.target.value)} />
                                                </div>
                                            )}
                                            {reportError && <p className="hs-field-error" role="alert">{t(reportError)}</p>}
                                            <div className="mk-report-actions">
                                                <button type="submit" className="hs-btn hs-btn--small" disabled={reportState === 'sending'}>
                                                    {reportState === 'sending' ? t('Sending…') : t('Send report')}
                                                </button>
                                                <button type="button" className="hs-btn hs-btn--small hs-btn--ghost" onClick={() => setReportOpen(false)}>{t('Cancel')}</button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}
                        </aside>

                        {/* ---------- the seller ---------- */}
                        {!guest && (
                            <section className="mk-seller" aria-labelledby="mk-seller-title">
                                <h3 id="mk-seller-title" className="mk-seller-heading">{t('Seller')}</h3>
                                {seller && (
                                    <div className="mk-seller-card">
                                        <Avatar src={resolveMediaUrl(seller.profile_picture)} name={seller.fullname} size={72} />
                                        <div className="mk-seller-text">
                                            <Link to={`/users/${seller.id}`} className="mk-seller-name">{seller.fullname}</Link>
                                            <p className="mk-seller-study">
                                                {studyLine || (seller.is_student ? t('Verified student') : '')}
                                                {seller.age ? `${studyLine || seller.is_student ? ' · ' : ''}${t('{n} years old', { n: seller.age })}` : ''}
                                            </p>
                                            <RatingSummary rating={seller.rating} size={14} />
                                        </div>
                                        <Link to={`/users/${seller.id}`} className="hs-btn hs-btn--ghost hs-btn--small mk-seller-link">{t('View profile')}</Link>
                                    </div>
                                )}

                                <div className="mk-seller-reviews">
                                    <h4>{t('What people say about {name}', { name: firstName })}</h4>
                                    <ReviewList
                                        reviews={item.seller_reviews || []}
                                        emptyText={t('No reviews yet. People can review {name} after they’ve talked or traded.', { name: firstName })}
                                        myId={user?.id}
                                    />
                                </div>
                            </section>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketItemModal;

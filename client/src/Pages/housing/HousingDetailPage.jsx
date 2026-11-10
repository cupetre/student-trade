import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import SceneBackdrop from '../../components/SceneBackdrop.jsx';
import Avatar from '../../components/Avatar.jsx';
import { RatingSummary } from '../../components/Stars.jsx';
import InterestPanel from './InterestPanel.jsx';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { useCurrentUser } from '../../lib/useCurrentUser';
import {
    LISTING_TYPES, PROPERTY_TYPES, FURNISHING, AMENITIES, LANGUAGES, STATUSES,
    formatEuro, formatDate, spotsText,
} from '../../lib/housingOptions';
import './Housing.css';

// Leaflet only loads when someone opens the Location tab
const ListingMap = lazy(() => import('../../components/ListingMap.jsx'));

// The three tabs under the photo. The open one is kept in the address
// (?tab=location), so a link can open a listing straight on its map or contact form.
const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'location', label: 'Location' },
    { key: 'contact', label: 'Contact' },
];

function mapsLink(listing) {
    const address = [listing.street, listing.postal_code, listing.city, 'Slovenia'].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

const Fact = ({ label, children }) => (
    <div className="hs-fact">
        <dt>{label}</dt>
        <dd>{children}</dd>
    </div>
);

const HousingDetailPage = () => {
    const { id } = useParams();
    const { user } = useCurrentUser();
    const [params, setParams] = useSearchParams();
    const tab = TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'overview';
    const tabsRef = useRef(null);

    function openTab(key, { focus = false, scroll = false } = {}) {
        const next = new URLSearchParams(window.location.search);
        if (key === 'overview') next.delete('tab'); else next.set('tab', key);
        setParams(next, { replace: true }); // switching tabs shouldn't fill up the back button
        if (scroll) tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (focus) requestAnimationFrame(() => document.getElementById(`hs-tab-${key}`)?.focus());
    }

    // Left / right arrow keys move between tabs, like any tab strip
    function onTabKey(e) {
        const index = TABS.findIndex(t => t.key === tab);
        let next = null;
        if (e.key === 'ArrowRight') next = TABS[(index + 1) % TABS.length];
        if (e.key === 'ArrowLeft') next = TABS[(index - 1 + TABS.length) % TABS.length];
        if (e.key === 'Home') next = TABS[0];
        if (e.key === 'End') next = TABS[TABS.length - 1];
        if (next) { e.preventDefault(); openTab(next.key, { focus: true }); }
    }

    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [photoIndex, setPhotoIndex] = useState(0);
    const [actionError, setActionError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        apiRequest(`/api/housing/listings/${id}`).then(({ ok, status, data }) => {
            if (cancelled) return;
            setLoading(false);
            if (ok) { setListing(data); setPhotoIndex(0); return; }
            setError(status === 404 ? 'This place doesn’t exist or isn’t available anymore.' : data.error);
        });
        return () => { cancelled = true; };
    }, [id]);

    // Reviews belong to people (the landlord, the tenant), not to listings,
    // so a listing page shows the owner's rating and nothing else.

    const isOwner = Boolean(user && listing && listing.owner_id === user.id);

    const handleSave = async () => {
        const was = listing.is_saved;
        setListing(prev => ({ ...prev, is_saved: !was }));
        const { ok } = await apiRequest(`/api/housing/listings/${listing.id}/save`, { method: was ? 'DELETE' : 'POST' });
        if (!ok) {
            setListing(prev => ({ ...prev, is_saved: was }));
            setActionError("Couldn't update your liked listings. Please try again.");
        }
    };

    if (loading || error || !listing) {
        return (
            <div className="hs-shell">
                <AppNav /><SceneBackdrop />
                <main className="hs-page">
                    {loading
                        ? <p className="hs-muted">Loading…</p>
                        : (
                            <div className="hs-empty">
                                <h1>Place not found</h1>
                                <p>{error}</p>
                                <Link to="/housing" className="hs-btn">Back to housing</Link>
                            </div>
                        )}
                </main>
            </div>
        );
    }

    const photos = listing.photos || [];
    const current = photos[photoIndex];
    const type = LISTING_TYPES[listing.listing_type];
    const status = STATUSES[listing.status];
    const owner = listing.owner;

    const bills = listing.utilities_included
        ? 'Included in the rent'
        : listing.utilities_estimate !== null && listing.utilities_estimate !== undefined
            ? `About ${formatEuro(listing.utilities_estimate)} / month extra`
            : 'Paid separately';
    const billsShort = listing.utilities_included
        ? 'Bills included'
        : listing.utilities_estimate !== null && listing.utilities_estimate !== undefined
            ? `Bills ~${formatEuro(listing.utilities_estimate)} / month`
            : 'Bills extra';

    const rules = [
        { on: listing.address_registration_allowed, yes: 'You can register your address here', no: 'Address registration not offered' },
        { on: listing.subsidy_eligible, yes: 'Student housing subsidy possible', no: null },
        { on: listing.smoking_allowed, yes: 'Smoking allowed', no: 'No smoking' },
        { on: listing.pets_allowed, yes: 'Pets allowed', no: 'No pets' },
    ].filter(rule => rule.on || rule.no);

    const hasMapPoint = Boolean(
        (isOwner && listing.exact_location?.latitude !== undefined && listing.exact_location?.latitude !== null)
        || (listing.location?.latitude !== undefined && listing.location?.latitude !== null),
    );

    return (
        <div className="hs-shell">
            <AppNav /><SceneBackdrop />
            <main className="hs-page hs-detail">
                <Link to="/housing" className="hs-back">← All places</Link>

                {isOwner && listing.status !== 'active' && (
                    <div className={`hs-alert hs-alert--${status?.tone === 'error' ? 'error' : 'info'}`} role="status">
                        This listing is <strong>{status?.label?.toLowerCase() || listing.status}</strong>, so students can’t see it in search.
                        {' '}<Link to="/housing/mine">Manage it in My listings</Link>.
                    </div>
                )}

                <div className="hs-detail-grid">
                    <article className="hs-sheet hs-detail-main">
                        <section className="hs-gallery" aria-label="Photos">
                            <div className="hs-gallery-main">
                                {current
                                    ? <img src={resolveMediaUrl(current.url)} alt={`Photo ${photoIndex + 1} of ${photos.length}`} />
                                    : <div className="hs-card-noimg" aria-hidden="true" />}
                                {photos.length > 1 && (
                                    <>
                                        <button type="button" className="hs-gallery-nav hs-gallery-nav--prev" aria-label="Previous photo"
                                            onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}>‹</button>
                                        <button type="button" className="hs-gallery-nav hs-gallery-nav--next" aria-label="Next photo"
                                            onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}>›</button>
                                        <span className="hs-gallery-count">{photoIndex + 1} / {photos.length}</span>
                                    </>
                                )}
                            </div>
                            {photos.length > 1 && (
                                <div className="hs-thumbs">
                                    {photos.map((photo, index) => (
                                        <button
                                            key={photo.id}
                                            type="button"
                                            className={index === photoIndex ? 'is-current' : ''}
                                            onClick={() => setPhotoIndex(index)}
                                            aria-label={`Show photo ${index + 1}`}
                                        >
                                            <img src={resolveMediaUrl(photo.url)} alt="" loading="lazy" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div className="hs-detail-head">
                            {type && <span className={`hs-badge hs-badge--inline hs-badge--${listing.listing_type}`}>{type.badge}</span>}
                            <h1>{listing.title}</h1>
                            <p className="hs-muted">
                                {PROPERTY_TYPES[listing.property_type]} · {spotsText(listing)} · {listing.neighbourhood ? `${listing.neighbourhood}, ` : ''}{listing.city}
                            </p>
                        </div>

                        <div className="hs-dtabs" role="tablist" aria-label="About this place" ref={tabsRef} onKeyDown={onTabKey}>
                            {TABS.map(t => (
                                <button
                                    key={t.key}
                                    id={`hs-tab-${t.key}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === t.key}
                                    aria-controls={`hs-tabpanel-${t.key}`}
                                    tabIndex={tab === t.key ? 0 : -1}
                                    className={tab === t.key ? 'is-active' : ''}
                                    onClick={() => openTab(t.key)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {tab === 'overview' && (
                            <div className="hs-dtab-panel" role="tabpanel" id="hs-tabpanel-overview" aria-labelledby="hs-tab-overview">
                                <dl className="hs-facts">
                                    <Fact label="Rent">{formatEuro(listing.rent_per_person)} {listing.spots_total > 1 ? 'per person / month' : '/ month'}</Fact>
                                    <Fact label="Deposit">{listing.deposit !== null && listing.deposit !== undefined ? formatEuro(listing.deposit) : 'Ask the owner'}</Fact>
                                    <Fact label="Bills">{bills}</Fact>
                                    <Fact label="Available">
                                        From {formatDate(listing.available_from)}
                                        {listing.available_until ? ` to ${formatDate(listing.available_until)}` : ''}
                                    </Fact>
                                    {listing.min_stay_months && <Fact label="Minimum stay">{listing.min_stay_months} {listing.min_stay_months === 1 ? 'month' : 'months'}</Fact>}
                                    <Fact label="Furnishing">{FURNISHING[listing.furnishing]}</Fact>
                                    {listing.total_rooms && <Fact label="Rooms">{listing.total_rooms}</Fact>}
                                    {listing.bathrooms !== null && listing.bathrooms !== undefined && <Fact label="Bathrooms">{listing.bathrooms}</Fact>}
                                    {listing.area_m2 && <Fact label="Size">{listing.area_m2} m²</Fact>}
                                </dl>

                                {listing.description && (
                                    <section className="hs-section">
                                        <h2>About this place</h2>
                                        <p className="hs-description">{listing.description}</p>
                                    </section>
                                )}

                                <section className="hs-section">
                                    <h2>House rules</h2>
                                    <ul className="hs-rules">
                                        {rules.map(rule => (
                                            <li key={rule.yes} className={rule.on ? 'is-yes' : 'is-no'}>{rule.on ? rule.yes : rule.no}</li>
                                        ))}
                                    </ul>
                                </section>

                                {listing.amenities?.length > 0 && (
                                    <section className="hs-section">
                                        <h2>What’s included</h2>
                                        <div className="hs-chips">
                                            {listing.amenities.map(a => <span key={a} className="hs-chip">{AMENITIES[a] || a}</span>)}
                                        </div>
                                    </section>
                                )}

                                {listing.video_tour_url && (
                                    <section className="hs-section">
                                        <h2>Video tour</h2>
                                        <a href={listing.video_tour_url} target="_blank" rel="noopener noreferrer" className="hs-link">Watch the video tour ↗</a>
                                    </section>
                                )}
                            </div>
                        )}

                        {tab === 'location' && (
                            <div className="hs-dtab-panel" role="tabpanel" id="hs-tabpanel-location" aria-labelledby="hs-tab-location">
                                <div className="hs-location-head">
                                    <p className="hs-location-address">
                                        <strong>{listing.street}</strong>
                                        <span>{[listing.postal_code, listing.city].filter(Boolean).join(' ')}{listing.neighbourhood ? ` · ${listing.neighbourhood}` : ''}</span>
                                    </p>
                                    <a href={mapsLink(listing)} target="_blank" rel="noopener noreferrer" className="hs-link">Open in Google Maps ↗</a>
                                </div>
                                {hasMapPoint ? (
                                    <Suspense fallback={<div className="hs-listing-map hs-map-loading">Loading map…</div>}>
                                        <ListingMap location={listing.location} exactLocation={isOwner ? listing.exact_location : null} />
                                    </Suspense>
                                ) : (
                                    <div className="hs-listing-map hs-map-loading">
                                        {isOwner
                                            ? <span>Not on the map yet. <Link to={`/housing/${listing.id}/edit`}>Place the pin</Link></span>
                                            : 'Not on the map yet.'}
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'contact' && (
                            <div className="hs-dtab-panel hs-contact" role="tabpanel" id="hs-tabpanel-contact" aria-labelledby="hs-tab-contact">
                                {owner && (
                                    <section className="hs-owner-card" aria-label="Who posted this">
                                        <Avatar src={resolveMediaUrl(owner.profile_picture)} name={owner.fullname} size={64} />
                                        <div className="hs-owner-card-text">
                                            <Link to={`/users/${owner.id}`} className="hs-owner-name">{owner.fullname}</Link>
                                            <div className="hs-owner-tags">
                                                {owner.verified_landlord && <span className="hs-tag hs-tag--good">Verified landlord</span>}
                                                {owner.is_student && <span className="hs-tag">Student</span>}
                                                {!owner.verified_landlord && !owner.is_student && <span className="hs-tag">Landlord</span>}
                                            </div>
                                            <RatingSummary rating={owner.rating} size={13} />
                                            {listing.languages?.length > 0 && (
                                                <p className="hs-muted hs-owner-langs">Speaks {listing.languages.map(l => LANGUAGES[l] || l).join(', ')}</p>
                                            )}
                                        </div>
                                        <Link to={`/users/${owner.id}`} className="hs-btn hs-btn--ghost hs-owner-card-link">View profile</Link>
                                    </section>
                                )}

                                {isOwner
                                    ? <p className="hs-muted hs-contact-own">This is your listing. Students reach you through messages.</p>
                                    : <InterestPanel listing={listing} />}

                                <section className="hs-safety">
                                    <h2>Stay safe</h2>
                                    <ul>
                                        <li>Never pay a deposit or rent before you’ve seen the place (in person or on a live video call).</li>
                                        <li>Always sign a written lease. It’s required by law in Slovenia.</li>
                                        <li>Keep the conversation in Anchor messages until you’ve met.</li>
                                    </ul>
                                </section>
                            </div>
                        )}
                    </article>

                    <aside className="hs-detail-side">
                        <div className="hs-panel hs-summary">
                            <div className="hs-panel-price">
                                {formatEuro(listing.rent_per_person)}<span> / {listing.spots_total > 1 ? 'person / ' : ''}month</span>
                            </div>
                            <ul className="hs-summary-list">
                                {spotsText(listing) && <li>{spotsText(listing)}</li>}
                                {listing.available_from && <li>From {formatDate(listing.available_from)}</li>}
                                <li>{billsShort}</li>
                            </ul>
                            {isOwner ? (
                                <div className="hs-panel-actions">
                                    <Link to={`/housing/${listing.id}/edit`} className="hs-btn">Edit listing</Link>
                                    <Link to="/housing/mine" className="hs-btn hs-btn--ghost">My listings</Link>
                                </div>
                            ) : (
                                <div className="hs-panel-actions">
                                    <button type="button" className="hs-btn" onClick={() => openTab('contact', { scroll: true })}>I’m interested</button>
                                    <button
                                        type="button"
                                        className={`hs-btn hs-btn--ghost hs-save-btn ${listing.is_saved ? 'is-saved' : ''}`}
                                        onClick={handleSave}
                                        aria-pressed={Boolean(listing.is_saved)}
                                    >
                                        {listing.is_saved ? '♥ Liked' : '♡ Like'}
                                    </button>
                                </div>
                            )}
                            {owner && !isOwner && (
                                <button type="button" className="hs-summary-owner" onClick={() => openTab('contact', { scroll: true })}>
                                    <Avatar src={resolveMediaUrl(owner.profile_picture)} name={owner.fullname} size={28} />
                                    <span>{owner.fullname}</span>
                                    {owner.verified_landlord && <small>Verified</small>}
                                </button>
                            )}
                        </div>
                        {actionError && <div className="hs-alert hs-alert--error" role="alert">{actionError}</div>}
                    </aside>
                </div>

                {!isOwner && tab !== 'contact' && (
                    <div className="hs-detail-phonebar">
                        <div className="hs-panel-price">
                            {formatEuro(listing.rent_per_person)}<span> / {listing.spots_total > 1 ? 'person / ' : ''}month</span>
                        </div>
                        <button type="button" className="hs-btn" onClick={() => openTab('contact', { scroll: true })}>I’m interested</button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default HousingDetailPage;

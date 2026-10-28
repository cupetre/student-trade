import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppNav from '../../components/AppNav.jsx';
import Avatar from '../../components/Avatar.jsx';
import ReviewList from '../../components/ReviewList.jsx';
import { RatingSummary } from '../../components/Stars.jsx';
import { REQUIRED_LABELS } from '../../lib/profileOptions';
import { apiRequest } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { useCurrentUser } from '../../lib/useCurrentUser';
import {
    LISTING_TYPES, PROPERTY_TYPES, FURNISHING, AMENITIES, LANGUAGES, STATUSES,
    formatEuro, formatDate, spotsText,
} from '../../lib/housingOptions';
import './Housing.css';

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
    const navigate = useNavigate();
    const { user } = useCurrentUser();

    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [photoIndex, setPhotoIndex] = useState(0);
    const [messaging, setMessaging] = useState(false);
    const [actionError, setActionError] = useState('');
    const [profileGate, setProfileGate] = useState(null); // missing profile fields, when contact was refused
    const [reviews, setReviews] = useState([]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        apiRequest(`/api/housing/listings/${id}`).then(({ ok, status, data }) => {
            if (cancelled) return;
            setLoading(false);
            if (ok) { setListing(data); setPhotoIndex(0); setProfileGate(null); return; }
            setError(status === 404 ? 'This place doesn’t exist or isn’t available anymore.' : data.error);
        });
        return () => { cancelled = true; };
    }, [id]);

    useEffect(() => {
        let cancelled = false;
        apiRequest(`/api/housing/listings/${id}/reviews`).then(({ ok, data }) => {
            if (!cancelled && ok) setReviews(data);
        });
        return () => { cancelled = true; };
    }, [id]);

    const isOwner = Boolean(user && listing && listing.owner_id === user.id);

    const handleMessage = async () => {
        if (messaging || !listing?.owner) return;
        setMessaging(true);
        setActionError('');
        // Goes through housing (not the plain chat endpoint) so the server can
        // check that a student's profile is complete before the owner is contacted
        const { ok, data } = await apiRequest(`/api/housing/listings/${listing.id}/contact`, { method: 'POST' });
        setMessaging(false);
        if (ok) { navigate(`/chatpage?chatId=${data.chat_id}`); return; }
        if (data.code === 'PROFILE_INCOMPLETE') { setProfileGate(data.missing || []); return; }
        setActionError(data.error);
    };

    const handleSave = async () => {
        const was = listing.is_saved;
        setListing(prev => ({ ...prev, is_saved: !was }));
        const { ok } = await apiRequest(`/api/housing/listings/${listing.id}/save`, { method: was ? 'DELETE' : 'POST' });
        if (!ok) {
            setListing(prev => ({ ...prev, is_saved: was }));
            setActionError("Couldn't update your saved places. Please try again.");
        }
    };

    if (loading || error || !listing) {
        return (
            <div className="hs-shell">
                <AppNav />
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

    const rules = [
        { on: listing.address_registration_allowed, yes: 'You can register your address here', no: 'Address registration not offered' },
        { on: listing.subsidy_eligible, yes: 'Student housing subsidy possible', no: null },
        { on: listing.smoking_allowed, yes: 'Smoking allowed', no: 'No smoking' },
        { on: listing.pets_allowed, yes: 'Pets allowed', no: 'No pets' },
    ].filter(rule => rule.on || rule.no);

    return (
        <div className="hs-shell">
            <AppNav />
            <main className="hs-page hs-detail">
                <Link to="/housing" className="hs-back">← All places</Link>

                {isOwner && listing.status !== 'active' && (
                    <div className={`hs-alert hs-alert--${status?.tone === 'error' ? 'error' : 'info'}`} role="status">
                        This listing is <strong>{status?.label?.toLowerCase() || listing.status}</strong>, so students can’t see it in search.
                        {' '}<Link to="/housing/mine">Manage it in My listings</Link>.
                    </div>
                )}

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

                <div className="hs-detail-grid">
                    <div className="hs-detail-main">
                        <div className="hs-detail-head">
                            {type && <span className={`hs-badge hs-badge--inline hs-badge--${listing.listing_type}`}>{type.badge}</span>}
                            <h1>{listing.title}</h1>
                            <p className="hs-muted">
                                {PROPERTY_TYPES[listing.property_type]} · {spotsText(listing)} · {listing.neighbourhood ? `${listing.neighbourhood}, ` : ''}{listing.city}
                            </p>
                        </div>

                        <dl className="hs-facts">
                            <Fact label="Rent">{formatEuro(listing.rent_per_person)} per person / month</Fact>
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

                        <section className="hs-section">
                            <h2>Location</h2>
                            <p>
                                {listing.street}<br />
                                {[listing.postal_code, listing.city].filter(Boolean).join(' ')}
                                {listing.neighbourhood ? ` · ${listing.neighbourhood}` : ''}
                            </p>
                            <a href={mapsLink(listing)} target="_blank" rel="noopener noreferrer" className="hs-link">Open in Google Maps ↗</a>
                        </section>

                        <section className="hs-section">
                            <h2>What tenants say</h2>
                            <div className="hs-section-sub"><RatingSummary rating={listing.rating} /></div>
                            <ReviewList
                                reviews={reviews}
                                emptyText="No reviews for this place yet. Only confirmed tenants can review a place."
                            />
                        </section>

                        {listing.video_tour_url && (
                            <section className="hs-section">
                                <h2>Video tour</h2>
                                <a href={listing.video_tour_url} target="_blank" rel="noopener noreferrer" className="hs-link">Watch the video tour ↗</a>
                            </section>
                        )}
                    </div>

                    <aside className="hs-detail-side">
                        <div className="hs-panel">
                            <div className="hs-panel-price">
                                {formatEuro(listing.rent_per_person)}<span> / person / month</span>
                            </div>
                            <p className="hs-muted">{spotsText(listing)}</p>

                            {actionError && <div className="hs-alert hs-alert--error" role="alert">{actionError}</div>}
                            {profileGate && (
                                <div className="hs-alert hs-alert--info" role="status">
                                    <strong>Finish your profile first.</strong> Homeowners want to know who is writing to them.
                                    {profileGate.length > 0 && <> Missing: {profileGate.map(f => REQUIRED_LABELS[f] || f).join(', ')}.</>}
                                    {' '}<Link to={`/profile/student?next=${encodeURIComponent(`/housing/${listing.id}`)}`}>Complete it now</Link>
                                </div>
                            )}

                            {isOwner ? (
                                <div className="hs-panel-actions">
                                    <Link to={`/housing/${listing.id}/edit`} className="hs-btn">Edit listing</Link>
                                    <Link to="/housing/mine" className="hs-btn hs-btn--ghost">My listings</Link>
                                </div>
                            ) : (
                                <div className="hs-panel-actions">
                                    <button type="button" className="hs-btn" onClick={handleMessage} disabled={messaging}>
                                        {messaging ? 'Opening chat…' : `Message ${owner?.fullname?.split(' ')[0] || 'the owner'}`}
                                    </button>
                                    <button type="button" className="hs-btn hs-btn--ghost" disabled title="Applications are coming next">
                                        Apply · coming soon
                                    </button>
                                    <button type="button" className={`hs-btn hs-btn--ghost hs-save-btn ${listing.is_saved ? 'is-saved' : ''}`} onClick={handleSave} aria-pressed={Boolean(listing.is_saved)}>
                                        {listing.is_saved ? '♥ Saved' : '♡ Save'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {owner && (
                            <div className="hs-panel hs-owner">
                                <Avatar src={resolveMediaUrl(owner.profile_picture)} name={owner.fullname} size={48} />
                                <div>
                                    <Link to={`/users/${owner.id}`} className="hs-owner-name">{owner.fullname}</Link>
                                    <div className="hs-owner-rating"><RatingSummary rating={owner.rating} size={13} /></div>
                                    {owner.verified_landlord && <span className="hs-tag hs-tag--good">Verified landlord</span>}
                                    {owner.is_student && <span className="hs-tag">Student</span>}
                                    {listing.languages?.length > 0 && (
                                        <p className="hs-muted hs-owner-langs">
                                            Speaks {listing.languages.map(l => LANGUAGES[l] || l).join(', ')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="hs-panel hs-safety">
                            <h2>Stay safe</h2>
                            <ul>
                                <li>Never pay a deposit or rent before you’ve seen the place (in person or on a live video call).</li>
                                <li>Always sign a written lease. It’s required by law in Slovenia.</li>
                                <li>Keep the conversation in Student Trade messages until you’ve met.</li>
                            </ul>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default HousingDetailPage;

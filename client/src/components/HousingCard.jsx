import React from 'react';
import { Link } from 'react-router-dom';
import { LISTING_TYPES, PROPERTY_TYPES, FURNISHING, formatEuro, formatDate, spotsText } from '../lib/housingOptions';
import { resolveMediaUrl } from '../lib/media';

// One housing listing as a card. `preview` renders it without links
// (used next to the listing form to show how the card will look).
const HousingCard = ({ listing, onToggleSave, preview = false, photoUrl }) => {
    const photo = photoUrl || resolveMediaUrl(listing.photos?.[0]?.url);
    const type = LISTING_TYPES[listing.listing_type];
    const href = `/housing/${listing.id}`;

    const media = (
        <>
            {photo
                ? <img src={photo} alt="" loading="lazy" />
                : (
                    <div className="hs-card-noimg" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" /></svg>
                    </div>
                )}
            {type && <span className={`hs-badge hs-badge--${listing.listing_type}`}>{type.badge}</span>}
        </>
    );

    const body = (
        <>
            <div className="hs-card-price">
                {formatEuro(listing.rent_per_person) || '€–'}
                <span> / person / month</span>
            </div>
            <h3 className="hs-card-title">{listing.title || 'Your listing title'}</h3>
            <p className="hs-card-type">
                {PROPERTY_TYPES[listing.property_type] || 'Type of place'}
                {listing.spots_total ? ` · ${spotsText(listing)}` : ''}
            </p>
            <p className="hs-card-meta">
                {[
                    listing.city,
                    FURNISHING[listing.furnishing],
                    listing.available_from && `From ${formatDate(listing.available_from)}`,
                ].filter(Boolean).join(' · ')}
            </p>
            {(listing.address_registration_allowed || listing.utilities_included) && (
                <div className="hs-card-tags">
                    {listing.address_registration_allowed && <span className="hs-tag hs-tag--good">Address registration</span>}
                    {listing.utilities_included && <span className="hs-tag">Bills included</span>}
                </div>
            )}
        </>
    );

    if (preview) {
        return (
            <article className="hs-card hs-card--preview">
                <div className="hs-card-media">{media}</div>
                <div className="hs-card-body">{body}</div>
            </article>
        );
    }

    return (
        <article className="hs-card">
            <Link to={href} className="hs-card-media" tabIndex={-1} aria-hidden="true">{media}</Link>
            {onToggleSave && (
                <button
                    type="button"
                    className={`hs-heart ${listing.is_saved ? 'is-saved' : ''}`}
                    aria-pressed={Boolean(listing.is_saved)}
                    aria-label={listing.is_saved ? 'Remove from saved' : 'Save this place'}
                    onClick={() => onToggleSave(listing)}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>
                </button>
            )}
            <Link to={href} className="hs-card-body">{body}</Link>
        </article>
    );
};

export default HousingCard;

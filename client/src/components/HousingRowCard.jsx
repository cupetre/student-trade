import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import { LISTING_TYPES, PROPERTY_TYPES, FURNISHING, formatEuro, formatDate, spotsText } from '../lib/housingOptions';
import { resolveMediaUrl } from '../lib/media';

// What the rent covers, for the right end of the price row
function costsLabel(listing) {
    if (listing.utilities_included) return { text: 'Rent + bills included', tone: 'good' };
    if (listing.utilities_estimate !== null && listing.utilities_estimate !== undefined && listing.utilities_estimate !== '') {
        return { text: `Rent only · bills ~${formatEuro(listing.utilities_estimate)}`, tone: '' };
    }
    return { text: 'Rent only · bills extra', tone: '' };
}

/*
  One listing on the browse page, as a wide row:
  text on the left (title + place, price + what it covers, size + type, who rents it),
  the first photo on the right. The whole card opens the listing; the heart and the
  owner's name are separate links on top of it.
*/
const HousingRowCard = ({ listing, onToggleSave, onHover }) => {
    const photo = resolveMediaUrl(listing.photos?.[0]?.url);
    const type = LISTING_TYPES[listing.listing_type];
    const href = `/housing/${listing.id}`;
    const owner = listing.owner;
    const costs = costsLabel(listing);
    const multiSpot = listing.spots_total > 1;

    const facts = [
        listing.area_m2 && `${listing.area_m2} m²`,
        PROPERTY_TYPES[listing.property_type],
        listing.spots_total ? spotsText(listing) : null,
        FURNISHING[listing.furnishing],
        listing.available_from && `From ${formatDate(listing.available_from)}`,
    ].filter(Boolean);

    const hover = (id) => () => onHover?.(id);

    return (
        <article
            className="hs-rc"
            onMouseEnter={hover(listing.id)}
            onMouseLeave={hover(null)}
            onFocus={hover(listing.id)}
            onBlur={hover(null)}
        >
            <div className="hs-rc-body">
                <div className="hs-rc-line hs-rc-line--top">
                    <h3 className="hs-rc-title">
                        <Link to={href} className="hs-rc-link">{listing.title}</Link>
                    </h3>
                    <span className="hs-rc-place">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21Z" /><circle cx="12" cy="10" r="2.3" /></svg>
                        {[listing.city, 'Slovenia'].filter(Boolean).join(', ')}
                    </span>
                </div>

                <div className="hs-rc-line hs-rc-line--price">
                    <div className="hs-rc-price">
                        {formatEuro(listing.rent_per_person) || '€–'}
                        <span>{multiSpot ? ' / person / month' : ' / month'}</span>
                    </div>
                    <span className={`hs-rc-costs ${costs.tone ? `hs-rc-costs--${costs.tone}` : ''}`}>{costs.text}</span>
                </div>

                {facts.length > 0 && (
                    <ul className="hs-rc-facts" aria-label="About the place">
                        {facts.map(fact => <li key={fact}>{fact}</li>)}
                    </ul>
                )}

                {(listing.address_registration_allowed || listing.neighbourhood) && (
                    <div className="hs-rc-tags">
                        {listing.neighbourhood && <span className="hs-tag">{listing.neighbourhood}</span>}
                        {listing.address_registration_allowed && <span className="hs-tag hs-tag--good">Address registration</span>}
                    </div>
                )}

                {owner && (
                    <div className="hs-rc-owner">
                        <Link to={`/users/${owner.id}`} className="hs-rc-person">
                            <Avatar src={resolveMediaUrl(owner.profile_picture)} name={owner.fullname} size={34} />
                            <span>
                                <strong>{owner.fullname}</strong>
                                <small>
                                    {owner.verified_landlord ? 'Verified landlord' : owner.is_student ? 'Student' : 'Landlord'}
                                </small>
                            </span>
                        </Link>
                        <span className="hs-rc-contact" aria-hidden="true">
                            Message in the app
                            <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                        </span>
                    </div>
                )}
            </div>

            <div className="hs-rc-media" aria-hidden="true">
                {photo
                    ? <img src={photo} alt="" loading="lazy" />
                    : (
                        <div className="hs-card-noimg">
                            <svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" /></svg>
                        </div>
                    )}
                {type && <span className={`hs-badge hs-badge--${listing.listing_type}`}>{type.badge}</span>}
            </div>

            {onToggleSave && (
                <button
                    type="button"
                    className={`hs-heart ${listing.is_saved ? 'is-saved' : ''}`}
                    aria-pressed={Boolean(listing.is_saved)}
                    aria-label={listing.is_saved ? `Unlike ${listing.title}` : `Like ${listing.title}`}
                    onClick={() => onToggleSave(listing)}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>
                </button>
            )}
        </article>
    );
};

export default HousingRowCard;

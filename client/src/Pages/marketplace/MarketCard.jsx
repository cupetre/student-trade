import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../../components/Avatar.jsx';
import { resolveMediaUrl } from '../../lib/media';
import { formatEuro, postedAgo, CATEGORIES, CONDITIONS } from './marketOptions';

export const NoPhoto = () => (
    <div className="hs-card-noimg" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M6 8h12l-1.1 11.1A2 2 0 0 1 14.9 21H9.1a2 2 0 0 1-2-1.9L6 8Zm3 0V7a3 3 0 0 1 6 0v1h-2V7a1 1 0 0 0-2 0v1H9Z" /></svg>
    </div>
);

// The outline map pin used across the marketplace (no colour, follows the text)
export const PinIcon = ({ className = 'mk-pin' }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21Z" /><circle cx="12" cy="10" r="2.3" />
    </svg>
);

const priceText = (price) => (price !== '' && price !== undefined && price !== null
    ? (Number(price) === 0 ? 'Free' : formatEuro(price))
    : '€–');

// One marketplace item in the browse grid. Opens the item window on top of the
// page (/marketplace/:id), keeping the filters (`search`) so closing returns here.
// `preview` renders it without links (next to the sell form).
const MarketCard = ({ item, preview = false, photoUrl, search = '' }) => {
    const photo = photoUrl || resolveMediaUrl(item.photo);
    const href = `/marketplace/${item.id}${search}`;
    const condition = CONDITIONS[item.condition]?.label;
    const place = item.city || null;

    const content = (
        <>
            <div className="mk-card-media">
                {photo ? <img src={photo} alt="" loading="lazy" /> : <NoPhoto />}
                {condition && <span className="mk-card-condition">{condition}</span>}
            </div>
            <div className="mk-card-body">
                <div className="mk-card-top">
                    <span className="mk-card-price">{priceText(item.price)}</span>
                    {place && <span className="mk-card-place"><PinIcon />{place}</span>}
                </div>
                <h3 className="mk-card-title">{item.title || 'Your item title'}</h3>
                {CATEGORIES[item.category] && <p className="mk-card-category">{CATEGORIES[item.category]}</p>}
                <p className="mk-card-seller">
                    <Avatar src={resolveMediaUrl(item.owner_profile_picture)} name={item.owner_name || 'You'} size={22} />
                    <span>{item.owner_name || 'You'}{item.date ? ` · ${postedAgo(item.date)}` : ''}</span>
                </p>
            </div>
        </>
    );

    if (preview) return <article className="mk-card mk-card--preview">{content}</article>;

    return (
        <article className="mk-card">
            <Link to={href} className="mk-card-link" aria-label={`${item.title}, ${priceText(item.price)}`}>{content}</Link>
        </article>
    );
};

export default MarketCard;

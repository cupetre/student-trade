import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../../components/Avatar.jsx';
import { resolveMediaUrl } from '../../lib/media';
import { formatEuro, postedAgo } from './marketOptions';

export const NoPhoto = () => (
    <div className="hs-card-noimg" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M6 8h12l-1.1 11.1A2 2 0 0 1 14.9 21H9.1a2 2 0 0 1-2-1.9L6 8Zm3 0V7a3 3 0 0 1 6 0v1h-2V7a1 1 0 0 0-2 0v1H9Z" /></svg>
    </div>
);

// One marketplace item as a card, in the same style as HousingCard.
// `preview` renders it without links (next to the sell form).
const MarketCard = ({ item, preview = false, photoUrl }) => {
    const photo = photoUrl || resolveMediaUrl(item.photo);
    const href = `/marketplace/${item.id}`;

    const media = photo ? <img src={photo} alt="" loading="lazy" /> : <NoPhoto />;

    const body = (
        <>
            <div className="hs-card-price">{item.price !== '' && item.price !== undefined && item.price !== null ? formatEuro(item.price) : '€–'}</div>
            <h3 className="hs-card-title">{item.title || 'Your item title'}</h3>
            <p className="hs-card-meta mk-card-seller">
                <Avatar src={resolveMediaUrl(item.owner_profile_picture)} name={item.owner_name || 'You'} size={22} />
                <span>{item.owner_name || 'You'}{item.date ? ` · ${postedAgo(item.date)}` : ''}</span>
            </p>
        </>
    );

    if (preview) {
        return (
            <article className="hs-card hs-card--preview mk-card">
                <div className="hs-card-media">{media}</div>
                <div className="hs-card-body">{body}</div>
            </article>
        );
    }

    return (
        <article className="hs-card mk-card">
            <Link to={href} className="hs-card-media" tabIndex={-1} aria-hidden="true">{media}</Link>
            <Link to={href} className="hs-card-body">{body}</Link>
        </article>
    );
};

export default MarketCard;

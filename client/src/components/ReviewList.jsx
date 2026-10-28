import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import { Stars } from './Stars.jsx';
import { resolveMediaUrl } from '../lib/media';
import './Reviews.css';

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function contextLabel(review) {
    if (review.context === 'housing') {
        const who = review.reviewer?.role === 'landlord' ? 'Landlord' : 'Tenant';
        return review.listing_title ? `${who} · ${review.listing_title}` : who;
    }
    return 'Marketplace';
}

const ReviewList = ({ reviews, emptyText = 'No reviews yet.', myId, onDelete }) => {
    if (!reviews || reviews.length === 0) return <p className="rv-empty">{emptyText}</p>;

    return (
        <ul className="rv-list">
            {reviews.map(review => (
                <li key={review.id} className="rv-item">
                    <div className="rv-item-head">
                        {review.reviewer ? (
                            <Link to={`/users/${review.reviewer.id}`} className="rv-author">
                                <Avatar src={resolveMediaUrl(review.reviewer.profile_picture)} name={review.reviewer.fullname} size={36} />
                                <span>
                                    <strong>{review.reviewer.fullname}</strong>
                                    <small>{contextLabel(review)}</small>
                                </span>
                            </Link>
                        ) : <span className="rv-author"><small>{contextLabel(review)}</small></span>}
                        <div className="rv-item-meta">
                            <Stars value={review.rating} size={15} />
                            <time dateTime={review.created_at}>{formatDate(review.created_at)}</time>
                        </div>
                    </div>
                    {review.description && <p className="rv-text">{review.description}</p>}
                    {onDelete && review.reviewer?.id === myId && (
                        <button type="button" className="rv-link-btn" onClick={() => onDelete(review)}>Delete my review</button>
                    )}
                </li>
            ))}
        </ul>
    );
};

export default ReviewList;

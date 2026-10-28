import React, { useState } from 'react';
import './Reviews.css';

const STAR_PATH = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';

// Read-only stars. Half stars for averages like 4.5.
export const Stars = ({ value = 0, size = 16, label }) => {
    const rounded = Math.round((Number(value) || 0) * 2) / 2;
    return (
        <span className="rv-stars" role="img" aria-label={label || `${rounded} out of 5 stars`} style={{ '--rv-size': `${size}px` }}>
            {[1, 2, 3, 4, 5].map(n => {
                const fill = rounded >= n ? 'full' : rounded >= n - 0.5 ? 'half' : 'empty';
                return (
                    <svg key={n} viewBox="0 0 24 24" className={`rv-star rv-star--${fill}`} aria-hidden="true">
                        <defs>
                            <linearGradient id={`rv-half-${n}`}>
                                <stop offset="50%" stopColor="currentColor" />
                                <stop offset="50%" stopColor="transparent" />
                            </linearGradient>
                        </defs>
                        <path d={STAR_PATH} fill={fill === 'half' ? `url(#rv-half-${n})` : undefined} />
                    </svg>
                );
            })}
        </span>
    );
};

// "★ 4.6 (12 reviews)" or "No reviews yet"
export const RatingSummary = ({ rating, size = 15 }) => {
    if (!rating || !rating.count) return <span className="rv-summary rv-summary--none">No reviews yet</span>;
    return (
        <span className="rv-summary">
            <Stars value={rating.average} size={size} />
            <strong>{rating.average.toFixed(1)}</strong>
            <span>({rating.count} {rating.count === 1 ? 'review' : 'reviews'})</span>
        </span>
    );
};

// Clickable stars (radio buttons underneath, so it works with the keyboard too)
export const StarInput = ({ value, onChange, name = 'rating' }) => {
    const [hover, setHover] = useState(0);
    const shown = hover || value;
    const words = ['', 'Bad', 'Not great', 'OK', 'Good', 'Excellent'];

    return (
        <div className="rv-input">
            <div className="rv-input-stars" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map(n => (
                    <label key={n} onMouseEnter={() => setHover(n)} className={shown >= n ? 'is-on' : ''}>
                        <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} />
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={STAR_PATH} /></svg>
                        <span className="rv-sr">{n} {n === 1 ? 'star' : 'stars'}</span>
                    </label>
                ))}
            </div>
            <span className="rv-input-word">{words[shown] || 'Choose a rating'}</span>
        </div>
    );
};

export default Stars;

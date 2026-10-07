import React, { useState } from 'react';
import './Avatar.css';

// Shows the user's photo when there is one, otherwise a colored circle
// with their initials (or a person icon if we don't even have a name).
// Also falls back automatically if the photo URL is broken.

const COLORS = ['#4684c7', '#7c5cbf', '#2e9e8f', '#d9822b', '#c0507a', '#5b8c3a', '#3f6fb5', '#b85c38'];

function initialsFrom(name) {
    if (typeof name !== 'string') return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
}

// The same name always gets the same color, so a person is recognisable
// across the listings, chat list and profile.
function colorFrom(name) {
    let hash = 0;
    for (const ch of name || '') hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return COLORS[hash % COLORS.length];
}

function isUsableSrc(src) {
    return typeof src === 'string' && src.trim() !== '' && src !== 'null' && src !== 'undefined';
}

const Avatar = ({ src, name, size = 40, className = '' }) => {
    // Remember which URL failed to load, so a new src gets a fresh try
    const [failedSrc, setFailedSrc] = useState(null);

    const showImage = isUsableSrc(src) && failedSrc !== src;
    const dimensions = { width: size, height: size };
    const label = name || 'User';

    if (showImage) {
        return (
            <img
                src={src}
                alt={label}
                className={`avatar ${className}`}
                style={dimensions}
                onError={() => setFailedSrc(src)}
            />
        );
    }

    const initials = initialsFrom(name);

    return (
        <div
            className={`avatar avatar--fallback ${className}`}
            style={{ ...dimensions, backgroundColor: colorFrom(name), fontSize: Math.round(size * 0.4) }}
            role="img"
            aria-label={label}
        >
            {initials || (
                <svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" fill="currentColor" />
                    <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" fill="currentColor" />
                </svg>
            )}
        </div>
    );
};

export default Avatar;

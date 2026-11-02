import React from 'react';

// Simple drawings: a graduation cap on a stack of books, and a house with a key
const SideArt = ({ kind, className = 'lp-side-art' }) => (
    <svg viewBox="0 0 160 120" aria-hidden="true" className={className}>
        <ellipse cx="80" cy="110" rx="58" ry="6" fill="#EDE7DC" />
        {kind === 'student' ? (
            <>
                <rect x="32" y="88" width="96" height="16" rx="3" fill="#3C6E91" />
                <rect x="38" y="72" width="84" height="16" rx="3" fill="#D5E3EC" />
                <rect x="44" y="56" width="72" height="16" rx="3" fill="#DDD4C5" />
                <rect x="60" y="38" width="40" height="16" rx="4" fill="#1B2A41" />
                <polygon points="80,14 126,30 80,46 34,30" fill="#1B2A41" />
                <path d="M126 30v20" stroke="#C2305A" strokeWidth="3" strokeLinecap="round" />
                <circle cx="126" cy="53" r="4" fill="#C2305A" />
            </>
        ) : (
            <>
                <rect x="38" y="54" width="70" height="50" rx="4" fill="#D5E3EC" />
                <polygon points="30,58 73,22 116,58" fill="#3C6E91" />
                <rect x="65" y="74" width="16" height="30" rx="2" fill="#1B2A41" />
                <rect x="46" y="64" width="13" height="13" rx="2" fill="#FFFFFF" />
                <rect x="88" y="64" width="13" height="13" rx="2" fill="#FFFFFF" />
                <circle cx="134" cy="66" r="10" fill="none" stroke="#C2305A" strokeWidth="4" />
                <path d="M134 76v28M134 96h7M134 103h6" stroke="#C2305A" strokeWidth="4" strokeLinecap="round" />
            </>
        )}
    </svg>
);

export default SideArt;

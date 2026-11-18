import React from 'react';

// One line icon per topic (24 × 24, drawn with the current colour)
const PATHS = {
    documents: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></>,
    health: <><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></>,
    money: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
    work: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2M3 12h18" /></>,
    phone: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 17h2" /></>,
    transport: <><rect x="5" y="4" width="14" height="13" rx="2" /><path d="M5 11h14M8 20l1-3M16 20l-1-3" /><circle cx="8.5" cy="14" r=".6" /><circle cx="15.5" cy="14" r=".6" /></>,
    food: <><path d="M7 3v8a2 2 0 0 0 2 2v8M7 3v5M11 3v5M7 8h4M16 3c-1.5 2-2 4-2 7h3v11" /></>,
    housing: <><path d="M4 11l8-7 8 7v9H4z" /><path d="M10 20v-5h4v5" /></>,
    everyday: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
};

export default function TopicIcon({ topic, className = 'si-topic-icon' }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {PATHS[topic] || PATHS.everyday}
        </svg>
    );
}

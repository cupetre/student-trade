import React from 'react';
import { BRAND } from '../lib/brand';
import './Logo.css';

// The mark: a white anchor on an ink tile; its ring is raspberry (the one loud colour).
// Same drawing as the favicon in public/favicon.svg.
export const LogoMark = ({ size = 34 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="brand-mark">
        <rect width="32" height="32" rx="9" fill="#1B2A41" />
        <g fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 11.2V25.2" />
            <path d="M11.6 14.4h8.8" />
            <path d="M8.2 18.6c.6 4 3.8 6.6 7.8 6.6s7.2-2.6 7.8-6.6" />
            <path d="M6.6 20.4l1.6-1.8 2 1.3" />
            <path d="M25.4 20.4l-1.6-1.8-2 1.3" />
        </g>
        <circle cx="16" cy="8.2" r="2.5" fill="none" stroke="#C2305A" strokeWidth="2.4" />
    </svg>
);

// Mark + name. Colour and size come from the parent (font-size, color).
// `name`: Sidro or Anchor (public pages pass the one for the chosen language).
const Logo = ({ size = 34, hideWordOnPhone = false, name = BRAND }) => (
    <span className={`brand-logo ${hideWordOnPhone ? 'brand-logo--compact' : ''}`}>
        <LogoMark size={size} />
        <span className="brand-word">{name}</span>
    </span>
);

export default Logo;

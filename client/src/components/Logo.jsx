import React from 'react';
import { BRAND } from '../lib/brand';
import './Logo.css';

// The mark: a white "K" on an ink tile, with a raspberry dot (the one loud colour).
// Same drawing as the favicon in public/favicon.svg.
export const LogoMark = ({ size = 34 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="brand-mark">
        <rect width="32" height="32" rx="9" fill="#1B2A41" />
        <path d="M11 8.5v15M11 17l8.5-8.5M13.8 14.4 20.5 23.5" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24.6" cy="22.6" r="2.4" fill="#C2305A" />
    </svg>
);

// Mark + name. Colour and size come from the parent (font-size, color).
const Logo = ({ size = 34, hideWordOnPhone = false }) => (
    <span className={`brand-logo ${hideWordOnPhone ? 'brand-logo--compact' : ''}`}>
        <LogoMark size={size} />
        <span className="brand-word">{BRAND}</span>
    </span>
);

export default Logo;

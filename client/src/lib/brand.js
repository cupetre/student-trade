// The platform's name, in one place. Change it here and every bar, footer and
// browser tab follows (the favicon lives in public/favicon.svg).
//
// The name follows the language: Sidro in Slovenian, Anchor in English.
// The public pages switch with the SL/EN button; the logged-in pages are in
// English for now, so they use Anchor.
import { useLanguage } from './language';

export const BRAND_NAMES = { sl: 'Sidro', en: 'Anchor' };

export const brandFor = (lang) => BRAND_NAMES[lang] || BRAND_NAMES.sl;

// The name on the logged-in (English) pages
export const BRAND = BRAND_NAMES.en;

// The name in the current SL/EN language (public pages)
export function useBrand() {
    const [lang] = useLanguage();
    return brandFor(lang);
}

import { useMemo } from 'react';
import { useLanguage } from './language';
import sl from './sl';

/*
  Language for the logged-in pages. The English text is the key:

      const t = useT();
      t('Apply filters')
      t('Message {name}', { name: firstName })

  English is shown as written. For Slovenian the text is looked up in lib/sl.js;
  anything missing there simply stays English, so a forgotten line never breaks a
  page. An entry in sl.js can be a function when the wording depends on a number
  (Slovenian has four plural forms): '{n} items': ({ n }) => ...
  Messages from the server go through the same lookup (see serverText below).
*/
const DICTIONARIES = { sl };

function fill(text, vars) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

export function translate(lang, text, vars) {
    if (typeof text !== 'string' || !text) return text;
    const dictionary = DICTIONARIES[lang];
    if (!dictionary) return fill(text, vars);
    const entry = dictionary.text[text];
    if (typeof entry === 'function') return mark(entry(vars || {}));
    if (entry !== undefined) return mark(fill(entry, vars));
    // server messages with a name or number in them: matched by shape
    if (!vars) {
        for (const [shape, write] of dictionary.patterns) {
            const found = text.match(shape);
            if (found) return mark(write(found));
        }
    }
    missing(lang, text);
    return fill(text, vars);
}

// For checking translations: with localStorage.i18nDebug = '1', every text that
// came from the dictionary starts with an invisible marker, and texts that have
// no translation yet are listed in the console. Off for everyone else.
let debug = false;
try { debug = localStorage.getItem('i18nDebug') === '1'; } catch { /* no storage */ }
const reported = new Set();
const mark = (text) => (debug ? `\u2063${text}` : text);
function missing(lang, text) {
    if (!debug || reported.has(text)) return;
    reported.add(text);
    console.warn(`[i18n] no ${lang} text for: ${text}`);
}

// In components: const t = useT(); also gives the language as t.lang
export function useT() {
    const [lang] = useLanguage();
    return useMemo(() => Object.assign((text, vars) => translate(lang, text, vars), { lang }), [lang]);
}

// The locale for dates and numbers in the chosen language
export const localeFor = (lang) => (lang === 'sl' ? 'sl-SI' : 'en-GB');

// Plain English, for helpers called without a translator
export const en = Object.assign((text, vars) => translate('en', text, vars), { lang: 'en' });

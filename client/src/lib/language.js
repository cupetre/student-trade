import { useEffect, useState } from 'react';

// Site language for the public pages (landing, login, register, email confirmation).
// Slovenian is the default: Slovenian law (ZJRS) requires websites aimed at
// customers in Slovenia to be in Slovenian. The choice is shared by every
// component that uses this hook and remembered in the browser.
export const LANGUAGES = ['sl', 'en'];

function readSaved() {
    try {
        const saved = localStorage.getItem('lang');
        return LANGUAGES.includes(saved) ? saved : 'sl';
    } catch {
        return 'sl';
    }
}

let current = readSaved();
const listeners = new Set();

export function useLanguage() {
    const [lang, setLangState] = useState(current);

    useEffect(() => {
        listeners.add(setLangState);
        setLangState(current); // in case it changed before this component mounted
        document.documentElement.lang = current;
        return () => listeners.delete(setLangState);
    }, []);

    const setLang = (next) => {
        if (!LANGUAGES.includes(next) || next === current) return;
        current = next;
        try { localStorage.setItem('lang', next); } catch { /* storage blocked: just not remembered */ }
        document.documentElement.lang = next;
        listeners.forEach(fn => fn(next));
    };

    return [lang, setLang];
}

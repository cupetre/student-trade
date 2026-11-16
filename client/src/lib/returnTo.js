// Where a visitor was when we asked them to sign up or log in (e.g. the item
// they wanted to message about). Remembered in the browser, so it survives
// "sign up -> confirm the email -> log in" and they land back on the same page.
const KEY = 'returnTo';
const MAX_AGE = 24 * 60 * 60 * 1000;

export function rememberReturn(path = window.location.pathname + window.location.search) {
    // only pages inside the app, never an outside address
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return;
    try { localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() })); } catch { /* storage blocked: they just land on the start page */ }
}

// Reads it once and forgets it
export function takeReturn() {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
        localStorage.removeItem(KEY);
        if (!saved || typeof saved.path !== 'string' || Date.now() - saved.at > MAX_AGE) return null;
        return saved.path.startsWith('/') && !saved.path.startsWith('//') ? saved.path : null;
    } catch {
        return null;
    }
}

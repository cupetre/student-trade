import { createLogger } from './logger';

const apiLog = createLogger('api');
const authLog = createLogger('auth');

// Login state lives in one place: the JWT saved in localStorage after login.
// The token's payload says when it expires, so we can treat an old token
// as "logged out" instead of letting pages fail with 401/403 errors.

const TOKEN_KEY = 'token';

function readTokenPayload(token) {
    try {
        const part = token.split('.')[1];
        const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
}

// Returns the token if it exists and hasn't expired, otherwise clears it and returns null
export function getValidToken() {
    let token = null;
    try { token = localStorage.getItem(TOKEN_KEY); } catch { return null; }
    if (!token) return null;

    const payload = readTokenPayload(token);
    const expired = !payload || (payload.exp && payload.exp * 1000 <= Date.now());
    if (expired) {
        logout();
        return null;
    }
    return token;
}

export function isLoggedIn() {
    return getValidToken() !== null;
}

export function logout() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

// Every call to the API goes through window.fetch, so this one wrapper:
//  1. logs each API call in the browser console (method, address, status, time,
//     the server's request id, and the error message when something failed)
//  2. handles expired logins: on 401 ("No token" / "Invalid token") it clears the
//     token and goes to the login page. Only 401: a 403 means "you're logged in
//     but not allowed to do this" (e.g. finish your profile first) and must NOT
//     log anyone out. Login, register and email-confirmation calls are skipped,
//     because they use these codes for normal answers like "wrong password".
export function installFetchWrapper() {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
        const isApiCall = url.includes('/api/');
        if (!isApiCall) return originalFetch(...args);

        const method = (args[1] && args[1].method) || (args[0] && args[0].method) || 'GET';
        const started = performance.now();
        let response;
        try {
            response = await originalFetch(...args);
        } catch (err) {
            apiLog.error(`${method} ${url} → no response (is the backend running?)`, err);
            throw err;
        }

        const ms = Math.round(performance.now() - started);
        const requestId = response.headers.get('X-Request-Id');
        const ref = requestId ? ` ref ${requestId}` : '';
        const line = `${method} ${url} → ${response.status} (${ms}ms)`;

        if (response.ok) {
            apiLog.info(line);
        } else {
            // Read the error message from a copy, so the page can still read the body
            let message = '';
            try { message = (await response.clone().json()).error || ''; } catch { /* not JSON */ }
            if (response.status >= 500) apiLog.error(`${line} ${message}${ref}`);
            else apiLog.warn(`${line} ${message}`);
        }

        const isAuthCall = /\/api\/users\/(login|register|verify-email|resend-verification)/.test(url);
        if (!isAuthCall && response.status === 401) {
            authLog.warn('Session expired or invalid: logging out');
            logout();
            if (!window.location.pathname.startsWith('/login')) {
                window.location.assign('/login');
            }
        }
        return response;
    };
}

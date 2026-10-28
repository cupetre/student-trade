// Browser console logger, so the front end is as easy to follow as the server.
//
// Open the browser DevTools (F12) → Console. You'll see lines like:
//   [api] GET /api/housing/listings → 200 (34ms)
//   [api] POST /api/housing/listings/7/contact → 403 (12ms) Complete your profile first…
//   [api] PUT /api/users/edit_profile → 500 (40ms) Something went wrong… ref a1b2c3d4
//   [socket] connected
// The "ref" is the server's request id: search for it in the server terminal
// to find the matching server log lines.
//
// While developing (npm run dev) everything is shown. In a production build
// only warnings and errors are shown, unless you run this in the console:
//   localStorage.setItem('debug', '1')   (and refresh; remove it to turn off)

const COLORS = {
    api: '#2c66a8',
    socket: '#7c5cbf',
    app: '#1b6e3c',
    auth: '#d9822b',
};

function verbose() {
    if (import.meta.env.DEV) return true;
    try { return localStorage.getItem('debug') === '1'; } catch { return false; }
}

export function createLogger(scope) {
    const tag = `%c[${scope}]`;
    const style = `color:${COLORS[scope] || '#5d6b7e'};font-weight:700`;
    return {
        debug: (...args) => { if (verbose()) console.debug(tag, style, ...args); },
        info: (...args) => { if (verbose()) console.info(tag, style, ...args); },
        warn: (...args) => console.warn(tag, style, ...args),
        error: (...args) => console.error(tag, style, ...args),
    };
}

export const appLog = createLogger('app');

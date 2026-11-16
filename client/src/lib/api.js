import { getValidToken } from './auth';
import { getLanguage } from './language';
import { translate } from './i18n';

// The server answers in English. Its messages (error, message, and the per-field
// messages of a form) are put into the chosen language here, once, for every
// page: they are looked up in lib/sl.js like any other text. A message that
// isn't in there stays English.
function localise(data) {
    const lang = getLanguage();
    if (lang === 'en' || !data || typeof data !== 'object') return data;
    if (typeof data.error === 'string') data.error = translate(lang, data.error);
    if (typeof data.message === 'string') data.message = translate(lang, data.message);
    if (data.fields && typeof data.fields === 'object') {
        for (const key of Object.keys(data.fields)) {
            if (typeof data.fields[key] === 'string') data.fields[key] = translate(lang, data.fields[key]);
        }
    }
    return data;
}

const OFFLINE = "Can't reach the server. Check your connection and try again.";

// Small wrapper around fetch for JSON endpoints.
// It never throws: it always resolves to { ok, status, data }, and data.error
// is always filled in when something went wrong. That way each page doesn't
// need its own try/catch for "server down" or "response wasn't JSON".
export async function postJson(url, body) {
    let response;

    try {
        response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // every public form says which language the page is in (the emails follow it)
            body: JSON.stringify({ language: getLanguage(), ...body }),
        });
    } catch {
        // fetch only throws when the request never got a response at all
        return {
            ok: false,
            status: 0,
            data: localise({ error: OFFLINE }),
        };
    }

    let data = {};
    try {
        data = await response.json();
    } catch {
        // Not JSON, e.g. the Vite proxy's error page when the backend isn't running
    }

    if (!response.ok && !data.error) {
        data.error = response.status >= 500
            ? 'Something went wrong on our side. Please try again in a moment.'
            : 'Request failed. Please try again.';
    }
    localise(data);
    // On server errors, show the request id so it can be found in the server log
    if (response.status >= 500 && data.requestId && !String(data.error).includes(data.requestId)) {
        data.error = `${data.error} (ref ${data.requestId})`;
    }

    return { ok: response.ok, status: response.status, data };
}

// Same idea as postJson, but for any method, with the login token attached.
// Pass `formData` instead of `body` to upload files (the browser sets the
// multipart headers itself).
export async function apiRequest(url, { method = 'GET', body, formData } = {}) {
    const headers = {};
    const token = getValidToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let payload;
    if (formData) {
        payload = formData;
    } else if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(url, { method, headers, body: payload });
    } catch {
        return {
            ok: false,
            status: 0,
            data: localise({ error: OFFLINE }),
        };
    }

    let data = {};
    try {
        data = await response.json();
    } catch {
        // Not JSON (e.g. the backend isn't running)
    }

    if (!response.ok && !data.error) {
        data.error = response.status >= 500
            ? 'Something went wrong on our side. Please try again in a moment.'
            : 'Request failed. Please try again.';
    }
    localise(data);
    // On server errors, show the request id so it can be found in the server log
    if (response.status >= 500 && data.requestId && !String(data.error).includes(data.requestId)) {
        data.error = `${data.error} (ref ${data.requestId})`;
    }

    return { ok: response.ok, status: response.status, data };
}

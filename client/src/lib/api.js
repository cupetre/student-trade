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
            body: JSON.stringify(body),
        });
    } catch {
        // fetch only throws when the request never got a response at all
        return {
            ok: false,
            status: 0,
            data: { error: "Can't reach the server. Check your connection and try again." },
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

    return { ok: response.ok, status: response.status, data };
}

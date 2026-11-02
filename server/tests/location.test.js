const test = require('node:test');
const assert = require('node:assert/strict');
const { readCoordinates, publicPoint, distanceMetres, locationFields } = require('../lib/location');
const { createGeocoder, GeocoderUnavailable } = require('../lib/geocode');

const KOPER = { latitude: 45.548, longitude: 13.7302 };

test('reads a pin in Slovenia and refuses one outside', () => {
    assert.deepEqual(readCoordinates({}), { value: null, error: null });
    assert.deepEqual(readCoordinates({ latitude: '45.5480001', longitude: 13.7302 }).value, { latitude: 45.548, longitude: 13.7302 });
    assert.ok(readCoordinates({ latitude: 48.85, longitude: 2.35 }).error); // Paris
    assert.ok(readCoordinates({ latitude: 'x', longitude: 13 }).error);
    assert.ok(readCoordinates({ latitude: 45.5 }).error);
});

test('the public point is 80-200 m away from the real one, in any direction', () => {
    for (let i = 0; i < 200; i += 1) {
        const shown = publicPoint(KOPER.latitude, KOPER.longitude);
        const d = distanceMetres(KOPER, shown);
        assert.ok(d >= 79 && d <= 201, `distance ${d}`);
    }
});

test('saving again without moving the pin keeps the same public point', () => {
    const first = locationFields(KOPER, 'pin', null);
    const again = locationFields(KOPER, 'pin', first);
    assert.equal(again.public_latitude, first.public_latitude);
    assert.equal(again.public_longitude, first.public_longitude);

    const moved = locationFields({ latitude: 45.55, longitude: 13.73 }, 'pin', first);
    assert.equal(moved.latitude, 45.55);
    assert.notEqual(moved.public_latitude, first.public_latitude);
    assert.deepEqual(locationFields(null, 'pin', first), {});
});

function fakeFetch(answers, calls) {
    return async (url, options) => {
        calls.push({ url, ua: options.headers['User-Agent'] });
        const next = answers.shift();
        if (next instanceof Error) throw next;
        return { ok: next.status ? next.status < 400 : true, status: next.status || 200, json: async () => next.body };
    };
}

test('geocoder: structured search first, one line as fallback, answers cached', async () => {
    const calls = [];
    const geo = createGeocoder({
        minIntervalMs: 0, userAgent: 'test-agent', email: 'team@example.com',
        fetchImpl: fakeFetch([{ body: [] }, { body: [{ lat: '45.54', lon: '13.73', display_name: 'Koper' }] }], calls),
    });
    const address = { street: 'Glagoljaška 8', city: 'Koper', postal_code: '6000' };
    const result = await geo.lookup(address);
    assert.deepEqual(result, { latitude: 45.54, longitude: 13.73, label: 'Koper' });
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /street=Glagolja/);
    assert.match(calls[0].url, /countrycodes=si/);
    assert.match(calls[0].url, /email=team%40example.com/);
    assert.match(calls[1].url, /q=Glagolja/);
    assert.equal(calls[0].ua, 'test-agent');

    await geo.lookup({ ...address, city: ' koper ' });
    assert.equal(calls.length, 2, 'second lookup of the same address comes from the cache');
});

test('geocoder: waits between requests', async () => {
    const calls = [];
    const geo = createGeocoder({ minIntervalMs: 120, fetchImpl: fakeFetch([{ body: [{ lat: 46, lon: 14.5 }] }, { body: [{ lat: 46.1, lon: 14.6 }] }], calls) });
    const started = Date.now();
    await Promise.all([geo.lookup({ street: 'A 1', city: 'Ljubljana' }), geo.lookup({ street: 'B 2', city: 'Ljubljana' })]);
    assert.ok(Date.now() - started >= 110);
});

test('geocoder: an error from the service is reported as unavailable', async () => {
    const geo = createGeocoder({ minIntervalMs: 0, fetchImpl: fakeFetch([{ status: 503, body: {} }], []) });
    await assert.rejects(geo.lookup({ street: 'X 1', city: 'Koper' }), GeocoderUnavailable);
    const down = createGeocoder({ minIntervalMs: 0, fetchImpl: fakeFetch([new Error('ECONNREFUSED')], []) });
    await assert.rejects(down.lookup({ street: 'X 1', city: 'Koper' }), GeocoderUnavailable);
});

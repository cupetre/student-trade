const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readInterest, interestMessage } = require('../lib/housingInterest');

const NOW = new Date('2026-11-09T10:00:00Z');
const listing = { title: 'Sunny room near FAMNIT', listing_type: 'sublet' };

test('empty body: no message, just open the chat', () => {
    const { value } = readInterest({}, NOW);
    assert.equal(interestMessage(value, listing), '');
    assert.equal(interestMessage(readInterest(undefined, NOW).value, listing), '');
});

test('builds the first message in list order, with the listing type wording', () => {
    const { value } = readInterest({ interests: ['questions', 'renting', 'viewing', 'viewing'], move_in: '2026-12-01', stay_length: 'year', note: '  I study at FAMNIT.  ' }, NOW);
    const text = interestMessage(value, listing);
    assert.equal(text, [
        'Hi! I’m interested in your place “Sunny room near FAMNIT”.',
        '',
        'I’d like:',
        '• Seeing the place (in person or on a video call)',
        '• Taking over the sublet',
        '• Asking a few questions first',
        '',
        'Move in: from 1 December 2026',
        'Stay: Year contract (12 months)',
        '',
        'I study at FAMNIT.',
    ].join('\n'));
});

test('a note alone is enough', () => {
    const { value } = readInterest({ note: 'Is it still free?' }, NOW);
    assert.match(interestMessage(value, { title: 'Flat', listing_type: 'rental' }), /Is it still free\?$/);
});

test('rejects unknown choices and bad dates', () => {
    assert.ok(readInterest({ interests: ['buy_it'] }, NOW).error);
    assert.ok(readInterest({ interests: 'viewing' }, NOW).error);
    assert.ok(readInterest({ move_in: '2026-11-08' }, NOW).error, 'past date');
    assert.ok(readInterest({ move_in: '2030-01-01' }, NOW).error, 'too far ahead');
    assert.ok(readInterest({ move_in: '01.12.2026' }, NOW).error, 'wrong format');
    assert.ok(readInterest({ stay_length: 'forever' }, NOW).error);
    assert.ok(readInterest({ note: 'x'.repeat(1001) }, NOW).error);
    assert.equal(readInterest({ move_in: '2026-11-09' }, NOW).error, undefined, 'today is fine');
});

// Run with: npm test   (uses Node's built-in test runner, no extra packages)
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toId, toPrice, toTrimmedString } = require('../lib/parse');
const { toChatSummary, toListingDto } = require('../lib/dto');

test('toId turns route params into positive integers or null', () => {
    assert.equal(toId('12'), 12);
    assert.equal(toId(7), 7);
    assert.equal(toId('0'), null);
    assert.equal(toId('-3'), null);
    assert.equal(toId('1.5'), null);
    assert.equal(toId('abc'), null);
    assert.equal(toId(undefined), null);
});

test('toPrice accepts sensible prices and rounds to cents', () => {
    assert.equal(toPrice('15'), 15);
    assert.equal(toPrice('9.999'), 10);
    assert.equal(toPrice(0), 0);
    assert.equal(toPrice(''), null);
    assert.equal(toPrice('-1'), null);
    assert.equal(toPrice('lots'), null);
});

test('toTrimmedString trims and caps length', () => {
    assert.equal(toTrimmedString('  hi  '), 'hi');
    assert.equal(toTrimmedString('abcdef', 3), 'abc');
    assert.equal(toTrimmedString(null), '');
});

test('chat summary always shows the other person', () => {
    const chat = {
        id: 5, user1_id: 1, user2_id: 2, date: '2026-10-01',
        user1: { id: 1, fullname: 'Ana', profile_picture: null },
        user2: { id: 2, fullname: 'Marko', profile_picture: 'https://x/m.jpg' },
    };
    assert.equal(toChatSummary(chat, 1).owner_of_post_fullname, 'Marko');
    assert.equal(toChatSummary(chat, 2).owner_of_post_fullname, 'Ana');
    assert.equal(toChatSummary(chat, 1).chat_id, 5);
    assert.equal(toChatSummary(chat, 1).owner_of_post_photo, 'https://x/m.jpg');
});

test('listing dto adds the flat owner fields the pages read', () => {
    const dto = toListingDto({ id: 3, title: 'Desk', owner: { id: 1, fullname: 'Ana', profile_picture: 'p.jpg' } });
    assert.equal(dto.owner_name, 'Ana');
    assert.equal(dto.owner_profile_picture, 'p.jpg');
    assert.equal(toListingDto({ id: 4 }).owner_name, null);
});

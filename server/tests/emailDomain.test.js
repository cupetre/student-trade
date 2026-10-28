// Run with: npm test   (uses Node's built-in test runner, no extra packages)
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEmail, isAllowedEmailDomain } = require('../lib/emailDomain');

process.env.ALLOWED_EMAIL_DOMAINS = 'upr.si, uni-lj.si';

test('normalizeEmail trims and lowercases', () => {
    assert.equal(normalizeEmail('  Ana.Novak@Student.UPR.si '), 'ana.novak@student.upr.si');
    assert.equal(normalizeEmail(undefined), '');
    assert.equal(normalizeEmail(42), '');
});

test('accepts exact domains and real subdomains', () => {
    assert.equal(isAllowedEmailDomain('ana@upr.si'), true);
    assert.equal(isAllowedEmailDomain('ana@student.upr.si'), true);
    assert.equal(isAllowedEmailDomain('ANA@FAMNIT.UPR.SI'), true);
    assert.equal(isAllowedEmailDomain('marko@uni-lj.si'), true);
});

test('rejects look-alike and foreign domains', () => {
    assert.equal(isAllowedEmailDomain('ana@gmail.com'), false);
    assert.equal(isAllowedEmailDomain('ana@fakeupr.si'), false);
    assert.equal(isAllowedEmailDomain('ana@upr.si.evil.com'), false);
});

test('rejects malformed input', () => {
    assert.equal(isAllowedEmailDomain(''), false);
    assert.equal(isAllowedEmailDomain('upr.si'), false);
    assert.equal(isAllowedEmailDomain('@upr.si'), false);
    assert.equal(isAllowedEmailDomain('ana@'), false);
});

test('fails closed when no domains are configured', () => {
    const saved = process.env.ALLOWED_EMAIL_DOMAINS;
    process.env.ALLOWED_EMAIL_DOMAINS = '';
    assert.equal(isAllowedEmailDomain('ana@upr.si'), false);
    process.env.ALLOWED_EMAIL_DOMAINS = saved;
});

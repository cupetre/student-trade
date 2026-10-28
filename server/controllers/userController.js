const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
    updateUserProfile,
    registerUserData,
    loginUserData,
    viewInformation,
    setVerificationToken,
    findUserByVerificationTokenHash,
    markEmailVerified,
} = require('../models/userModels.js');
const {
    hashToken,
    createVerificationToken,
    sendVerificationEmail,
    RESEND_COOLDOWN_SECONDS,
} = require('../lib/verification');
const { normalizeEmail, isAllowedEmailDomain } = require('../lib/emailDomain');

// index.js refuses to start without JWT_SECRET, so it's always set here
const JWT_SECRET = process.env.JWT_SECRET;

async function editProfile(req, res) {
    const owner_id = req.user.id;
    const profilePicPath = req.file ? req.file.location : null;

    // Only name, bio and photo can change here (the email is fixed after sign-up)
    const fullname = typeof req.body.fullname === 'string' ? req.body.fullname.trim() : undefined;
    const bio = typeof req.body.bio === 'string' ? req.body.bio.trim().slice(0, 1000) : undefined;

    if (fullname !== undefined && (fullname.length < 2 || fullname.length > 100)) {
        return res.status(400).json({ error: 'Full name must be between 2 and 100 characters', field: 'fullname' });
    }

    try {
        const result = await updateUserProfile({
            id: owner_id,
            fullname,
            bio,
            profilePicPath,
        });
        req.log.info({ userId: owner_id }, 'profile updated');
        res.json({ success: true, result });
    } catch (err) {
        req.log.error({ err, userId: owner_id }, 'failed to update profile');
        res.status(500).json({ error: 'Failed to update profile' });
    }
}

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Students and landlords sign up the same way, with two differences:
// students need a university email; landlords can use any email, may add a
// phone number, and are approved by hand before they can post listings.
async function register(req, res, role) {
    const fullname = typeof req.body.fullname === 'string' ? req.body.fullname.trim() : '';
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim().slice(0, 50) || null : null;

    if (!fullname || !email || !password) {
        return res.status(400).json({ error: 'Full name, email and password are required' });
    }

    if (fullname.length < 2 || fullname.length > 100) {
        return res.status(400).json({ error: 'Full name must be between 2 and 100 characters', field: 'fullname' });
    }

    // 72 is bcrypt's limit: it silently ignores anything past 72 bytes,
    // so a longer password would give a false sense of security.
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
        return res.status(400).json({ error: 'Password must be between 8 and 72 characters', field: 'password' });
    }

    if (role === 'student' && !isAllowedEmailDomain(email)) {
        req.log.warn({ email }, 'registration rejected: email domain not allowed');
        return res.status(400).json({ error: 'Please register with your university email address', field: 'email' });
    }
    if (role === 'landlord' && !EMAIL_FORMAT.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address', field: 'email' });
    }

    const { token, tokenHash, expiresAt, sentAt } = createVerificationToken();

    // In development landlords are approved straight away (HOUSING_AUTO_APPROVE=true);
    // in production they wait until you approve them.
    const landlordStatus = role === 'landlord'
        ? (process.env.HOUSING_AUTO_APPROVE === 'true' ? 'approved' : 'pending')
        : null;

    try {
        await registerUserData({
            fullname,
            email,
            password,
            verificationTokenHash: tokenHash,
            verificationExpiresAt: expiresAt,
            verificationSentAt: sentAt,
            role,
            landlordStatus,
            phone: role === 'landlord' ? phone : null,
        });
        req.log.info({ email, role }, 'user registered (unverified)');
    } catch (err) {
        // P2002 = Prisma's "unique constraint failed" (email is @unique in the schema)
        if (err.code === 'P2002') {
            return res.status(409).json({
                error: 'An account with this email already exists. If you haven\'t confirmed it yet, log in to get a new confirmation email.',
                field: 'email',
            });
        }
        req.log.error({ err, email }, 'failed to register user');
        return res.status(500).json({ error: 'Failed to register user' });
    }

    // Separate try: if the email fails, the account still exists and the
    // user can press "resend" on the next screen, so this isn't a failed sign-up.
    let emailSent = true;
    try {
        await sendVerificationEmail({ email, fullname, token, role });
    } catch (err) {
        emailSent = false;
        req.log.error({ err, email }, 'failed to send verification email');
    }

    res.status(201).json({ message: 'Account created. Check your email to confirm it.', email, emailSent, role });
}

function registerUser(req, res) {
    return register(req, res, 'student');
}

function registerLandlord(req, res) {
    return register(req, res, 'landlord');
}

// Same response for "no such account" and "wrong password", so the login form
// can't be used to find out which emails are registered. The logs still record
// which of the two it was.
const INVALID_LOGIN = { error: 'Invalid email or password' };

async function loginUser(req, res) {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const loggedUser = await loginUserData({ email });

        if (!loggedUser) {
            req.log.warn({ email }, 'login attempt for unknown email');
            return res.status(401).json(INVALID_LOGIN);
        }

        const valid = await bcrypt.compare(password, loggedUser.hashedpassword);
        if (!valid) {
            req.log.warn({ email }, 'login attempt with wrong password');
            return res.status(401).json(INVALID_LOGIN);
        }

        // Checked only after the password is right, so this can't be used
        // to find out whether an email has an account.
        if (!loggedUser.email_verified) {
            req.log.info({ userId: loggedUser.id }, 'login blocked: email not verified');
            return res.status(403).json({
                error: 'Please confirm your university email before logging in.',
                code: 'EMAIL_NOT_VERIFIED',
                email: loggedUser.email,
            });
        }

        const token = jwt.sign(
            { id: loggedUser.id, email: loggedUser.email },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        req.log.info({ userId: loggedUser.id }, 'user logged in');
        res.json({ token });
    } catch (err) {
        req.log.error({ err, email }, 'login failed unexpectedly');
        res.status(500).json({ error: 'Login failed' });
    }
}

async function verifyEmail(req, res) {
    const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
    const INVALID = { error: 'This confirmation link is invalid or has already been used.', code: 'INVALID_TOKEN' };

    // Our tokens are always 64 hex characters; anything else can't be real
    if (!/^[a-f0-9]{64}$/.test(token)) {
        return res.status(400).json(INVALID);
    }

    try {
        const user = await findUserByVerificationTokenHash(hashToken(token));

        if (!user) {
            req.log.warn('verification attempted with unknown or used token');
            return res.status(400).json(INVALID);
        }

        if (!user.verification_expires_at || user.verification_expires_at < new Date()) {
            req.log.info({ userId: user.id }, 'verification link expired');
            return res.status(400).json({
                error: 'This confirmation link has expired. Request a new one below.',
                code: 'TOKEN_EXPIRED',
                email: user.email,
            });
        }

        await markEmailVerified(user.id);
        req.log.info({ userId: user.id }, 'email verified');
        res.json({ message: 'Email confirmed', email: user.email });
    } catch (err) {
        req.log.error({ err }, 'email verification failed unexpectedly');
        res.status(500).json({ error: 'Could not confirm your email right now. Please try again.' });
    }
}

async function resendVerification(req, res) {
    const email = normalizeEmail(req.body.email);

    // Same answer whether or not the account exists, so this endpoint
    // can't be used to check which emails are registered.
    const GENERIC = { message: 'If an unconfirmed account exists for this email, a new confirmation link is on its way.' };

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const user = await loginUserData({ email });

        if (!user || user.email_verified) {
            return res.json(GENERIC);
        }

        // Basic flood protection: at most one email per minute per account
        const lastSent = user.verification_sent_at ? new Date(user.verification_sent_at).getTime() : 0;
        if (Date.now() - lastSent < RESEND_COOLDOWN_SECONDS * 1000) {
            req.log.info({ userId: user.id }, 'resend skipped: cooldown active');
            return res.json(GENERIC);
        }

        const { token, tokenHash, expiresAt, sentAt } = createVerificationToken();
        await setVerificationToken({ id: user.id, tokenHash, expiresAt, sentAt });
        await sendVerificationEmail({ email: user.email, fullname: user.fullname, token, role: user.role });

        req.log.info({ userId: user.id }, 'verification email resent');
        res.json(GENERIC);
    } catch (err) {
        req.log.error({ err, email }, 'failed to resend verification email');
        res.status(500).json({ error: 'Could not send the email right now. Please try again shortly.' });
    }
}

async function viewProfile(req, res) {
    const owner_id = req.user.id;

    try {
        const info = await viewInformation(owner_id);
        res.json(info);
    } catch (err) {
        req.log.error({ err, userId: owner_id }, 'failed to fetch profile info');
        res.status(500).json({ error: 'failed to fetch info' });
    }
};

module.exports = {
    editProfile,
    registerUser,
    registerLandlord,
    loginUser,
    viewProfile,
    verifyEmail,
    resendVerification,
};

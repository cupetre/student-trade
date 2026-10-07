const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

// Note: these functions no longer take `pool` as their first argument.
// Prisma's client is a singleton imported directly (see lib/prisma.js),
// so there's nothing to thread through from req.pool anymore. Models
// still on raw SQL keep taking `pool` until they're converted too —
// during the migration both patterns exist side by side, that's expected.

async function updateUserProfile({ id, fullname, email, bio, profilePicPath }) {
    return prisma.user.update({
        where: { id },
        data: {
            fullname,
            email,
            bio,
            // Only overwrite the photo if a new one was actually uploaded.
            // The old raw-SQL version always set profile_picture = $4, which
            // meant editing your bio with no new photo silently WIPED your
            // existing profile picture to NULL. That was a real bug.
            ...(profilePicPath ? { profile_picture: profilePicPath } : {}),
        },
        select: { id: true, fullname: true, email: true, bio: true, profile_picture: true },
    });
}

async function registerUserData({ fullname, email, password, verificationTokenHash, verificationExpiresAt, verificationSentAt }) {
    const hashedpassword = await bcrypt.hash(password, 10);

    return prisma.user.create({
        data: {
            fullname,
            email,
            hashedpassword,
            email_verified: false,
            verification_token_hash: verificationTokenHash,
            verification_expires_at: verificationExpiresAt,
            verification_sent_at: verificationSentAt,
        },
    });
}

// Replaces any previous token: an older link stops working once a new one is sent.
async function setVerificationToken({ id, tokenHash, expiresAt, sentAt }) {
    return prisma.user.update({
        where: { id },
        data: {
            verification_token_hash: tokenHash,
            verification_expires_at: expiresAt,
            verification_sent_at: sentAt,
        },
    });
}

async function findUserByVerificationTokenHash(tokenHash) {
    return prisma.user.findUnique({ where: { verification_token_hash: tokenHash } });
}

// Clearing the token makes every confirmation link single-use.
async function markEmailVerified(id) {
    return prisma.user.update({
        where: { id },
        data: {
            email_verified: true,
            verification_token_hash: null,
            verification_expires_at: null,
            verification_sent_at: null,
        },
    });
}

async function loginUserData({ email }) {
    // findUnique returns null when nothing matches — the caller (userController.loginUser)
    // already checks `if (!loggedUser)` and returns its own 400, so this is all it needs to do.
    //
    // The old version had a real bug here: `if (!user) return res.status(400)...` — but this
    // is a model function, it was never given `res`. Logging in with an email that doesn't
    // exist threw "ReferenceError: res is not defined" instead of returning a clean
    // "User not found", and Express 5's built-in async error handling turned that into a
    // confusing generic 500 instead of the intended 400.
    return prisma.user.findUnique({ where: { email } });
}

async function viewInformation(owner_id) {
    return prisma.user.findUnique({
        where: { id: owner_id },
        select: { fullname: true, email: true, bio: true, profile_picture: true, created_at: true },
    });
}

module.exports = {
    updateUserProfile,
    registerUserData,
    loginUserData,
    viewInformation,
    setVerificationToken,
    findUserByVerificationTokenHash,
    markEmailVerified,
};

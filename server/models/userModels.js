const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

// All models use the shared Prisma client from lib/prisma.js; none of them
// take a database `pool` argument anymore.

async function updateUserProfile({ id, fullname, bio, profilePicPath }) {
    return prisma.user.update({
        where: { id },
        data: {
            // undefined = leave unchanged (Prisma skips undefined fields)
            fullname,
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

async function registerUserData({ fullname, email, password, verificationTokenHash, verificationExpiresAt, verificationSentAt, role = 'student', landlordStatus = null, phone = null }) {
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
            role,
            landlord_status: landlordStatus,
            phone,
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
        select: { id: true, fullname: true, email: true, bio: true, profile_picture: true, created_at: true, role: true, landlord_status: true },
    });
}

// Replaces any earlier reset link: only the newest one works.
async function setPasswordResetToken({ id, tokenHash, expiresAt, sentAt }) {
    return prisma.user.update({
        where: { id },
        data: { password_reset_token_hash: tokenHash, password_reset_expires_at: expiresAt, password_reset_sent_at: sentAt },
    });
}

async function findUserByResetTokenHash(tokenHash) {
    return prisma.user.findUnique({ where: { password_reset_token_hash: tokenHash } });
}

// New password, and the link stops working. The reset link proved the person
// can read the inbox, so an unconfirmed email counts as confirmed now.
async function setNewPassword({ id, password }) {
    const hashedpassword = await bcrypt.hash(password, 10);
    return prisma.user.update({
        where: { id },
        data: {
            hashedpassword,
            password_reset_token_hash: null,
            password_reset_expires_at: null,
            password_reset_sent_at: null,
            email_verified: true,
            verification_token_hash: null,
            verification_expires_at: null,
            verification_sent_at: null,
        },
    });
}

module.exports = {
    setPasswordResetToken,
    findUserByResetTokenHash,
    setNewPassword,
    updateUserProfile,
    registerUserData,
    loginUserData,
    viewInformation,
    setVerificationToken,
    findUserByVerificationTokenHash,
    markEmailVerified,
};

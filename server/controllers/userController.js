const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { updateUserProfile, registerUserData, loginUserData, viewInformation } = require('../models/userModels.js');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

async function editProfile(req, res) {
    const owner_id = req.user.id;
    const { fullname, email, bio } = req.body;
    const profilePicPath = req.file ? req.file.location : null;

    try {
        const result = await updateUserProfile({
            id: owner_id,
            fullname,
            email,
            bio,
            profilePicPath
        });
        req.log.info({ userId: owner_id }, 'profile updated');
        res.json({ success: true, result });
    } catch (err) {
        // req.log comes from pino-http (see index.js) — it's a child logger
        // that already knows this request's id, so every line it writes
        // during this request can be correlated together.
        req.log.error({ err, userId: owner_id }, 'failed to update profile');
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

async function registerUser(req, res) {
    const { fullname, email, password } = req.body;

    try {
        await registerUserData({ fullname, email, password });
        req.log.info({ email }, 'user registered');
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        req.log.error({ err, email }, 'failed to register user');
        res.status(500).json({ error: 'Failed to register user' });
    }
};

async function loginUser(req, res) {
    const { email, password } = req.body;

    try {
        const loggedUser = await loginUserData({ email });

        if (!loggedUser) {
            req.log.warn({ email }, 'login attempt for unknown email');
            return res.status(400).json({ error: 'User not found' });
        }

        const valid = await bcrypt.compare(password, loggedUser.hashedpassword);
        if (!valid) {
            req.log.warn({ email }, 'login attempt with wrong password');
            return res.status(401).json({ error: 'Invalid password' });
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
    loginUser,
    viewProfile
};

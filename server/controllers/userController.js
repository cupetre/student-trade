const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { updateUserProfile, registerUserData, loginUserData, viewInformation } = require('../models/userModels.js');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

async function editProfile(req, res) {
    const pool = req.pool;
    const owner_id = req.user.id;
    const { fullname, email, bio } = req.body;
    const profilePicPath = req.file ? req.file.location : null;

    try {
        const result = await updateUserProfile(pool, {
            id: owner_id,
            fullname,
            email,
            bio,
            profilePicPath
        }); //this is what we send to the model to use
        res.json({ success: true, result });
        console.log(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

async function registerUser(req, res) {
    const pool = req.pool;
    const { fullname, email, password } = req.body;

    try {
        await registerUserData(pool, {
            fullname,
            email,
            password
        });
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to register user' });
    }

};

async function loginUser(req, res) {
    const pool = req.pool;
    const { email, password } = req.body;

    const loggedUser = await loginUserData(pool, { email });

    if (!loggedUser) return res.status(400).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, loggedUser.hashedpassword);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign(
        { id: loggedUser.id, email: loggedUser.email },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.json({ token });
}

async function viewProfile(req,res) {
    const pool = req.pool;
    const owner_id = req.user.id;

    try {
        const info = await viewInformation(pool, owner_id);
        res.json(info);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: " failed to fetch info "});
    }
};

module.exports = {
    editProfile,
    registerUser,
    loginUser,
    viewProfile
};
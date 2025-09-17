const { updateUserProfile, registerUserData } = require('../models/userModels.js');

async function editProfile(req, res) {
    const pool = req.pool;
    const { id, fullname, email, bio } = req.body;
    const profilePicPath = req.file ? `/uploads/profiles/${req.file.filename}` : null;

    try { 
        await updateUserProfile(pool, { 
            id,  
            fullname,
            email,
            bio,
            profilePicPath 
        });
        res.status(200).json({ message: 'Profile updated successfully' });
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

module.exports = { editProfile , registerUser};
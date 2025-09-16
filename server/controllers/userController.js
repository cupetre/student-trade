const { updateUserProfile } = require('../models/userModels.js');

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

module.exports = { editProfile };
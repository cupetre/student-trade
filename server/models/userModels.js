const bcrypt = require('bcrypt');

async function updateUserProfile(pool, { id, fullname, email, bio, profilePicPath }) {
    return pool.query(
        `UPDATE User 
         SET fullname = ?, email = ?, bio = ?, profile_picture = ? 
         WHERE id = ?`,
        [fullname, email, bio, profilePicPath, id]
    );
};

async function registerUserData(pool, { fullname, email, password }){
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
        `INSERT INTO "User" (fullname,  email, hashedpassword) VALUES ($1, $2, $3)`,
        [fullname, email, hashedPassword]
    );

}

module.exports = { updateUserProfile,
    registerUserData
 };
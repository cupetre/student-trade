const bcrypt = require('bcrypt');

async function updateUserProfile(pool, { id, fullname, email, bio, profilePicPath }) {
    const result = await pool.query(
        `UPDATE "User"
        SET fullname = $1, email = $2, bio = $3, profile_picture = $4
        WHERE id = $5
        RETURNING id, fullname, email, bio, profile_picture`,
        [fullname, email, bio, profilePicPath, id]
    );
    return result.rows[0];
};

async function registerUserData(pool, { fullname, email, password }) {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
        `INSERT INTO "User" (fullname,  email, hashedpassword) VALUES ($1, $2, $3)`,
        [fullname, email, hashedPassword]
    );
};

async function loginUserData(pool, { email }) {
    const { rows } = await pool.query(
        ` SELECT * FROM "User" WHERE email = $1`, [email]
    );

    const user = rows[0];

    if (!user) return res.status(400).json({ error: 'User not found' });
    else {
        return user || null;
    }
};

async function viewInformation(pool, owner_id) {
    const result = await pool.query(
        `SELECT fullname, email, bio, profile_picture, created_at
        FROM "User"
        WHERE id = $1` , [owner_id]
    );
    return result.rows[0];
};

module.exports = {
    updateUserProfile,
    registerUserData,
    loginUserData,
    viewInformation
};
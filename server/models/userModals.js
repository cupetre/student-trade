async function updateUserProfile(pool, { id, fullname, email, bio, profilePicPath }) {
    return pool.query(
        `UPDATE User 
         SET fullname = ?, email = ?, bio = ?, profile_picture = ? 
         WHERE id = ?`,
        [fullname, email, bio, profilePicPath, id]
    );
}

module.exports = { updateUserProfile };
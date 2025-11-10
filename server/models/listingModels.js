async function updateListing(pool, { id, ownerId, title, description, price, photo }) {
    return pool.query(
        `UPDATE ListingItem
         SET title = ?, description = ?, price = ?, photo = ?
         WHERE id = ? AND owner_id = ?`,
        [title, description, price, photo, id, ownerId]
    );
};

async function addListing(pool, { id, ownerId, title, description, price, date, photo }) {
    return pool.query(
        `INSERT INTO ListingItem
        SET title = ? , description = ?, price = ?, photo = ?
        WHERE owner_id = ?`
        [title, description, price, photo, ownerId]
    );
};

module.exports = { updateListing, addListing };
async function updateListing(pool, { id, ownerId, title, description, price, photo }) {
    return pool.query(
        `UPDATE ListingItem
         SET title = ?, description = ?, price = ?, photo = ?
         WHERE id = ? AND owner_id = ?`,
        [title, description, price, photo, id, ownerId]
    );
}

module.exports = { updateListing };
async function updateListing(pool, { id, ownerId, title, description, price, photo }) {
  return pool.query(
    `UPDATE "ListingItem"
     SET title = $1, description = $2, price = $3, photo = $4, date = NOW()
     WHERE id = $5 AND owner_id = $6`,
    [title, description, price, photo, id, ownerId]
  );
};

async function addListing(pool, { ownerId, title, description, price, photo }) {
    return pool.query(
        `INSERT INTO "ListingItem" (owner_id, title, description, price, photo, date)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [ownerId, title, description, price, photo]
    );
};

module.exports = { updateListing, addListing };
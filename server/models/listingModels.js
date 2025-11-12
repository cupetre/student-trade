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

async function viewListings(pool, {ownerId, title, description, price, photo }) {
    const result = await pool.query(
        `SELECT "ListingItem".*,
        "User".fullname AS owner_name,
        "User".id AS owner_id,
        "User".profile_picture AS owner_photo
        FROM "ListingItem"
        INNER JOIN "User" ON "ListingItem".owner_id = "User".id
        WHERE "ListingItem".owner_id != $1` , [ownerId]
    );

    return result.rows;
};

async function fetchMyListings(pool, {owner_id, title, description, price, photo }) {
    const results = await pool.query(`
        SELECT "ListingItem".* ,
        "User".id AS owner_id ,
        "User".profile_picture AS owner_photo 
        FROM "ListingItem"
        INNER JOIN "User" ON "ListingItem".owner_id = "User".id
        WHERE "ListingItem".owner_id = $1` , [ owner_id ] 
    );

    return results.rows;
};

async function removeListing(pool, { listingId, owner_id }) {
    return pool.query(`
        DELETE FROM "ListingItem"
        WHERE owner_id = $1 AND id = $2 `,
    [owner_id, listingId]);
};

module.exports = { 
    updateListing,
    addListing,
    viewListings,
    fetchMyListings,
    removeListing
 };
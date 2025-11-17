async function addReport(pool, { reporter_id, reported_id, item_id, description }) {
    return pool.query(
        `INSERT INTO "Report" (reporter_id, reported_id, item_id, description, date)
         VALUES ($1, $2, $3, $4, NOW())`,
        [reporter_id, reported_id, item_id, description]
    );
};

async function addReview(pool, { user1_id, user2_id, rating, description}) {
    return pool.query(`
        INSERT INTO "Review" (reviewer_id, reviewee_id, rating, description, created_at)
        VALUES ($1, $2, $3, $4, NOW() )`,
    [user1_id, user2_id, rating, description]
    );
};

async function fetchReviews(pool, {owner_id}) {
    const reviews = await pool.query(`
        SELECT *
        FROM "Review"
        WHERE reviewee_id = $1`,
    [owner_id]);

    return reviews.rows;
};

module.exports = {
    addReport,
    addReview,
    fetchReviews
};
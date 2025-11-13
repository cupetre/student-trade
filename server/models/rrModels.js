async function addReport(pool, { reporter_id, reported_id, item_id, description }) {
    return pool.query(
        `INSERT INTO "Report" (reporter_id, reported_id, item_id, description, date)
         VALUES ($1, $2, $3, $4, NOW())`,
        [reporter_id, reported_id, item_id, description]
    );
}

module.exports = {
    addReport
};
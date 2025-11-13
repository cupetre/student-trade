async function getMessages(chat_Id) {
    const result = await pool.query(`
        SELECT * FROM "Message"
        WHERE chat_id = $1
        ORDER BY date ASC`,
    [chat_Id]);
    
    return result.rows;
};

module.exports = {
    getMessages
};
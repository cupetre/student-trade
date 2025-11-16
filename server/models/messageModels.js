async function getMessages(chat_id) {
    const result = await pool.query(`
        SELECT * FROM "Message"
        WHERE chat_id = $1
        ORDER BY date ASC`,
        [chat_id]);

    return result.rows;
};

async function openChat(pool, { user1_id, user2_id }) {
    const check = await pool.query(`
        SELECT id FROM "Chat"
        WHERE (user1_id = $1 AND user2_id = $2)
        OR   (user1_id = $2 AND user2_id = $1)
        LIMIT 1
    `, [user1_id, user2_id]);

    console.log(user1_id);
    console.log(user2_id);

    if (check.rows.length > 0) return check.rows[0].id;

    const insert = await pool.query(`
        INSERT INTO "Chat" (user1_id, user2_id, date)
        VALUES ($1, $2, NOW())
        RETURNING id
    `, [user1_id, user2_id]);

    return insert.rows[0].id;
};

async function chatHistory(pool, { user1_id }) {
    const chats = await pool.query(`
         SELECT 
                c.id AS chat_id,
                u.id AS other_user_id,
                u.fullname AS other_user_fullname,
                u.profile_picture AS other_user_photo,

                (
                    SELECT m.content 
                    FROM "Message" m
                    WHERE m.chat_id = c.id
                    ORDER BY m.date DESC
                    LIMIT 1
                ) AS last_message,

                (
                    SELECT m.date
                    FROM "Message" m
                    WHERE m.chat_id = c.id
                    ORDER BY m.date DESC
                    LIMIT 1
                ) AS last_message_date

            FROM "Chat" c
            JOIN "User" u 
                ON u.id = CASE 
                    WHEN c.user1_id = $1 THEN c.user2_id
                    ELSE c.user1_id
                END
            WHERE $1 = c.user1_id 
               OR $1 = c.user2_id
            ORDER BY last_message_date DESC NULLS LAST
        `, [user1_id]);

    return chats.rows;
}

module.exports = {
    getMessages,
    openChat,
    chatHistory
};
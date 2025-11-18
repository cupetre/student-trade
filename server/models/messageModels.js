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
                u.id AS owner_of_post_id,
                u.fullname AS owner_of_post_fullname,
                u.profile_picture AS owner_of_post_photo,
                c.date AS chat_created_at
            FROM "Chat" c
            JOIN "User" u 
                ON u.id = CASE 
                    WHEN c.user1_id = $1 THEN c.user2_id
                    ELSE c.user1_id
                END
            WHERE c.user1_id = $1 
               OR c.user2_id = $1
            ORDER BY c.date DESC
        `, [user1_id]);
    return chats.rows; 
};

async function createMessage(pool, {chat_id, sender_id , receiver_id, content}) {
    const result = await pool.query(`
        INSERT INTO "Message" (chat_id, sender_id, receiver_id, content, sent_at) 
        VALUES ($1, $2, $3, $4, NOW() )
        RETURNING id, chat_id, sender_id, receiver_id, content, sent_at`,
    [chat_id, sender_id, receiver_id, content]);

    return result.rows[0];
};

async function readMessage(pool, {chat_id}) {
    const [messages] = await pool.query(`
        SELECT *
        FROM "Message"
        WHERE chat_id = $1
        ORDER BY sent_at ASC`
    ,[chat_id]);

    return messages;
}

module.exports = {
    getMessages,
    openChat,
    chatHistory,
    createMessage,
    readMessage
};
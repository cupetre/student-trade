/* const express = require('express');

router.put('/edit_listing', authenticationToken,upload2.single('photo'), async (req, res) => {
    const pool = req.pool;

    const my_id = req.user.id;
    const { id, title, description, price } = req.body;
    const photo = req.file ? `/uploads/listings/${req.file.filename}` : null;

    try {
        await pool.query(`
            UPDATE ListingItem 
            SET title = ?, description = ?, price = ?, photo = ? 
            WHERE id = ? AND owner_id = ?`,
            [title, description, price, photo, id, my_id]
        );

        res.json({ message: " listing was changed " });
    } catch (err) {
        res.status(500).json({ error: "not working in back " });
    }

});

router.get('/get_chat_history', authenticationToken, async (req, res) => {
    const pool = req.pool;

    const user1_id = req.user.id;
    try {
        const [rows] = await pool.query(`
        SELECT 
            c.id,
            u.id AS owner_of_post_id,
            u.fullname AS owner_of_post_fullname,
            u.profile_picture AS owner_of_post_photo,
            c.date
            FROM Chat c
            JOIN User u
                ON u.id = CASE
                    WHEN c.user1_id = ? THEN c.user2_id
                    ELSE c.user1_id
                END
            WHERE c.user1_id = ? OR c.user2_id = ?
            ORDER BY c.date DESC
            `, [user1_id, user1_id, user1_id]);

        console.log(rows);

        res.json(rows);
    } catch (err) {
        console.error('error in fetching the chats from sql/backend/db', err);
        res.status(500).json({ error: "not workkinn" });
    }

}); // not to get confused but IF user id matches any chat that has either
// user1 or user2 the same as the one using the system , we then make a JOIN table
// where we extract the user that posted the item and his info like fullname + profile_picture


router.post('/send_message', authenticationToken, async (req, res) => {
    const pool = req.pool;

    const sender_id = req.user.id;

    const { chat_id, receiver_id, content } = req.body;

    if (!chat_id || !receiver_id || !content) {
        return res.status(400).json({ error: 'Msomth is missing in the 3 fields.' });
    }

    try {
        await pool.query(`
            INSERT INTO Message(chat_id, sender_id, receiver_id, content, sent_at)
            VALUES(?, ?, ?, ?, NOW())
                `, [chat_id, sender_id, receiver_id, content]
        );

        res.json({ message: ' message is sent sucslfly ' });
    } catch (err) {
        console.error("failed in sending the message in the backend/db", err);
        res.status(500).json({ error: "problem in db" });
    }
});

router.get('/receive_messages/:chat_id', authenticationToken, async (req, res) => {
    const pool = req.pool;
    const chat_id = req.params.chat_id;

    try {
        const [messages] = await pool.query(`
            SELECT *
            FROM Message
            WHERE chat_id = ?
            ORDER BY sent_at ASC`,
            [chat_id]
        );

        res.json({ messages });
    } catch (err) {
        console.error('again fail on msgs:', err);
        res.status(500).json({ error: 'server njok dela, error' });
    }
});

router.post('/add_review', authenticationToken, async (req, res) => {
    const pool = req.pool;
    const my_id = req.user.id;
    const { user2_id, rating, description } = req.body;

    try {
        await pool.query(`
        INSERT INTO Review(reviewer_id, reviewee_id, rating, description, created_at) 
        VALUES(?, ?, ?, ?, NOW())`,
            [my_id, user2_id, rating, description]);

        res.json({ message: "it worked " });
    } catch (err) {
        console.error("something didnt work in backend", err);
    }

});

router.get('/get_reviews', authenticationToken, async (req, res) => {
    const pool = req.pool;
    const my_id = req.user.id;

    try {
        const [reviews] = await pool.query(`
            SELECT * FROM Review WHERE reviewee_id = ? `,
            [my_id]);

        console.log(reviews);

        res.json(reviews);
    } catch (err) {
        res.status(500).json({ err: "yikes" });
    }
});

// report post api
router.post('/add_report', authenticationToken, async (req, res) => {
    const pool = req.pool;
    const reporter_id = req.user.id;
    const { reported_id, item_id, description } = req.body;

    try {
        await pool.query(`
            INSERT INTO Report(reporter_id, reported_id, item_id, description, date)
            VALUES(?, ?, ?, ?, NOW())`,
            [reporter_id, reported_id, item_id, description]);

        res.json({ message: "import worked " });
    } catch (err) {
        console.error("error in sending to db", err);
    }
});


module.exports = router; */
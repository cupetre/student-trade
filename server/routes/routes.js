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

module.exports = router; */
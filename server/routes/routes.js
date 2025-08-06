const express = require('express');

const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

const profilePicStorage = multer.diskStorage({
    destination: './uploads/profiles/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const listingStorage = multer.diskStorage({
    destination: './uploads/listings/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload1 = multer({ storage: profilePicStorage });
const upload2 = multer({ storage: listingStorage });

function authenticationToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // If no token is provided, set status 401 and send a JSON response.
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        // If the token is invalid, set status 403 and send a JSON response.
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        // If the token is valid, attach the user and continue to the next middleware.
        req.user = user;
        next();
    });
};

router.put('/profile', authenticationToken, upload1.single('profilePicture'), async (req, res) => {
    const pool = req.pool;

    const { fullname, email, bio } = req.body;
    const profilePicPath = req.file ? `/uploads/profiles/${req.file.filename}` : null;

    try {
        await pool.query('UPDATE User SET fullname = ? , email = ? , bio = ? , profile_picture = ? WHERE id = ? ',
            [fullname, email, bio, profilePicPath, req.user.id]
        );

        res.json({ message: "profle succsly updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'failed to upd' });
    }
});

router.get('/getprofile', authenticationToken, async (req, res) => {

    const pool = req.pool;

    try {
        const [rows] = await pool.query(
            'SELECT fullname, email, bio, created_at, profile_picture FROM User WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

router.get('/fullname', authenticationToken, async (req, res) => {
    const pool = req.pool;

    console.log('User:', req.user);
    console.log('Pool exists:', !!req.pool);

    try {
        const [rows] = await pool.query('SELECT fullname FROM User WHERE id = ?', [req.user.id]);

        if (!rows.length)
            return res.status(404).json({ error: 'User not found' });
        res.json({ fullname: rows[0].fullname });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.get('/email', authenticationToken, async (req, res) => {
    const pool = req.pool;

    try {
        const [rows] = await pool.query('SELECT email FROM User WHERE id = ?', [req.user.id]);

        if (!rows.length)
            return res.status(404).json({ error: 'User not found' });
        res.json({ email: rows[0].email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.get('/bio', authenticationToken, async (req, res) => {
    const pool = req.pool;

    try {
        const [rows] = await pool.query('SELECT bio FROM User WHERE id = ?', [req.user.id]);

        if (!rows.length)
            return res.status(404).json({ error: 'User not found' });
        res.json({ bio: rows[0].bio });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.get('/created_at', authenticationToken, async (req, res) => {
    const pool = req.pool;

    try {
        const [rows] = await pool.query('SELECT created_at FROM User WHERE id = ?', [req.user.id]);

        if (!rows.length)
            return res.status(404).json({ error: 'User not found' });
        res.json({ created_at: rows[0].created_at });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.post('/listings', authenticationToken, upload2.single('photo'), async (req, res) => {
    const pool = req.pool;

    const { title, description, price } = req.body;
    const owner_id = req.user.id;
    const imagePath = req.file ? `uploads/listings/${req.file.filename}` : null;

    try {
        await pool.query(
            `INSERT INTO ListingItem (owner_id, title, description, price, date, photo) VALUES (?,?,?,?, NOW(), ?)`,
            [owner_id, title, description, price, imagePath]
        );

        res.json({ message: 'Listing created scsfly!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save listing' });
    }
});

router.get('/showListings', async (req, res) => {
    const pool = req.pool;

    try {
        const [rows] = await pool.query(`
            SELECT
                ListingItem.*, 
                User.fullname AS owner_name,
                User.profile_picture as owner_photo
            FROM ListingItem
            INNER JOIN User ON ListingItem.owner_id = User.id`);
        res.json(rows); // okey so first we pull everything from ListingItem , then we pull the fullnames from the User db as owner_name and the prof_pict, we do a join, and extract the fullname
    } catch (err) {
        console.error('failed getting the listing items', err);
        res.status(500).json({ error: 'yikes again' });
    }
});

router.get('/showmylistings', authenticationToken, async (req, res) => {
    const pool = req.pool;
    const my_id = req.user.id;

    try {
        const [rows] = await pool.query(`SELECT * FROM ListingItem WHERE owner_id = ? `, [my_id]);
        res.json(rows);
    } catch (err) {
        console.error('failed getting my own listing items', err);
        res.status(500).json({ error: 'not working' });
    }
});

router.post('/create_chat', authenticationToken, async (req, res) => {
    const pool = req.pool;
    const user1_id = req.user.id;
    const { user2_id } = req.body;

    // okey first we check if there is an existing chat alredy
    const [existingChats] = await pool.query(
        `SELECT id FROM Chat
        WHERE (user1_id = ? AND user2_id = ?) 
        OR (user1_id = ? AND user2_id = ? )
        LIMIT 1`, [user1_id, user2_id, user2_id, user1_id]
    );

    if (existingChats.length > 0) {
        return res.json({ chat_id: existingChats[0].chat_id });
    }

    // if there isn't , we create one
    const [created_chat] = await pool.query(
        `INSERT INTO Chat (user1_id, user2_id, date)
        VALUES (?, ?, NOW() )`, [user1_id, user2_id]
    );

    const chat_id = created_chat.insertId;
    res.json({ chat_id });
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
            INSERT INTO Message (chat_id, sender_id, receiver_id, content, sent_at)
            VALUES (?, ?, ?, ?, NOW() )
            `, [chat_id, sender_id, receiver_id, content]
        );

        res.json({ message: ' message is sent sucslfly ' });
    } catch (err) {
        console.error("failed in sending the message in the backend/db", err);
        res.status(500).json({ error: "problem in db" });
    }
});

router.get('/receive_message/:chat_id', authenticationToken, async (req, res) => {
    const pool = req.pool;

    const user_id = req.body.id;

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
        INSERT INTO Review (reviewer_id, reviewee_id, rating, description, created_at) 
        VALUES (?, ?, ?, ?, NOW() )`,
            [my_id, user2_id, rating, description]);

        res.json({ message: "it worked " });
    } catch (err) {
        console.error("something didnt work in backend", err);
    }

});

module.exports = router;
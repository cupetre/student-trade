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

    if (!token) return res.sendStatus(410).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

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

router.get('/get_profile', authenticationToken, async (req, res) => {

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

router.get('/showListings', async(req,res) => {
    const pool = req.pool;

    try {
        const [rows] = await pool.query(`SELECT * FROM ListingItem`);
        res.json(rows);
    } catch (err) {
        console.error('failed getting the listing items', err);
        res.status(500).json({ error:'yikes again' });
    }
});

router.get('/show_my_listings', authenticationToken, async(req,res) => {
    const pool = req.pool;
    const my_id = req.user.id;

    try { 
        const[rows] = await pool.query(`SELECT * FROM ListingItem WHERE owner_id = ? `, [my_id] );
        res.json(rows);
    } catch (err) {
        console.error('failed getting my own listing items', err);
        res.status(500).json({ error:'not working' });
    }
});

module.exports = router;
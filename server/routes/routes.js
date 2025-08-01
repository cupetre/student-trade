const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET  || 'super-secret-key';

function authenticationToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(410);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

router.get('/userFullname', async(req,res) => {
    try {
        const [rows] = await req.pool.query('SELECT fullname FROM User');
        res.json({ success: true, data: rows });
    } catch(error) {
        console.error('Error fetching fullname od brat mi:', error);
        res.status(500).json({ success: false , message:'za kur ne te biva' , error: error.message});
    }
});

router.get('/fullname', authenticationToken, async(req, res) => {
    const pool = req.pool; 
    
    console.log('User:', req.user);
    console.log('Pool exists:', !!req.pool);

    try {
        const [rows] = await pool.query('SELECT fullname FROM User WHERE id = ?', [req.user.id]);

        if (!rows.length) 
            return res.status(404).json({ error: 'User not found'});
        res.json({ fullname: rows[0].fullname });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.get('/email', authenticationToken, async(req, res) => {
    const pool = req.pool; 

    try {
        const [rows] = await pool.query('SELECT email FROM User WHERE id = ?', [req.user.id]);

        if (!rows.length) 
            return res.status(404).json({ error: 'User not found'});
        res.json({ email: rows[0].email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.get('/bio', authenticationToken, async(req, res) => {
    const pool = req.pool; 

    try {
        const [rows] = await pool.query('SELECT bio FROM User WHERE id = ?', [req.user.id]);

        if (!rows.length) 
            return res.status(404).json({ error: 'User not found'});
        res.json({ bio: rows[0].bio });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.get('/created_at', authenticationToken, async(req, res) => {
    const pool = req.pool; 

    try {
        const [rows] = await pool.query('SELECT created_at FROM User WHERE id = ?', [req.user.id]);

        if (!rows.length) 
            return res.status(404).json({ error: 'User not found'});
        res.json({ created_at: rows[0].created_at });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.put('/profile', authenticationToken, async(req,res) => {
    const pool = req.pool;

    const { fullname, email, bio } = req.body;

    try {
        await pool.query('UPDATE User SET fullname = ? , email = ? , bio = ? WHERE id = ? ', 
            [fullname,email,bio,req.user.id]
            );

            res.json({ message : "profle succsly updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'failed to upd' });
    }
});

module.exports = router;
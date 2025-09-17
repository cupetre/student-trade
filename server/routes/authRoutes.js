const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

/*
router.post('/register', async (req, res) => {
  const { email, password, fullname } = req.body;
  const pool = req.pool;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO "User" (email, fullname, password) VALUES ($1, $2, $3)',
      [email, fullname, hashedPassword]
    );

    res.json({ message: 'User registered' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});
*/

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const pool = req.pool;

  try {
    const [users] = await pool.query('SELECT * FROM User WHERE email = ?', [email]);
    const user = users[0];

    if (!user) return res.status(400).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.hashedPassword);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;

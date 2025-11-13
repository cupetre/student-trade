require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const listingRoutes = require('./routes/listingRoutes.js');
const rrRoutes = require('./routes/rrRoutes.js');
const messageRoutes = require('./routes/messageRoutes.js');

const multer = require('multer');
const path = require('path');
const pkg = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});
const port = 5151; //the port that we use in order the SERVER to run on it ( backend ) 
const { Pool } = pkg;

const connectedUsers = new Map(); // where we'll connect user_id -> socket.id

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('No token'));
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');
        socket.user = user;
        next();
    } catch {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    const userId = socket.user.id;
    connectedUsers.set(userId, socket.id);

    socket.on('send_message', async ({ chat_id, receiver_id, content }) => {
        await pool.query(`
      INSERT INTO "Message" (chat_id, sender_id, receiver_id, content, date)
      VALUES ($1, $2, $3, $4, NOW())`,
            [chat_id, userId, receiver_id, content]
        );

        const receiverSocket = connectedUsers.get(receiver_id);
        if (receiverSocket) {
            io.to(receiverSocket).emit('new_message', {
                chat_id, sender_id: userId, content, date: new Date()
            });
        }
    });

    socket.on('disconnect', () => {
        connectedUsers.delete(userId);
    });
});

(async () => {

    app.use((req, res, next) => {
        req.pool = pool;
        next();
    });

    app.use('/api/users', userRoutes);
    app.use('/api/listings', listingRoutes);
    app.use('/uploads', express.static('uploads'));
    app.use('/api/rr', rrRoutes);
    // app.use('/api/messages', messageRoutes);

    app.get('/', (req, res) => {
        res.send('API is working!');
    });

    server.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
})();

app.get('/api/test', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT 1+1 AS result');
        res.json({ dbConnected: true, results: rows[0].result });
    } catch (error) {
        console.error('Database connection failed: ', error);
        res.status(500).json({ dbConnected: false, error: error.message });
    }
});

app.get(`/api/try_this`, async (req, res) => {
    const pool = req.pool;

    try {
        const { rows } = await pool.query('SELECT * FROM "User" LIMIT 1');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed' });
    }
});
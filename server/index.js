require('dotenv').config();

const express = require('express');
const cors = require('cors');
const routes = require('./routes/routes.js');
const authRoutes = require('./routes/authRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const listingRoutes = require('./routes/listingRoutes.js');
const multer = require('multer');
const path = require('path');
const pkg = require('pg');
const app = express();
const port = 5151; //the port that we use in order the SERVER to run on it ( backend ) 

const { Pool } = pkg; 

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

(async () => {

    app.use((req, res, next) => {
        req.pool = pool;
        next();
    });

    app.use('/api', routes);
    app.use('/api/users', userRoutes);
    app.use('/api/listings', listingRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/uploads', express.static('uploads'));

    app.get('/', (req, res) => {
        res.send('API is working!');
    });

    app.listen(port, () => {
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
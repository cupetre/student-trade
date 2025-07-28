require('dovenv').config();

const express = require('express');
const cors = require('cors');
const mysql=require('mysql2/promise');
const routes = require('./routes/routes.js');

const app = express();
const port = 5151;

app.use(cors());
app.use(express.json());

let pool;

async function initializeDB() {
    pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    console.log('Database pool is created tho');
}

app.use((req, res, next) => {
    req.pool = pool;
    next();
});

app.get('/', (req, res) => {
  res.send('API is working!');
});

app.use('/api', routes);

app.listen(port, async () => {
    await initializeDB();
  console.log(`Server running at http://localhost:${port}`);
});
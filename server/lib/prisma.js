// Single shared Prisma Client instance for the whole server.
//
// Why a singleton: every PrismaClient instance opens its own connection
// pool to Postgres. In dev, nodemon restarts the process on every file
// save, and without this pattern you'd leak a new pool on every restart
// until Postgres refuses new connections. Importing this file everywhere
// (instead of `new PrismaClient()` in each model file) guarantees exactly
// one pool for the whole app, mirroring how `pool` from index.js is
// shared today via `req.pool`.
const { PrismaClient } = require('@prisma/client');

const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;

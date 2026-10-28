// Tests never talk to Postgres. Loading this first replaces the shared Prisma
// client with an empty object, so requiring controllers/models doesn't start
// a real database client (which also fails on machines without the engine).
const path = require('node:path');

const prismaPath = path.resolve(__dirname, '../lib/prisma.js');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: {} };

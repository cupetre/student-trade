require('dotenv').config({ quiet: true });

const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const logger = require('./lib/logger');
const prisma = require('./lib/prisma');
const { requestLogger } = require('./lib/requestLogger');
const { notFound, errorHandler, attachRequestIdToServerErrors } = require('./lib/errors');
const { logConfiguration, checkDatabase } = require('./lib/startup');
const { ChatError, sendChatMessage, userRoom } = require('./services/messageService');

const userRoutes = require('./routes/userRoutes.js');
const listingRoutes = require('./routes/listingRoutes.js');
const rrRoutes = require('./routes/rrRoutes.js');
const messageRoutes = require('./routes/messageRoutes.js');
const publicRoutes = require('./routes/publicRoutes.js');
const housingRoutes = require('./routes/housingRoutes.js');

const socketLog = logger.createLogger('socket');

// Refuse to start without a real JWT secret. There used to be a hardcoded
// fallback here, which anyone reading the public repo could use to forge logins.
if (!process.env.JWT_SECRET) {
    logger.fatal('JWT_SECRET is not set. Add it to server/.env (see .env.example) and restart.');
    process.exit(1);
}

const PORT = Number(process.env.PORT) || 5151;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || '*' },
});

// Behind a reverse proxy (nginx) in production, set TRUST_PROXY=1 so req.ip
// is the student's real IP and the rate limits count the right people.
if (process.env.TRUST_PROXY) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', exposedHeaders: ['X-Request-Id'] }));
app.use(requestLogger);                 // one log line per request + req.id + req.log
app.use(attachRequestIdToServerErrors); // 5xx answers carry the request id
app.use(express.json({ limit: '100kb' }));

// ---------- live chat (Socket.io) ----------

// Only logged-in users may open a socket: the page sends its login token.
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
        socketLog.warn({ ip: socket.handshake.address }, 'socket refused: no token');
        return next(new Error('No token'));
    }

    try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        socketLog.warn({ ip: socket.handshake.address }, 'socket refused: invalid or expired token');
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    const userId = socket.user.id;
    socketLog.debug(`user ${userId} connected (${socket.id})`);

    // A private room per user: messages for them go to every tab they have open.
    socket.join(userRoom(userId));

    socket.on('disconnect', (reason) => {
        socketLog.debug(`user ${userId} disconnected (${reason})`);
    });

    // Sending over the socket uses the same checks as the REST endpoint.
    socket.on('send_message', async (payload, ack) => {
        try {
            const { message, receiverId } = await sendChatMessage({
                chatId: payload?.chat_id,
                senderId: userId,
                content: payload?.content,
            });

            io.to(userRoom(receiverId)).emit('new_message', message);
            socket.emit('message_sent', message);
            socketLog.debug(`message ${message.id} in chat ${message.chat_id}: user ${userId} → user ${receiverId}`);
            if (typeof ack === 'function') ack({ ok: true, message });
        } catch (err) {
            const error = err instanceof ChatError ? err.message : 'Failed to send message';
            if (err instanceof ChatError) socketLog.warn({ userId, chatId: payload?.chat_id }, `send_message refused: ${err.message}`);
            else socketLog.error({ err, userId }, 'send_message failed');
            socket.emit('message_error', { error });
            if (typeof ack === 'function') ack({ ok: false, error });
        }
    });
});

// Controllers use req.io to push live messages
app.use((req, res, next) => {
    req.io = io;
    next();
});

// ---------- routes ----------

app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/rr', rrRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/housing', housingRoutes);
app.use('/uploads', express.static('uploads'));

// Health check for monitoring/uptime tools: is the API up and can it reach the database?
app.get('/api/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ ok: true, db: true });
    } catch (err) {
        req.log.error({ err }, 'health check failed');
        res.status(503).json({ ok: false, db: false });
    }
});

app.get('/', (req, res) => {
    res.send('API is working!');
});

// ---------- errors ----------

app.use('/api', notFound);  // unknown API address -> JSON 404
app.use(errorHandler);      // anything thrown -> logged + clean JSON answer

// ---------- start / stop ----------

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        logger.fatal(`Port ${PORT} is already in use. Is the server already running in another terminal? Stop it, or set PORT in server/.env.`);
    } else {
        logger.fatal({ err }, 'server failed to start');
    }
    process.exit(1);
});

server.listen(PORT, async () => {
    logger.info(`Server running at http://localhost:${PORT}`);
    logConfiguration({ port: PORT });
    await checkDatabase(prisma);
});

// A forgotten .catch() somewhere: log it loudly, keep serving
process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection (a missing try/catch or .catch somewhere)');
});

// A real crash: log it, then stop cleanly (the process may be in a broken state)
process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception, shutting down');
    shutdown(1);
});

let shuttingDown = false;
function shutdown(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('Shutting down…');

    const force = setTimeout(() => process.exit(code), 3000);
    force.unref();

    io.close();
    server.close(async () => {
        await prisma.$disconnect().catch(() => {});
        logger.info('Stopped');
        logger.flush?.();
        setTimeout(() => process.exit(code), 100);
    });
}

process.on('SIGINT', () => shutdown(0));  // Ctrl+C in the terminal
process.on('SIGTERM', () => shutdown(0)); // tsx watch restart, Docker stop

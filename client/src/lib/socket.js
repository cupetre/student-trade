import { io } from 'socket.io-client';
import { getValidToken } from './auth';
import { createLogger } from './logger';

const log = createLogger('socket');

// One live connection for the whole app (the Messages page and the unread badge
// in the top bar share it). It belongs to the login token: logging out, or in as
// someone else, closes it and the next getSocket() opens a new one.
let socket = null;
let socketToken = null;

export function closeSocket() {
    if (socket) socket.disconnect();
    socket = null;
    socketToken = null;
}

export function getSocket() {
    const token = getValidToken();
    if (!token) { closeSocket(); return null; }
    if (socket && socketToken === token) return socket;
    closeSocket();
    socket = io({ auth: { token } });
    socketToken = token;
    socket.on('connect_error', (err) => log.warn('Live messages unavailable:', err.message));
    return socket;
}

if (typeof window !== 'undefined') window.addEventListener('anchor:logout', closeSocket);

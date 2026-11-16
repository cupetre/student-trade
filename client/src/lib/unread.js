import { useEffect, useState } from 'react';
import { apiRequest } from './api';
import { getValidToken } from './auth';
import { getSocket } from './socket';

// How many messages are waiting for me. One number shared by everything that
// shows it (the badge on the Messages icon); the server is the source of truth.
let count = 0;
const listeners = new Set();
let wiredSocket = null;

export function setUnreadCount(next) {
    const value = Math.max(0, Number(next) || 0);
    if (value === count) return;
    count = value;
    listeners.forEach(fn => fn(count));
}

export async function refreshUnread() {
    if (!getValidToken()) { setUnreadCount(0); return; }
    const { ok, data } = await apiRequest('/api/messages/unread_count');
    if (ok) setUnreadCount(data.count);
}

// Live updates: a message for me arrived, or I read a chat in another tab
function wireSocket() {
    const socket = getSocket();
    if (!socket || socket === wiredSocket) return;
    wiredSocket = socket;
    socket.on('new_message', () => refreshUnread());
    socket.on('unread_changed', (payload) => setUnreadCount(payload?.count));
}

export function useUnreadCount() {
    const [value, setValue] = useState(count);

    useEffect(() => {
        listeners.add(setValue);
        setValue(count);
        wireSocket();
        refreshUnread();
        const onFocus = () => refreshUnread();
        window.addEventListener('focus', onFocus);
        return () => { listeners.delete(setValue); window.removeEventListener('focus', onFocus); };
    }, []);

    return value;
}

if (typeof window !== 'undefined') window.addEventListener('anchor:logout', () => { wiredSocket = null; setUnreadCount(0); });

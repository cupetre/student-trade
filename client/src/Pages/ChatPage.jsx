import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import AppNav from '../components/AppNav.jsx';
import Avatar from '../components/Avatar.jsx';
import { StarInput } from '../components/Stars.jsx';
import { apiRequest } from '../lib/api';
import { getValidToken } from '../lib/auth';
import { resolveMediaUrl } from '../lib/media';
import { useCurrentUser, isLandlord } from '../lib/useCurrentUser';
import { createLogger } from '../lib/logger';
import './housing/Housing.css';
import './ChatPage.css';

const socketLog = createLogger('socket');
const MAX_LENGTH = 2000;

// ---------- dates ----------

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysAgo = (value) => Math.round((startOfDay(new Date()) - startOfDay(new Date(value))) / DAY);
const clock = (value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// In the conversation list: 14:05 · Yesterday · Mon · 12 Oct
function listTime(value) {
    if (!value) return '';
    const days = daysAgo(value);
    if (days <= 0) return clock(value);
    if (days === 1) return 'Yesterday';
    if (days < 7) return new Date(value).toLocaleDateString([], { weekday: 'short' });
    return new Date(value).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

// Between messages: Today · Yesterday · Monday 12 October
function dayLabel(value) {
    const days = daysAgo(value);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    const sameYear = new Date(value).getFullYear() === new Date().getFullYear();
    return new Date(value).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) });
}

// Adds a message unless we already have it (it can arrive twice: as the
// answer to our own send and over the live connection in another tab)
const addMessage = (list, message) => (list.some(m => m.id === message.id) ? list : [...list, message]);

const SendIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ch-icon"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z" /></svg>
);
const BackIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ch-icon"><path d="M15 6l-6 6 6 6" /></svg>
);

// ---------- review dialog ----------

const ReviewDialog = ({ person, onClose, onDone }) => {
    const [rating, setRating] = useState(0);
    const [text, setText] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const formRef = useRef(null);
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; }, [onClose]);

    // Focus the first star when it opens; Escape closes it
    useEffect(() => {
        formRef.current?.querySelector('input')?.focus();
        const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        if (!rating) { setError('Choose how many stars.'); return; }
        setSending(true);
        const { ok, data } = await apiRequest('/api/rr/submit_review', {
            method: 'POST',
            body: { user2_id: person.id, rating, description: text.trim() },
        });
        setSending(false);
        if (!ok) { setError(data.error); return; }
        onDone(data.message || 'Thanks, your review was saved.');
    };

    return (
        <div className="ch-dialog-backdrop" onClick={onClose}>
            <form ref={formRef} className="ch-dialog" role="dialog" aria-modal="true" aria-labelledby="ch-review-title"
                onClick={(e) => e.stopPropagation()} onSubmit={submit}>
                <div className="ch-dialog-head">
                    <Avatar src={resolveMediaUrl(person.photo)} name={person.name} size={44} />
                    <div>
                        <h2 id="ch-review-title">Review {person.name}</h2>
                        <p className="hs-muted">How was buying, selling or renting with them? One review per person; sending again updates it.</p>
                    </div>
                </div>

                <div className="ch-rating">
                    <StarInput value={rating} name="ch-rating" onChange={(n) => { setRating(n); setError(''); }} />
                </div>

                <div className="hs-field">
                    <label htmlFor="ch-review-text">What went well, or what didn’t? <span className="hs-optional">(optional)</span></label>
                    <textarea id="ch-review-text" rows="4" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
                </div>

                {error && <p className="hs-field-error" role="alert">{error}</p>}

                <div className="ch-dialog-actions">
                    <button type="button" className="hs-btn hs-btn--ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" className="hs-btn" disabled={sending}>{sending ? 'Sending…' : 'Send review'}</button>
                </div>
            </form>
        </div>
    );
};

// ---------- page ----------

// Messages (/chatpage, ?chatId=12 opens one conversation). Conversation list on
// the left, the open conversation on the right; on phones one at a time.
const ChatPage = () => {
    const { user } = useCurrentUser();
    const myId = user?.id;
    const [params, setParams] = useSearchParams();
    const selectedId = Number(params.get('chatId')) || null;

    const [chats, setChats] = useState([]);
    const [listState, setListState] = useState({ loading: true, error: '' });
    const [listVersion, setListVersion] = useState(0); // bump to reload the list
    const [unread, setUnread] = useState(() => new Set()); // new messages while this page is open

    const [thread, setThread] = useState({ chatId: null, messages: [], loading: false, error: '' });
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const [reviewOpen, setReviewOpen] = useState(false);
    const [notice, setNotice] = useState('');

    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const selectedIdRef = useRef(selectedId);
    const chatsRef = useRef(chats);
    useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
    useEffect(() => { chatsRef.current = chats; }, [chats]);

    const selected = chats.find(c => c.chat_id === selectedId) || null;

    // Conversation list
    useEffect(() => {
        let cancelled = false;
        apiRequest('/api/messages/get_history').then(({ ok, data }) => {
            if (cancelled) return;
            if (!ok) { setListState({ loading: false, error: data.error }); return; }
            setChats(Array.isArray(data) ? data : []);
            setListState({ loading: false, error: '' });
        });
        return () => { cancelled = true; };
    }, [listVersion]);

    // Messages of the open conversation
    useEffect(() => {
        if (!selectedId) { setThread({ chatId: null, messages: [], loading: false, error: '' }); return undefined; }
        let cancelled = false;
        setThread({ chatId: selectedId, messages: [], loading: true, error: '' });
        setUnread(prev => { if (!prev.has(selectedId)) return prev; const next = new Set(prev); next.delete(selectedId); return next; });
        setDraft('');
        setSendError('');
        setNotice('');
        apiRequest(`/api/messages/receive_messages/${selectedId}`).then(({ ok, data }) => {
            if (cancelled) return;
            setThread({ chatId: selectedId, messages: ok && Array.isArray(data) ? data : [], loading: false, error: ok ? '' : data.error });
        });
        return () => { cancelled = true; };
    }, [selectedId]);

    // Keep the newest message in view (scrolls only the message area, not the page)
    useEffect(() => {
        const box = scrollRef.current;
        if (box) box.scrollTop = box.scrollHeight;
    }, [thread.messages, thread.loading]);

    // Put the conversation at the top of the list with its newest message
    const bumpChat = useCallback((message) => {
        setChats(prev => {
            const chat = prev.find(c => c.chat_id === message.chat_id);
            if (!chat) return prev;
            const updated = { ...chat, last_message: { content: message.content, sent_at: message.sent_at, sender_id: message.sender_id }, last_activity: message.sent_at };
            return [updated, ...prev.filter(c => c.chat_id !== message.chat_id)];
        });
    }, []);

    // Live messages: one connection while this page is open
    useEffect(() => {
        const token = getValidToken();
        if (!token) return undefined;
        const socket = io({ auth: { token } });

        socket.on('new_message', (message) => {
            if (message.chat_id === selectedIdRef.current) {
                setThread(prev => (prev.chatId === message.chat_id ? { ...prev, messages: addMessage(prev.messages, message) } : prev));
            } else {
                setUnread(prev => new Set(prev).add(message.chat_id));
            }
            if (chatsRef.current.some(c => c.chat_id === message.chat_id)) bumpChat(message);
            else setListVersion(v => v + 1); // someone started a new conversation with us
        });
        socket.on('connect_error', (err) => socketLog.warn('Live messages unavailable:', err.message));

        return () => socket.disconnect();
    }, [bumpChat]);

    const openChat = (chatId) => setParams({ chatId: String(chatId) });
    const backToList = () => setParams({});

    const send = async (e) => {
        e?.preventDefault();
        const content = draft.trim();
        if (!content || sending || !selected) return;
        setSending(true);
        setSendError('');
        const { ok, data } = await apiRequest('/api/messages/send_messages', {
            method: 'POST',
            body: { chat_id: selected.chat_id, content },
        });
        setSending(false);
        if (!ok) { setSendError(data.error || 'Your message wasn’t sent. Try again.'); return; }
        setThread(prev => (prev.chatId === data.chat_id ? { ...prev, messages: addMessage(prev.messages, data) } : prev));
        bumpChat(data);
        setDraft('');
        inputRef.current?.focus();
    };

    const onKeyDown = (e) => {
        // Enter sends, Shift+Enter starts a new line
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e);
    };

    // Let the text box grow with its content, up to a few lines
    useEffect(() => {
        const box = inputRef.current;
        if (!box) return;
        box.style.height = 'auto';
        box.style.height = `${Math.min(box.scrollHeight, 140)}px`;
    }, [draft]);

    // Messages grouped by day
    const groups = useMemo(() => {
        const out = [];
        for (const message of thread.messages) {
            const label = dayLabel(message.sent_at);
            const last = out[out.length - 1];
            if (last && last.label === label) last.messages.push(message);
            else out.push({ label, messages: [message] });
        }
        return out;
    }, [thread.messages]);

    const landlord = isLandlord(user);
    const noChats = !listState.loading && !listState.error && chats.length === 0;
    const person = selected && { id: selected.owner_of_post_id, name: selected.owner_of_post_fullname || 'Anchor user', photo: selected.owner_of_post_photo };
    const firstName = person?.name.split(' ')[0];

    // Nobody to talk to yet: one clear empty state instead of two empty panes
    if (noChats) {
        return (
            <div className="hs-shell">
                <AppNav />
                <main className="hs-page">
                    <div className="hs-empty ch-none">
                        <h1>No messages yet</h1>
                        <p>
                            {landlord
                                ? 'When a student messages you about one of your places, the conversation shows up here.'
                                : 'Message a seller about an item or a landlord about a place, and the conversation shows up here.'}
                        </p>
                        <div className="ch-none-actions">
                            {!landlord && <Link to="/marketplace" className="hs-btn">Browse the marketplace</Link>}
                            <Link to={landlord ? '/housing/mine' : '/housing'} className={`hs-btn ${landlord ? '' : 'hs-btn--ghost'}`}>
                                {landlord ? 'My places' : 'Find a place'}
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="hs-shell">
            <AppNav />
            <main className="ch-page">
                <div className={`ch-frame ${selectedId ? 'is-open' : ''}`}>
                    {/* ---- conversation list ---- */}
                    <aside className="ch-list" aria-label="Conversations">
                        <h1 className="ch-list-title">Messages</h1>
                        {listState.loading && <p className="ch-list-note">Loading…</p>}
                        {listState.error && <div className="hs-alert hs-alert--error ch-list-note" role="alert">{listState.error}</div>}
                        <ul>
                            {chats.map(chat => {
                                const last = chat.last_message;
                                const isUnread = unread.has(chat.chat_id);
                                return (
                                    <li key={chat.chat_id}>
                                        <button type="button"
                                            className={`ch-item ${chat.chat_id === selectedId ? 'is-active' : ''} ${isUnread ? 'is-unread' : ''}`}
                                            aria-current={chat.chat_id === selectedId ? 'true' : undefined}
                                            onClick={() => openChat(chat.chat_id)}>
                                            <Avatar src={resolveMediaUrl(chat.owner_of_post_photo)} name={chat.owner_of_post_fullname} size={44} />
                                            <span className="ch-item-text">
                                                <span className="ch-item-top">
                                                    <span className="ch-item-name">{chat.owner_of_post_fullname || 'Anchor user'}</span>
                                                    <span className="ch-item-time">{listTime(last?.sent_at || chat.last_activity || chat.chat_created_at)}</span>
                                                </span>
                                                <span className="ch-item-preview">
                                                    {last ? `${last.sender_id === myId ? 'You: ' : ''}${last.content}` : 'No messages yet'}
                                                </span>
                                            </span>
                                            {isUnread && <span className="ch-dot"><span className="ch-sr">New message</span></span>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </aside>

                    {/* ---- open conversation ---- */}
                    <section className="ch-thread" aria-label={person ? `Conversation with ${person.name}` : 'Conversation'}>
                        {!selectedId && (
                            <div className="ch-placeholder">
                                <p>Pick a conversation on the left.</p>
                            </div>
                        )}

                        {selectedId && !selected && !listState.loading && (
                            <div className="ch-placeholder">
                                <p>This conversation isn’t available.</p>
                                <button type="button" className="hs-btn hs-btn--ghost" onClick={backToList}>All messages</button>
                            </div>
                        )}

                        {selected && (
                            <>
                                <header className="ch-thread-head">
                                    <button type="button" className="ch-back" onClick={backToList} aria-label="All messages"><BackIcon /></button>
                                    <Avatar src={resolveMediaUrl(person.photo)} name={person.name} size={40} />
                                    <div className="ch-thread-who">
                                        <strong>{person.name}</strong>
                                        {person.id && <Link to={`/users/${person.id}`}>View profile</Link>}
                                    </div>
                                    {thread.messages.length > 0 && (
                                        <button type="button" className="hs-btn hs-btn--small hs-btn--ghost ch-review-btn" onClick={() => setReviewOpen(true)}>
                                            Leave a review
                                        </button>
                                    )}
                                </header>

                                {notice && <div className="hs-alert hs-alert--success ch-notice" role="status">{notice}</div>}

                                <div className="ch-messages" ref={scrollRef} aria-live="polite">
                                    {thread.loading && <p className="ch-center hs-muted">Loading…</p>}
                                    {thread.error && <div className="hs-alert hs-alert--error" role="alert">{thread.error}</div>}
                                    {!thread.loading && !thread.error && thread.messages.length === 0 && (
                                        <div className="ch-center ch-start">
                                            <Avatar src={resolveMediaUrl(person.photo)} name={person.name} size={56} />
                                            <p><strong>Say hi to {firstName}</strong></p>
                                            <p className="hs-muted">Ask about the item or place, and suggest a time to meet or view it.</p>
                                        </div>
                                    )}
                                    {groups.map(group => (
                                        <div key={group.label} className="ch-day">
                                            <p className="ch-day-label"><span>{group.label}</span></p>
                                            {group.messages.map(message => {
                                                const mine = message.sender_id === myId;
                                                return (
                                                    <div key={message.id} className={`ch-msg ${mine ? 'ch-msg--mine' : ''}`}>
                                                        <p className="ch-bubble">{message.content}</p>
                                                        <time className="ch-time" dateTime={message.sent_at}>{clock(message.sent_at)}</time>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>

                                <form className="ch-composer" onSubmit={send}>
                                    {sendError && <p className="hs-field-error ch-send-error" role="alert">{sendError}</p>}
                                    <div className="ch-composer-row">
                                        <label htmlFor="ch-input" className="ch-sr">Message to {person.name}</label>
                                        <textarea id="ch-input" ref={inputRef} rows="1" maxLength={MAX_LENGTH}
                                            placeholder={`Message ${firstName}…`}
                                            value={draft} onChange={(e) => { setDraft(e.target.value); if (sendError) setSendError(''); }}
                                            onKeyDown={onKeyDown} />
                                        <button type="submit" className="ch-send" disabled={!draft.trim() || sending} aria-label="Send">
                                            <SendIcon />
                                        </button>
                                    </div>
                                    {draft.length > MAX_LENGTH - 200 && <p className="ch-count">{draft.length} / {MAX_LENGTH}</p>}
                                </form>
                            </>
                        )}
                    </section>
                </div>
            </main>

            {reviewOpen && person && (
                <ReviewDialog person={person} onClose={() => setReviewOpen(false)}
                    onDone={(message) => { setReviewOpen(false); setNotice(message); }} />
            )}
        </div>
    );
};

export default ChatPage;

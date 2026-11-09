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
import { REQUIRED_LABELS } from '../lib/profileOptions';
import { formatEuro } from '../lib/housingOptions';
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

// Search ignores case and accents: "ziga" finds "Žiga"
const fold = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// True while the window is at least this wide (the liked listings get their own column)
function useWide(query) {
    const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const list = window.matchMedia(query);
        const onChange = () => setWide(list.matches);
        list.addEventListener('change', onChange);
        return () => list.removeEventListener('change', onChange);
    }, [query]);
    return wide;
}

const SearchIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ch-icon"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
);
const CloseIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ch-icon"><path d="M6 6l12 12M18 6 6 18" /></svg>
);
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
    const [notice, setNotice] = useState(''); // short confirmation, e.g. after a review; disappears by itself

    const [search, setSearch] = useState('');
    const [pane, setPane] = useState('chats'); // narrower screens: "Chats" or "Liked" in the left card
    const wide = useWide('(min-width: 1240px)');
    const [liked, setLiked] = useState({ items: [], loading: true, error: '' });
    const [likedBusy, setLikedBusy] = useState(null); // listing id while its chat is being opened
    const [likedProblem, setLikedProblem] = useState(null); // { id, text, missing } when a chat couldn't be opened

    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const selectedIdRef = useRef(selectedId);
    const chatsRef = useRef(chats);
    useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
    useEffect(() => { chatsRef.current = chats; }, [chats]);

    const selected = chats.find(c => c.chat_id === selectedId) || null;

    // Conversation list
    const loadChats = useCallback(async () => {
        const { ok, data } = await apiRequest('/api/messages/get_history');
        if (!ok) { setListState({ loading: false, error: data.error }); return null; }
        const list = Array.isArray(data) ? data : [];
        setChats(list);
        setListState({ loading: false, error: '' });
        return list;
    }, []);
    useEffect(() => { loadChats(); }, [listVersion, loadChats]);

    const landlord = isLandlord(user);

    // Places the student liked, so they can message the owner from here (landlords don't like places)
    useEffect(() => {
        if (!user) return undefined;
        if (landlord) { setLiked({ items: [], loading: false, error: '' }); return undefined; }
        let cancelled = false;
        apiRequest('/api/housing/listings/saved').then(({ ok, data }) => {
            if (cancelled) return;
            setLiked({ items: ok && Array.isArray(data) ? data : [], loading: false, error: ok ? '' : data.error });
        });
        return () => { cancelled = true; };
    }, [user, landlord]);

    // The confirmation after a review goes away by itself
    useEffect(() => {
        if (!notice) return undefined;
        const timer = setTimeout(() => setNotice(''), 4000);
        return () => clearTimeout(timer);
    }, [notice]);

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

    // "Message" on a liked listing: open the chat with its owner, starting one if needed.
    // Goes through housing so the rental-profile check runs, like on the listing page.
    const messageOwner = async (listing) => {
        if (!listing.owner || likedBusy) return;
        setLikedProblem(null);
        const existing = chats.find(c => c.owner_of_post_id === listing.owner.id);
        if (existing) { openChat(existing.chat_id); return; }
        setLikedBusy(listing.id);
        const { ok, data } = await apiRequest(`/api/housing/listings/${listing.id}/contact`, { method: 'POST', body: {} });
        if (!ok) {
            setLikedBusy(null);
            setLikedProblem({
                id: listing.id,
                text: data.code === 'PROFILE_INCOMPLETE' ? 'Finish your rental profile first.' : (data.error || 'Couldn’t open the chat.'),
                missing: data.code === 'PROFILE_INCOMPLETE' ? (data.missing || []) : null,
            });
            return;
        }
        await loadChats(); // the new conversation appears in the list before it opens
        setLikedBusy(null);
        setPane('chats');
        openChat(data.chat_id);
    };

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

    const query = fold(search.trim());
    const visibleChats = query ? chats.filter(c => fold(c.owner_of_post_fullname).includes(query)) : chats;
    const visibleLiked = query && !wide
        ? liked.items.filter(l => [l.title, l.city, l.owner?.fullname].some(v => fold(v).includes(query)))
        : liked.items;
    const chatWith = (ownerId) => chats.find(c => c.owner_of_post_id === ownerId);
    // With no chats AND nothing liked there's nothing to show yet
    const noChats = !listState.loading && !listState.error && chats.length === 0 && (landlord || (!liked.loading && liked.items.length === 0));
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

    // Liked listings: the right-hand column on wide screens, the "Liked" tab otherwise
    const likedList = (
        <div className="ch-liked">
            {liked.loading && <p className="ch-list-note">Loading…</p>}
            {liked.error && <div className="hs-alert hs-alert--error ch-list-note" role="alert">{liked.error}</div>}
            {!liked.loading && !liked.error && liked.items.length === 0 && (
                <div className="ch-liked-empty">
                    <p>Places you like show up here, so you can message the owner straight away.</p>
                    <Link to="/housing" className="hs-link">Browse housing</Link>
                </div>
            )}
            {!liked.loading && liked.items.length > 0 && visibleLiked.length === 0 && (
                <p className="ch-list-note">No liked places match “{search.trim()}”.</p>
            )}
            <ul>
                {visibleLiked.map(listing => {
                    const photo = resolveMediaUrl(listing.photos?.[0]?.url);
                    const existing = listing.owner && chatWith(listing.owner.id);
                    const problem = likedProblem?.id === listing.id ? likedProblem : null;
                    return (
                        <li key={listing.id} className="ch-like">
                            <Link to={`/housing/${listing.id}`} className="ch-like-photo" tabIndex={-1} aria-hidden="true">
                                {photo ? <img src={photo} alt="" loading="lazy" /> : <span />}
                            </Link>
                            <div className="ch-like-text">
                                <Link to={`/housing/${listing.id}`} className="ch-like-title">{listing.title}</Link>
                                <span className="ch-like-meta">{formatEuro(listing.rent_per_person)} / month · {listing.city}</span>
                                {listing.owner && <span className="ch-like-owner">{listing.owner.fullname}</span>}
                            </div>
                            <button
                                type="button"
                                className={`hs-btn hs-btn--small ${existing ? 'hs-btn--ghost' : ''} ch-like-btn`}
                                onClick={() => messageOwner(listing)}
                                disabled={likedBusy === listing.id || !listing.owner}
                            >
                                {likedBusy === listing.id ? 'Opening…' : existing ? 'Open chat' : 'Message'}
                            </button>
                            {problem && (
                                <p className="ch-like-problem" role="alert">
                                    {problem.text}
                                    {problem.missing?.length > 0 && <> Missing: {problem.missing.map(f => REQUIRED_LABELS[f] || f).join(', ')}.</>}
                                    {problem.missing && <> <Link to="/profile/student?next=%2Fchatpage">Complete it</Link></>}
                                </p>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );

    const showLikedColumn = wide && !landlord;
    const showLikedTab = !wide && !landlord;

    return (
        <div className="hs-shell">
            <AppNav />
            <main className={`ch-page ${selectedId ? 'is-open' : ''}`}>
                <h1 className="ch-title">Messages</h1>

                <div className={`ch-frame ${selectedId ? 'is-open' : ''} ${showLikedColumn ? 'has-liked' : ''}`}>
                    {/* ---- conversations (and, on narrower screens, liked places) ---- */}
                    <aside className="ch-card ch-list" aria-label="Conversations">
                        <div className="ch-search">
                            <SearchIcon />
                            <label htmlFor="ch-search" className="ch-sr">{pane === 'liked' && showLikedTab ? 'Search liked places' : 'Search people by name'}</label>
                            <input
                                id="ch-search"
                                type="search"
                                placeholder={pane === 'liked' && showLikedTab ? 'Search liked places' : 'Search by name'}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoComplete="off"
                            />
                        </div>

                        {showLikedTab && (
                            <div className="ch-switch" role="tablist" aria-label="Show">
                                <button type="button" role="tab" aria-selected={pane === 'chats'} className={pane === 'chats' ? 'is-active' : ''} onClick={() => setPane('chats')}>
                                    Chats
                                </button>
                                <button type="button" role="tab" aria-selected={pane === 'liked'} className={pane === 'liked' ? 'is-active' : ''} onClick={() => setPane('liked')}>
                                    Liked{liked.items.length > 0 ? ` (${liked.items.length})` : ''}
                                </button>
                            </div>
                        )}

                        {showLikedTab && pane === 'liked' ? likedList : (
                            <>
                                {listState.loading && <p className="ch-list-note">Loading…</p>}
                                {listState.error && <div className="hs-alert hs-alert--error ch-list-note" role="alert">{listState.error}</div>}
                                {!listState.loading && chats.length === 0 && !listState.error && (
                                    <p className="ch-list-note">No conversations yet. Message the owner of a place you liked to start one.</p>
                                )}
                                {query && chats.length > 0 && visibleChats.length === 0 && (
                                    <p className="ch-list-note">Nobody called “{search.trim()}”.</p>
                                )}
                                <ul className="ch-chats">
                                    {visibleChats.map(chat => {
                                        const last = chat.last_message;
                                        const isUnread = unread.has(chat.chat_id);
                                        return (
                                            <li key={chat.chat_id}>
                                                <button type="button"
                                                    className={`ch-item ${chat.chat_id === selectedId ? 'is-active' : ''} ${isUnread ? 'is-unread' : ''}`}
                                                    aria-current={chat.chat_id === selectedId ? 'true' : undefined}
                                                    onClick={() => openChat(chat.chat_id)}>
                                                    <Avatar src={resolveMediaUrl(chat.owner_of_post_photo)} name={chat.owner_of_post_fullname} size={52} />
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
                            </>
                        )}
                    </aside>

                    {/* ---- open conversation ---- */}
                    <section className="ch-card ch-thread" aria-label={person ? `Conversation with ${person.name}` : 'Conversation'}>
                        {!selectedId && (
                            <div className="ch-placeholder">
                                <p>Pick a conversation{showLikedColumn && liked.items.length ? ', or message the owner of a place you liked' : ''}.</p>
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
                                    <Avatar src={resolveMediaUrl(person.photo)} name={person.name} size={44} />
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

                                {notice && (
                                    <div className="ch-toast" role="status">
                                        <span>{notice}</span>
                                        <button type="button" onClick={() => setNotice('')} aria-label="Close"><CloseIcon /></button>
                                    </div>
                                )}

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

                    {/* ---- liked places (wide screens) ---- */}
                    {showLikedColumn && (
                        <aside className="ch-card ch-liked-col" aria-labelledby="ch-liked-title">
                            <h2 id="ch-liked-title" className="ch-card-title">
                                Liked listings
                                {liked.items.length > 0 && <span>{liked.items.length}</span>}
                            </h2>
                            {likedList}
                        </aside>
                    )}
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

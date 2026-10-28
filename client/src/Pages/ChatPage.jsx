import { useState, useEffect, useRef } from 'react';
import './ChatPage.css';
import Avatar from '../components/Avatar.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { createLogger } from '../lib/logger';

const log = createLogger('chat');
const socketLog = createLogger('socket');

function ChatPage() {

    const [profileData, setProfileData] = useState({});

    const navigate = useNavigate();

    const [selectedChat, setSelectedChat] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const messagesEndRef = useRef(null);

    // The socket listener is set up once, so it reads the latest values through refs
    const selectedChatRef = useRef(null);
    const chatListRef = useRef([]);

    const [chatList, setChatList] = useState([]);
    const [chatsVersion, setChatsVersion] = useState(0); // bump to reload the chat list
    const [searchParams] = useSearchParams();

    const handleButtonClick = () => {
        navigate('/profilePage#listing-content');
    }

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (!token) {
            log.debug('No token found, user might not be logged in');
            return;
        }

        const fetchProfileData = async () => {
            try {
                const res = await fetch('/api/users/fetch_profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!res.ok) throw new Error('Failed to fetch profile');

                const data = await res.json();

                setProfileData(data);
            } catch (err) {
                log.error('Error fetching profile:', err);
            }
        };

        fetchProfileData();
    }, []);


    useEffect(() => {
        const fetchChats = async () => {
            const token = localStorage.getItem('token');

            try {
                const respo = await fetch('/api/messages/get_history', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!respo.ok) {
                    throw new Error("failed in front to fetch");
                }

                const chats = await respo.json();

                setChatList(chats);

                // Coming from a listing's "Message" button (/chatPage?chatId=12):
                // open that chat straight away.
                const wantedId = Number(searchParams.get('chatId'));
                if (wantedId && !selectedChatRef.current) {
                    const wanted = chats.find(chat => chat.chat_id === wantedId);
                    if (wanted) setSelectedChat(wanted);
                }
            } catch (err) {
                log.error('Could not load the chat list', err);
            }
        };
        fetchChats();

    }, [chatsVersion, searchParams]);

    useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
    useEffect(() => { chatListRef.current = chatList; }, [chatList]);

    // Live chat: one socket connection while this page is open.
    // New messages from the other person arrive here without a reload.
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return undefined;

        const socket = io({ auth: { token } });

        socket.on('new_message', (message) => {
            socketLog.debug(`new message in chat ${message.chat_id}`);
            if (message.chat_id === selectedChatRef.current?.chat_id) {
                setMessages(prev => [...(Array.isArray(prev) ? prev : []), message]);
            }
            // Someone started a new chat with us: reload the list so it shows up
            if (!chatListRef.current.some(chat => chat.chat_id === message.chat_id)) {
                setChatsVersion(v => v + 1);
            }
        });

        socket.on('connect', () => socketLog.info('connected, live messages are on'));
        socket.on('disconnect', (reason) => socketLog.info(`disconnected (${reason})`));
        socket.on('connect_error', (err) => {
            socketLog.error('Live chat connection failed:', err.message);
        });
        socket.on('message_error', (payload) => socketLog.warn('Message was not sent:', payload?.error));

        return () => socket.disconnect();
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };


    const sendMessage = async (chatId) => {
        const token = localStorage.getItem('token');

        if (!newMessage.trim()) return;

        try {
            const res = await fetch(`/api/messages/send_messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    receiver_id: selectedChat.owner_of_post_id,
                    content: newMessage
                })
            });

            if (!res.ok) throw new Error('Failed to send');

            const newMessageFromBackend = await res.json();
            log.debug("Saved message from backend:", newMessageFromBackend);

            setMessages(prev => {
                const currentMessages = Array.isArray(prev) ? prev : [];
                return [...currentMessages, newMessageFromBackend];
            });

            setNewMessage('');

        } catch (err) {
            log.error('Failed to send message', err);
        }
    };

    useEffect(() => {
        if (selectedChat) {
            const fetchMessages = async () => {
                const token = localStorage.getItem('token');

                try {
                    const respo = await fetch(`/api/messages/receive_messages/${selectedChat.chat_id}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    if (!respo.ok) {
                        throw new Error("not fetching them check front");
                    }

                    const data = await respo.json();
                    setMessages(Array.isArray(data) ? data : (data.messages || []));
                } catch (err) {
                    log.error('Could not load the messages of this chat', err);
                    setMessages([]); 
                }
            };
            fetchMessages();
        } else {
            setMessages([]);
        }
    }, [selectedChat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // odime sega so reviews part

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewText, setReviewText] = useState('');
    const [reviewRating, setReviewRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);

    const handleReviewSubmit = async () => {

        const token = localStorage.getItem('token');

        if (reviewRating === 0) {
            alert('Please select a rating');
            return;
        }

        try {
            const respy = await fetch('/api/rr/submit_review', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },

                body: JSON.stringify({
                    user2_id: selectedChat.owner_of_post_id,
                    rating: reviewRating,
                    description: reviewText
                })
            });

            const result = await respy.json().catch(() => ({}));
            if (!respy.ok) {
                alert(result.error || 'Failed to submit review');
                return;
            }

            setReviewText('');
            setReviewRating(0);
            setShowReviewModal(false);
            // One review per person: sending again updates the earlier one
            alert(result.message || 'Review submitted');
        } catch (err) {
            log.error('Failed to send review', err);
            alert('Failed to submit review');
        }
    };

    const closeReviewModal = () => {
        setShowReviewModal(false);
        setReviewText('');
        setReviewRating(0);
        setHoveredStar(0);
    };

    return (
        <div className="main-container">
            <header className="header">
                <div className="header-content">
                    <div className="header-nav">
                        {/* Logo */}
                        <div className="logo-section">
                            <h1 className="logo-text" onClick={() => navigate('/')}>Student Trade</h1>
                        </div>

                        <div className="search-container">
                            <div className="search-input-wrapper">
                                <input
                                    type="text"
                                    placeholder="Search for items..."
                                    className="search-input"
                                />
                            </div>
                        </div>

                        {/* User Prof*/}
                        <div className="user-section">
                            <div className="user-profile" onClick={() => navigate('/profilepage')}>
                                <div className="user-avatar">
                                    <Avatar src={profileData.profile_picture} name={profileData.fullname} size={32} />
                                </div>
                                <span className="user-name"> {profileData.fullname || 'Loading ...'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="main-content">
                <div className="content-wrapper">
                    <aside className="sidebar">
                        <h3 className="sidebar-title">Quick Actions</h3>
                        <div className="quick-actions">
                            <button className="quick-action-btn" onClick={(handleButtonClick)}>
                                My Listings
                            </button>
                            <button className="quick-action-btn" onClick={(handleButtonClick)}>
                                My Reviews
                            </button>
                            <button className="quick-action-btn">
                                Messages
                            </button>
                            <button className="quick-action-btn" onClick={() => navigate('/housing')}>
                              Housing
                            </button>
                            <button className="quick-action-btn" onClick={logout}>
                                Log Out
                            </button>
                        </div>
                    </aside>

                    <div className="chat-sidebar">
                        <div className="chat-sidebar-header">
                            <h3 className="chat-sidebar-title">Recent Chats</h3>
                        </div>

                        {/* Chat List */}
                        <div className="chat-sidebar-list">
                            {chatList.map((chat) => (
                                <div key={chat.chat_id}
                                    className={`chat-item ${selectedChat?.chat_id === chat.chat_id ? 'active' : ''}`}
                                    onClick={() => setSelectedChat(chat)}

                                >
                                    <div className="chat-avatar">
                                        <Avatar src={chat.owner_of_post_photo} name={chat.owner_of_post_fullname} size={36} />
                                    </div>
                                    <div className="chat-info">
                                        <div className="chat-user-name">{chat.owner_of_post_fullname}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="chat-window">
                        {selectedChat ? (
                            <>
                                <div className="chat-window-header">
                                    <div className="active-user-info">
                                        <div className="chat-avatar">
                                            <Avatar src={selectedChat.owner_of_post_photo} name={selectedChat.owner_of_post_fullname} size={36} />
                                        </div>
                                        <div className="active-user-name">
                                            {selectedChat.owner_of_post_fullname}
                                            <button
                                                type="button"
                                                className="chat-profile-link"
                                                onClick={() => navigate(`/users/${selectedChat.owner_of_post_id}`)}
                                            >
                                                View profile
                                            </button>
                                        </div>
                                    </div>
                                    <div className="active-user-name">
                                        <button onClick={() => setShowReviewModal(true)}> Give Review </button>
                                    </div>
                                </div>

                                <div className="chat-messages">
                                    {messages && messages.map((message) => {
                                        // Use profileData.id to determine if message is sent or received
                                        const isSentByMe = message.sender_id === profileData.id;
                                        
                                        return (
                                            <div
                                                key={message.id || message.message_id}
                                                className={`message ${isSentByMe ? 'sent' : 'received'}`}
                                            >
                                                <div className="message-bubble">
                                                    <div className="message-content">
                                                        {message.content}
                                                    </div>
                                                    <div className="message-time">
                                                        {new Date(message.sent_at).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="chat-input-container">
                                    <div className="chat-input-wrapper">
                                        <input
                                            type="text"
                                            placeholder="Type your message..."
                                            className="chat-input"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    sendMessage(selectedChat.chat_id);
                                                }
                                            }}
                                        />
                                        <button className="send-button" onClick={() => sendMessage(selectedChat.chat_id)}>
                                            <svg className="send-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="no-chat-selected">
                                <p>Select a chat to start messaging</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {showReviewModal && (
                <div className="review-modal-overlay" onClick={closeReviewModal}>
                    <div className="review-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="review-modal-header">
                            <h3>Review for {selectedChat.owner_of_post_fullname}</h3>
                            <button className="close-btn" onClick={closeReviewModal}>&times;</button>
                        </div>

                        <div className="review-modal-body">
                            <div className="user-info">
                                <Avatar
                                    src={selectedChat.owner_of_post_photo}
                                    name={selectedChat.owner_of_post_fullname}
                                    size={48}
                                    className="review-user-avatar"
                                />
                                <span className="review-user-name">{selectedChat.owner_of_post_fullname}</span>
                            </div>

                            <div className="rating-section">
                                <label>Rating:</label>
                                <div className="star-rating">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <span
                                            key={star}
                                            className={`star ${star <= (hoveredStar || reviewRating) ? 'filled' : ''}`}
                                            onClick={() => setReviewRating(star)}
                                            onMouseEnter={() => setHoveredStar(star)}
                                            onMouseLeave={() => setHoveredStar(0)}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="review-text-section">
                                <label htmlFor="reviewText">Review:</label>
                                <textarea
                                    id="reviewText"
                                    placeholder="Write your review here..."
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    className="review-textarea"
                                    rows={4}
                                />
                            </div>
                        </div>

                        <div className="review-modal-footer">
                            <button className="cancel-btn" onClick={closeReviewModal}>
                                Cancel
                            </button>
                            <button className="submit-btn" onClick={handleReviewSubmit}>
                                Submit Review
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatPage
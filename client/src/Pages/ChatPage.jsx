import { useState, useEffect } from 'react';
import './ChatPage.css';
import { useNavigate } from 'react-router-dom';

function ChatPage() {

    const [fullName, setFullName] = useState('');
    const [profileData, setProfileData] = useState({});

    const navigate = useNavigate();

    const handleButtonClick = () => {
        navigate('/profilePage#listing-content');
    }

    useEffect(() => {

        const token = localStorage.getItem('token');

        if (!token) {
            console.log('No token found, user might not be logged in');
            return;
        }

        fetch('http://localhost:5151/api/fullname', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                setFullName(data.fullname);
            })
            .catch(err => {
                console.error('Failed to fetch user info:', err);
            });
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (!token) {
            console.log('No token found, user might not be logged in');
            return;
        }

        const fetchProfileData = async () => {
            try {
                const res = await fetch('http://localhost:5151/api/getprofile', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!res.ok) throw new Error('Failed to fetch profile');

                const data = await res.json();

                setProfileData(data);
            } catch (err) {
                console.error('Error fetching profile:', err);
            }
        };

        fetchProfileData();
    }, []);

    const [chatList, setChatList] = useState([]);

    useEffect(() => {
        const fetchChats = async () => {
            const token = localStorage.getItem('token');

            try {
                const respo = await fetch('http://localhost:5151/api/get_chat_history', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!respo.ok) {
                    throw new Error("failed in front to fetch");
                }

                const chats = await respo.json();
                setChatList(chats);
            } catch (err) {
                console.error('Error fetch chat list :', err);
            }
        };
        fetchChats();

    }, []);

    const [selectedChat, setSelectedChat] = useState(null);

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const [newMessage, setNewMessage] = useState('');

    const sendMessage = async (chatId) => {

        const token = localStorage.getItem('token');

        console.log(chatId);
        console.log(selectedChat.owner_of_post_fullname);

        try {
            const res = await fetch('http://localhost:5151/api/send_message', {
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

            console.log(res);
            if (!res.ok) throw new Error('Failed to send');

            setNewMessage('');
        } catch (err) {
            console.error('Failed to send mesgs', err);
        }
    };

    return (
        <div className="main-container">
            {/* Header */}
            <header className="header">
                <div className="header-content">
                    <div className="header-nav">
                        {/* Logo */}
                        <div className="logo-section">
                            <h1 className="logo-text" onClick={() => navigate('/')}>Student Trade</h1>
                        </div>

                        {/* Search Bar */}
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
                                    <img
                                        src={`http://localhost:5151${profileData.profile_picture}`}
                                        alt="Profile"
                                        className="profile-picture"
                                    />
                                </div>
                                <span className="user-name"> {fullName || 'Loading ...'}</span>
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
                            <button className="quick-action-btn" onClick={logout}>
                                Log Out
                            </button>
                        </div>
                    </aside>

                    <div className="chat-sidebar">
                        {/* Chat Sidebar Header */}
                        <div className="chat-sidebar-header">
                            <h3 className="chat-sidebar-title">Recent Chats</h3>
                        </div>

                        {/* Chat List */}
                        <div className="chat-sidebar-list">
                            {chatList.map((chat) => (
                                <div key={chat.id}
                                    className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                                    onClick={() => setSelectedChat(chat)}
                                >
                                    <div className="chat-avatar">
                                        <img src={`http://localhost:5151${chat.owner_of_post_photo}`} alt="User Avatar" className="avatar-img" />
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
                                <div className="active-chat-user">
                                    <div className="active-user-info">
                                        <div className="active-user-name">{selectedChat.owner_of_post_fullname}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="chat-messages">
                                {/* fetch & render messages using selectedChat.chat_id */}
                            </div>

                            <div className="chat-input-container">
                                <div className="chat-input-wrapper">
                                    <input
                                        type="text"
                                        placeholder="Type your message..."
                                        className="chat-input"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                    <button className="send-button" onClick={() => sendMessage(selectedChat.id)}>
                                        <svg className="send-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="no-chat-selected">
                            <p>Select a chat to begin messaging.</p>
                        </div>
                    )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default ChatPage
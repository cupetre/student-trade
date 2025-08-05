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

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/login');
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
                            <div className="chat-item active">
                                <div className="chat-avatar">
                                    <img src="/api/placeholder/36/36" alt="User Avatar" className="avatar-img" />
                                    <div className="online-dot"></div>
                                </div>
                                <div className="chat-info">
                                    <div className="chat-user-name">Sarah Johnson</div>
                                </div>
                            </div>

                            <div className="chat-item">
                                <div className="chat-avatar">
                                    <img src="/api/placeholder/36/36" alt="User Avatar" className="avatar-img" />
                                </div>
                                <div className="chat-info">
                                    <div className="chat-user-name">Mike Chen</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active Chat Window */}
                    <div className="chat-window">
                        <div className="chat-window-header">
                            <div className="active-chat-user">
                                <img src="/api/placeholder/40/40" alt="User Avatar" className="active-avatar" />
                                <div className="active-user-info">
                                    <div className="active-user-name">Sarah Johnson</div>
                                </div>
                            </div>
                        </div>

                        <div className="chat-messages">
                            <div className="message received">
                                <div className="message-bubble">
                                    <div className="message-content">
                                        Hey! I saw your listing for the Chemistry textbook. Is it still available?
                                    </div>
                                    <div className="message-time">10:30 AM</div>
                                </div>
                            </div>
                        </div>

                        <div className="chat-input-container">
                            <div className="chat-input-wrapper">
                                <input
                                    type="text"
                                    placeholder="Type your message..."
                                    className="chat-input"
                                />
                                <button className="send-button">
                                    <svg className="send-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

export default ChatPage
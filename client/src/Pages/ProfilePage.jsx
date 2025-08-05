import React, { useEffect, useState } from 'react';
import './ProfilePage.css';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [profileData, setProfileData] = useState({
        fullname: '',
        email: '',
        bio: '',
        created_at: '',
        profilePicture: null,
        profilePicturePreview: null
    });

    const [originalProfileData, setOriginalProfileData] = useState(null);

    const token = localStorage.getItem('token');

    const userListings = [
        { id: 1, title: "Calculus Textbook", price: "$45", image: "📚", category: "Textbooks", status: "Active", views: 24 },
        { id: 2, title: "Programming Books", price: "$60", image: "💻", category: "Textbooks", status: "Active", views: 18 },
        { id: 3, title: "Study Lamp", price: "$25", image: "💡", category: "Furniture", status: "Sold", views: 31 },
        { id: 4, title: "Wireless Mouse", price: "$30", image: "🖱️", category: "Electronics", status: "Active", views: 12 }
    ];

    const userReviews = [
        { id: 1, rating: 5, text: "Great seller, item was exactly as described and fast shipping!", date: "2024-07-28" },
        { id: 2, rating: 4, text: "Quick to respond and the product was in good condition. Would recommend.", date: "2024-07-25" },
        { id: 3, rating: 5, text: "Excellent communication and a smooth transaction. Couldn't be happier!", date: "2024-07-20" },
    ];

    useEffect(() => {
        const fetchProfileData = async () => {

            try {
                const response = await fetch(`http://localhost:5151/api/get_profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error("failed to fetch the prof data");

                const data = await response.json();

                const fetchedData = {
                    fullname: data.fullname,
                    email: data.email,
                    bio: data.bio,
                    created_at: data.created_at,
                    profilePicturePreview: data.profile_picture
                        ? `http://localhost:5151${data.profile_picture}`
                        : null,
                };

                setProfileData(fetchedData);
                setOriginalProfileData(fetchedData);
            } catch (err) {
                console.error('Failed to load profile data: ', err);
            }
        };

        fetchProfileData();

    }, []);


    const handleSave = async () => {

        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();

            formData.append('fullname', profileData.fullname);
            formData.append('email', profileData.email);
            formData.append('bio', profileData.bio);

            if (profileData.profilePicture) {
                formData.append('profilePicture', profileData.profilePicture);
            }

            const response = await fetch('http://localhost:5151/api/profile', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to save and change');
            }

            const result = await response.json();
            console.log("profiled has been updated scsly", result);
            setIsEditing(false);
        } catch (error) {
            console.error("something went wrong");
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setProfileData(prev => ({
                    ...prev,
                    profilePicture: file,
                    profilePicturePreview: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const renderStarRating = (rating) => {
        const stars = [];
        for (let i = 0; i < 5; i++) {
            stars.push(
                <span key={i} className={`star-icon ${i < rating ? 'filled' : ''}`}>
                    ★
                </span>
            );
        }
        return <div className="star-rating">{stars}</div>;
    };

    const handleCancel = () => {
        // Reset any unsaved changes by restoring the original data
        if (originalProfileData) {
            setProfileData(originalProfileData);
        }
        // Exit editing mode
        setIsEditing(false);
    };

    return (
        <div className="profile-page">
            {/* Header */}
            <header className="profile-header">
                <div className="profile-header-content">
                    <h1 className="profile-page-title">My Profile</h1>
                    <button className="settings-btn" onClick={() => navigate('/')}>
                        <span>Back</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="profile-main">
                <div className="profile-container">

                    {/* Profile Info Section */}
                    <div className="profile-info-card">
                        <div className="profile-info-header">
                            <h2 className="profile-section-title">Profile Information</h2>
                            {!isEditing ? (
                                <button className="edit-btn" onClick={() => setIsEditing(true)}>
                                    <span>Edit Profile</span>
                                </button>
                            ) : (
                                <div className="edit-buttons">
                                    <button className="cancel-edit-btn" onClick={handleCancel}>
                                        <span>Cancel</span>
                                    </button>
                                    <button className="save-btn" onClick={handleSave}>
                                        <span>Save</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="profile-info-content">
                            {/* Profile Picture */}
                            <div className="profile-picture-section">
                                <div className="profile-picture-container">
                                    {profileData.profilePicturePreview ? (
                                        <img src={profileData.profilePicturePreview} alt="Profile" className="profile-picture" />
                                    ) : (
                                        <div className="profile-picture-placeholder">
                                        </div>
                                    )}
                                </div>
                                {isEditing && (
                                    <div className="profile-picture-upload">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="picture-input"
                                            id="profile-picture-upload"
                                        />
                                        <label htmlFor="profile-picture-upload" className="picture-upload-label">
                                            Change Photo
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Profile Details */}
                            <div className="profile-details">
                                <div className="profile-field">
                                    <label className="profile-label">Full Name</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="fullname"
                                            value={profileData.fullname}
                                            onChange={handleInputChange}
                                            className="profile-input"
                                        />
                                    ) : (
                                        <p className="profile-value">{profileData.fullname}</p>
                                    )}
                                </div>

                                <div className="profile-field">
                                    <label className="profile-label">Email Address</label>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            name="email"
                                            value={profileData.email}
                                            onChange={handleInputChange}
                                            className="profile-input"
                                        />
                                    ) : (
                                        <div className="profile-value-with-icon">
                                            <p className="profile-value">{profileData.email}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="profile-field">
                                    <label className="profile-label">Bio</label>
                                    {isEditing ? (
                                        <textarea
                                            name="bio"
                                            value={profileData.bio}
                                            onChange={handleInputChange}
                                            className="profile-textarea"
                                            rows="3"
                                        />
                                    ) : (
                                        <p className="profile-value bio-text">{profileData.bio}</p>
                                    )}
                                </div>

                                <div className="profile-field">
                                    <label className="profile-label">Member Since</label>
                                    <p className="profile-value bio-text">{profileData.created_at}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="reviews-section">
                        <div className="reviews-header">
                            <h2 className="reviews-section-title">Recent Reviews</h2>
                        </div>
                        <div className="user-reviews-grid">
                            {userReviews.map((review) => (
                                <div key={review.id} className="review-card">
                                    {renderStarRating(review.rating)}
                                    <p className="review-text">{review.text}</p>
                                    <div className="review-meta">
                                        <span className="review-date">{review.date}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="listings-section">
                        <div className="listings-header">
                            <h2 className="listings-section-title">My Listings</h2>
                            <div className="listings-stats">
                                <span className="listings-count">{userListings.length} items</span>
                                <span className="listings-active">{userListings.filter(item => item.status === 'Active').length} active</span>
                            </div>
                        </div>

                        <div className="user-listings-grid">
                            {userListings.map((listing) => (
                                <div key={listing.id} className="user-listing-card">
                                    <div className="listing-status-badge">
                                        <span className={`status-indicator ${listing.status.toLowerCase()}`}>
                                            {listing.status}
                                        </span>
                                    </div>

                                    <div className="user-listing-image">{listing.image}</div>
                                    <h3 className="user-listing-title">{listing.title}</h3>

                                    <div className="user-listing-details">
                                        <span className="user-listing-price">{listing.price}</span>
                                        <span className="user-listing-category">{listing.category}</span>
                                    </div>

                                    <div className="listing-stats">
                                        <span className="listing-views">{listing.views} views</span>
                                    </div>

                                    <div className="listing-actions">
                                        <button className="listing-action-btn edit">Edit</button>
                                        <button className="listing-action-btn delete">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;
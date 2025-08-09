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

    const [itemListings2, setItemListings2] = useState([]);

    useEffect(() => {
        const fetchMyListings = async () => {

            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No token found');
                return;
            }
            try {
                const resp = await fetch(`http://localhost:5151/api/showmylistings`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                });

                if (!resp.ok) throw new Error("failed to fetch the prof data");

                const data = await resp.json();
                setItemListings2(data);
            } catch (err) {
                console.error('Failed to fetch listings', err);
            }
        };
        fetchMyListings();
    }, []);

    useEffect(() => {
        const fetchProfileData = async () => {
            const token = localStorage.getItem('token');

            try {
                const response = await fetch(`http://localhost:5151/api/getprofile`, {
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

    const handleCancel = () => {
        if (originalProfileData) {
            setProfileData(originalProfileData);
        }
        setIsEditing(false);
    };

    // reviews sections

    const [userReviews, setUserReviews] = useState([]);

    useEffect(() => {
        const showReviews = async () => {

            const token = localStorage.getItem('token');

            try {

                const response = await fetch('http://localhost:5151/api/get_reviews', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }

                });

                if (!response.ok) {
                    throw new Error("Failed to fetch reviews");
                }

                const newData = await response.json();

                const dataForAssigning = newData.map((review) => ({
                    id: review.id,
                    rating: review.rating,
                    text: review.description,
                    date: new Date(review.created_at).toLocaleDateString(),
                }));

                setUserReviews(dataForAssigning);
            } catch (err) {
                console.error("not working in front end", err);
            }
        };

        showReviews();
    }, []);

    const renderStarRating = (rating) => {
        return (
            <div className="star-rating">
                {'⭐'.repeat(rating)}
                {'☆'.repeat(5 - rating)}
            </div>
        );
    };

    // lets edit/delete listings here

    const [selectedListing, setSelectedListing] = useState(null);
    const [isListingModalOpen, setIsListingModalOpen] = useState(false);

    const [editFormData, setEditFormData] = useState({
        id: '',
        title: '',
        description: '',
        price: '',
        photo: null,
        photoPreview: ''
    });

    const openListingModal = (listing) => {

        setEditFormData({
            id: listing.id,
            title: listing.title,
            description: listing.description,
            price: listing.price,
            photo: null,
            photoPreview: `http://localhost:5151/${listing.photo}`
        });

        setSelectedListing(listing);
        setIsListingModalOpen(true);
    };

    const closeListingModal = () => {
        setIsListingModalOpen(false);
        setSelectedListing(null);

        setEditFormData({
            id: '',
            title: '',
            description: '',
            price: '',
            photo: null,
            currentPhoto: ''
        })
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');

        const newAddedForm = new FormData();

        newAddedForm.append('id', editFormData.id);
        newAddedForm.append('title', editFormData.title);
        newAddedForm.append('description', editFormData.description);
        newAddedForm.append('price', editFormData.price);

        if (editFormData.photo) {
            newAddedForm.append('photo', editFormData.photo);
        }

        console.log(newAddedForm);

        try {
            const resp = await fetch('http://localhost:5151/api/edit_listing', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                },

                body: newAddedForm,

            });

            if (!resp.ok) {
                throw new Error(`HTTP error! status: ${resp.status}`);
            }

            const result = await resp.json();
            console.log("listing has been updated scsly", result);
            closeListingModal();

        } catch (err) {
            console.error("problem in fetching and frontend", err);
        }
    };

    const handleFormChange = (e) => {
        const { name, value, files } = e.target;

        if (name === 'photo' && files && files.length > 0) {
            const file = files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                setEditFormData(prevData => ({
                    ...prevData,
                    photo: file,
                    photoPreview: event.target.result 
                }));
            };
            reader.readAsDataURL(file);
        } else {
            setEditFormData(prevData => ({
                ...prevData,
                [name]: value
            }));
        }
    };

    return (
        <div className="profile-page">
            <header className="profile-header">
                <div className="profile-header-content">
                    <h1 className="profile-page-title">My Profile</h1>
                    <button className="settings-btn" onClick={() => navigate('/')}>
                        <span>Back</span>
                    </button>
                </div>
            </header>

            <main className="profile-main">
                <div className="profile-container">

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
                        </div>

                        <div className="listings-grid">
                            {itemListings2.map((listing) => (
                                <div key={listing.id} className="listing-card">
                                    <div className="listing-info">
                                        <h3 className="listing-title">{listing.title}</h3>
                                        <div className="listing-details">
                                            <span className="listing-price">{listing.price}</span>
                                        </div>
                                        <span className="listing-date">
                                            {new Date(listing.date).toLocaleDateString()}
                                        </span>
                                        <div className="listing-actions">
                                            <button
                                                className="listing-action-btn edit"
                                                onClick={() => openListingModal(listing)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="listing-action-btn delete"
                                                onClick={() => handleDelete(listing.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    <div className="listing-image">
                                        <img
                                            src={`http://localhost:5151/${listing.photo}`}
                                            alt={listing.title}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {isListingModalOpen && selectedListing && (
                <div className="edit-modal-overlay" onClick={closeListingModal}>
                    <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="edit-modal-close" onClick={closeListingModal}>&times;</button>
                        <h2>Edit Listing</h2>
                        <form onSubmit={handleFormSubmit} className="edit-form">
                            <div className="form-group">
                                <label htmlFor="title">Title</label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={editFormData.title}
                                    onChange={handleFormChange}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={editFormData.description}
                                    onChange={handleFormChange}
                                    rows="4"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="price">Price</label>
                                <input
                                    type="number"
                                    id="price"
                                    name="price"
                                    value={editFormData.price}
                                    onChange={handleFormChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Current Image</label>
                                {editFormData.photoPreview && (
                                    <img
                                        src={editFormData.photoPreview}
                                        alt="Listing preview"
                                        className="edit-current-image"
                                    />
                                )}
                                <label htmlFor="photo" className="file-input-label">
                                    Choose a new image (optional)
                                </label>
                                <input
                                    type="file"
                                    id="photo"
                                    name="photo"
                                    onChange={handleFormChange}
                                />
                            </div>
                            <button type="submit" className="edit-submit-btn">Save Changes</button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ProfilePage;
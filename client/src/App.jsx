import { useState, useEffect } from 'react';
import './App.css';
import Avatar from './components/Avatar.jsx';
import { useNavigate } from 'react-router-dom';
import { createLogger } from './lib/logger';

const log = createLogger('marketplace');

function App() {

  const navigate = useNavigate();

  const [profileData, setProfileData] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    photo: null,
    photoPreview: null,
  });

  const [itemListings, setItemListings] = useState([]);

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

        // The marketplace is for students; landlords only use housing
        if (data.role === 'landlord') {
          navigate('/housing/mine', { replace: true });
          return;
        }

        setProfileData(data);
      } catch (err) {
        log.error('Error fetching profile:', err);
      }
    };

    fetchProfileData();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        photo: file,
        photoPreview: URL.createObjectURL(file),
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');

    if (!token) {
      log.warn('No login token found');
    }

    const formDataToSend = new FormData();

    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('price', formData.price);
    if (formData.photo) {
      formDataToSend.append('photo', formData.photo);
    }

    log.debug('Form submitted:', formData);

    try {
      const response = await fetch(`/api/listings/upload_listing`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('Failed to upload to db ');
      }

      const result = await response.json();

      if (!response.ok) {
        log.error('Saving the listing failed: no OK response from the server');
      }

      log.debug(result.message);
      setIsModalOpen(false);
    } catch (err) {
      log.error('Could not save the listing', err);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      title: '',
      description: '',
      price: '',
      photo: null,
      photoPreview: null
    });
  };

  const handleButtonClick = () => {
    navigate('/profilePage#listing-content');
  };

  useEffect(() => {
    const fetchListings = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch('/api/listings/show_Listings', {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        const data = await response.json();
        setItemListings(data);
      } catch (err) {
        log.error('Failed to fetch listings', err);
      }
    };

    fetchListings();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  //modals for the listings view

  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

  const openListingModal = (listing) => {
    setSelectedListing(listing);
    setIsListingModalOpen(true);
  }

  const closeListingModal = () => {
    setIsListingModalOpen(false);
  }

  const handleMessageButton = async () => {

    const token = localStorage.getItem('token');

    try {
      const receiverId = selectedListing.owner_id;
      log.debug('Opening chat with user', receiverId);

      const resp = await fetch('/api/messages/create_chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user2_id: receiverId }),
      });
      if (!resp.ok) {
        throw new Error('Failed to create or get the damn chat');
      }
      const data = await resp.json();

      const chatId = data.chat_id;
      navigate(`/chatPage?chatId=${chatId}`);
    } catch (err) {
      log.error('Could not open the chat', err);
    }
  };

  // report submitting part

  const [reportReason, setReportReason] = useState("");
  const [customReportReason, setCustomReportReason] = useState("");

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const openReportModal = () => {
    setIsListingModalOpen(false);
    setIsReportModalOpen(true);
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
  };

  const handleReportSubmit = async () => {

    const token = localStorage.getItem('token');
    const reasonToSend = reportReason === "Other" ? customReportReason : reportReason;

    try {
      await fetch('/api/rr/submit_report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reported_id: selectedListing.owner_id,
          item_id: selectedListing.id,
          description: reasonToSend,
        }),

      });

      closeReportModal(true);
      setIsListingModalOpen(true);
    } catch (err) {
      log.error('Could not submit the report', err);
    }
  };

  return (
    <div className="main-container">
      <header className="header">
        <div className="header-content">
          <div className="header-nav">
            {/* Logo */}
            <div className="logo-section">
              <h1 className="logo-text">Student Trade</h1>
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

            <div className="user-section">
              <button className="post-item-btn" onClick={() => setIsModalOpen(true)}>
                <span>Post Item</span>
              </button>
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
              <button className="quick-action-btn" onClick={() => navigate('/chatPage')}>
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

          <div className="listings-container">
            <div className="listings-grid">
              {itemListings.map((listing) => (
                <div key={listing.id} className="listing-card" onClick={() => openListingModal(listing)}>
                  <div className="listing-info">
                    <h3 className="listing-title">{listing.title}</h3>
                    <div className="listing-details">
                      <span className="listing-price">{listing.price}$</span>
                    </div>
                    <p className="listing-seller">Seller: {listing.owner_name}</p>
                    <span className="listing-date">
                      {new Date(listing.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="listing-image">
                    <img
                      src={`${listing.photo}`}
                      alt={listing.title}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Post New Item</h3>
              <button className="modal-close-btn" onClick={closeModal}>
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter item name..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="form-textarea"
                  placeholder="Describe your item..."
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Price</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Add Picture</label>
                <div className="image-upload-container">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="image-input"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="image-upload-label">
                    {formData.photoPreview ? (
                      <img src={formData.photoPreview} alt="Preview" className="image-preview" />
                    ) : (
                      <div className="upload-placeholder">
                        <span className="upload-text">Click to upload image</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="form-buttons">
                <button type="button" className="cancel-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Post Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isListingModalOpen && selectedListing && (
        <div className="modal2-overlay" onClick={closeListingModal}>
          <div className="modal2-content" onClick={(e) => e.stopPropagation()}>
            <button className="close2-button" onClick={closeListingModal}>&times;</button>

            <div className="modal2-grid-container">
              <div className="listing2-details-column">
                <h2>{selectedListing.title}</h2>
                <p className="listing2-description">
                  <strong>Description:</strong> {selectedListing.description}
                </p>
                <p>
                  <strong>Price:</strong> ${selectedListing.price}
                </p>
                <p>
                  <strong>Date Posted:</strong> {selectedListing.date}
                </p>
                <div className="2seller-info">
                  <Avatar
                    src={selectedListing.owner_profile_picture}
                    name={selectedListing.owner_name}
                    size={40}
                    className="seller2-profile-pic"
                  />
                  <p>
                    <strong>Seller:</strong> {selectedListing.owner_name}
                  </p>
                </div>
              </div>

              <div className="listing2-photo-column">
                <img
                  src={`${selectedListing.photo}`}
                  className="modal2-image"
                />
              </div>
            </div>

            <div className="modal2-actions">
              <button className="message2-button" onClick={handleMessageButton}>Message</button>
              <button className="report2-button" onClick={openReportModal}>Report</button>
            </div>
          </div>
        </div>
      )}

      {isReportModalOpen && (
        <div className="report-modal-overlay" onClick={closeReportModal}>
          <div className="report-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Report Listing</h2>

            {["Scam", "Inappropriate", "Spam", "Misleading", "Other"].map((reason) => (
              <label key={reason}>
                <input
                  type="radio"
                  name="reportReason"
                  value={reason}
                  onChange={(e) => setReportReason(e.target.value)}
                />
                {reason}
              </label>
            ))}

            {reportReason === "Other" && (
              <textarea
                placeholder="Describe the issue..."
                value={customReportReason}
                onChange={(e) => setCustomReportReason(e.target.value)}
              />
            )}

            <div className="report-modal-actions">
              <button className="report-submit-btn" onClick={handleReportSubmit}>
                Submit
              </button>
              <button className="report-cancel-btn" onClick={closeReportModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App

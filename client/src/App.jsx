import { useState, useEffect } from 'react';
import './App.css';
import { useNavigate } from 'react-router-dom';

function App() {

  const [fullName, setFullName] = useState('');
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
    const fetchProfileData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5151/api/getProfile', {
          headers: {
            Authorization: `Bearer ${token}`,
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
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({
          ...prev,
          photo: file,
          photoPreview: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    const formDataToSend = new FormData();

    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('price', formData.price);
    if (formData.photo) {
      formDataToSend.append('photo', formData.photo);
    }

    console.log('Form submitted:', formData);

    try {
      const response = await fetch(`http://localhost:5151/api/listings`, {
        method: 'POST' ,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('Failed to upload to db ' );
      }

      const result = await response.json();
      console.log(result.message);
      setIsModalOpen(false);
    } catch (err) {
      console.error("error in uploading to db listing", err);
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

  const listings = [
    { id: 1, title: "Calculus Textbook", price: "$45", seller: "Sarah M.", image: "📚", category: "Textbooks" },
    { id: 2, title: "Gaming Chair", price: "$120", seller: "Mike R.", image: "🪑", category: "Furniture" },
    { id: 3, title: "iPhone Charger", price: "$15", seller: "Alex K.", image: "🔌", category: "Electronics" },
    { id: 4, title: "Chemistry Lab Kit", price: "$80", seller: "Emma L.", image: "🧪", category: "Lab Equipment" },
    { id: 5, title: "Mini Fridge", price: "$200", seller: "Tom H.", image: "❄️", category: "Appliances" },
    { id: 6, title: "Study Lamp", price: "$25", seller: "Lisa P.", image: "💡", category: "Furniture" },
    { id: 7, title: "Programming Books", price: "$60", seller: "David C.", image: "💻", category: "Textbooks" },
    { id: 8, title: "Yoga Mat", price: "$20", seller: "Nina S.", image: "🧘", category: "Sports" },
    { id: 9, title: "Wireless Mouse", price: "$30", seller: "Jake W.", image: "🖱️", category: "Electronics" }
  ];

  return (
    <div className="main-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-nav">
            {/* Logo */}
            <div className="logo-section">
              <h1 className="logo-text">Student Trade</h1>
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
              <button className="post-item-btn" onClick={() => setIsModalOpen(true)}>
                <span>Post Item</span>
              </button>
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
              <button className="quick-action-btn">
                Log Out
              </button>
            </div>
          </aside>

          <div className="listings-container">
            <div className="listings-grid">
              {listings.map((listing) => (
                <div key={listing.id} className="listing-card">
                  <div className="listing-image">{listing.image}</div>
                  <h3 className="listing-title">{listing.title}</h3>
                  <div className="listing-details">
                    <span className="listing-price">{listing.price}</span>
                    <span className="listing-category">{listing.category}</span>
                  </div>
                  <p className="listing-seller">Seller: {listing.seller}</p>
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
              {/* Item Name */}
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

              {/* Description */}
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

              {/* Price */}
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

              {/* Image Upload */}
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

              {/* Form Buttons */}
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
    </div>
  );
}

export default App

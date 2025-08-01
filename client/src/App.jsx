import { useState, useEffect } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

function App() {

  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();

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
              <button className="post-item-btn">
                <span>Post Item</span>
              </button>
              <div className="user-profile" onClick={() => navigate('/profilepage')}>
                <div className="user-avatar">
                </div>
                <span className="user-name"> {fullName || 'Loading ...'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {/* Sidebar */}
          <aside className="sidebar">
            <h3 className="sidebar-title">Quick Actions</h3>
            <div className="quick-actions">
              <button className="quick-action-btn">
                📚 My Listings
              </button>
              <button className="quick-action-btn">
                ❤️ Saved Items
              </button>
              <button className="quick-action-btn">
                💬 Messages
              </button>
              <button className="quick-action-btn">
                ⚙️ Settings
              </button>
            </div>
            
            <div className="categories-section">
              <h4 className="categories-title">Categories</h4>
              <div className="categories-list">
                <div className="category-item">📖 Textbooks</div>
                <div className="category-item">💻 Electronics</div>
                <div className="category-item">🪑 Furniture</div>
                <div className="category-item">🧪 Lab Equipment</div>
                <div className="category-item">🏠 Appliances</div>
                <div className="category-item">⚽ Sports</div>
              </div>
            </div>
          </aside>

          {/* Main Listings Area */}
          <div className="listings-container">
            <div className="listings-header">
              <h2 className="listings-title">Latest Listings</h2>
              <div className="filter-buttons">
                <button className="filter-btn active">All</button>
                <button className="filter-btn inactive">Textbooks</button>
                <button className="filter-btn inactive">Electronics</button>
                <button className="filter-btn inactive">Furniture</button>
              </div>
            </div>
            
            {/* Listings Grid - 2 columns */}
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
    </div>
  );
}

export default App

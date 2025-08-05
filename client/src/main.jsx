import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Login from './Pages/LoginPage.jsx';
import Register from './Pages/RegisterPage.jsx';
import Profile from './Pages/ProfilePage.jsx';
import ChatPage from './Pages/ChatPage.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profilepage" element={<Profile />} />
      <Route path="/chatpage" element={<ChatPage />} />
    </Routes>
  </BrowserRouter>
);
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Login from './Pages/LoginPage.jsx';
import Register from './Pages/RegisterPage.jsx';
import Profile from './Pages/ProfilePage.jsx';
import ChatPage from './Pages/ChatPage.jsx';
import VerifyPendingPage from './Pages/VerifyPendingPage.jsx';
import VerifyEmailPage from './Pages/VerifyEmailPage.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-pending" element={<VerifyPendingPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/profilepage" element={<Profile />} />
      <Route path="/chatpage" element={<ChatPage />} />
    </Routes>
  </BrowserRouter>
);
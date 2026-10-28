import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Login from './Pages/LoginPage.jsx';
import Register from './Pages/RegisterPage.jsx';
import Profile from './Pages/ProfilePage.jsx';
import ChatPage from './Pages/ChatPage.jsx';
import VerifyPendingPage from './Pages/VerifyPendingPage.jsx';
import VerifyEmailPage from './Pages/VerifyEmailPage.jsx';
import LandingPage from './Pages/LandingPage.jsx';
import LandlordRegisterPage from './Pages/LandlordRegisterPage.jsx';
import HousingListPage from './Pages/housing/HousingListPage.jsx';
import HousingDetailPage from './Pages/housing/HousingDetailPage.jsx';
import HousingFormPage from './Pages/housing/HousingFormPage.jsx';
import MyHousingPage from './Pages/housing/MyHousingPage.jsx';
import MyStaysPage from './Pages/housing/MyStaysPage.jsx';
import StudentProfilePage from './Pages/profile/StudentProfilePage.jsx';
import PublicProfilePage from './Pages/profile/PublicProfilePage.jsx';
import { RequireAuth, PublicOnly, HomeSwitch } from './components/RouteGuards.jsx';
import { installFetchWrapper } from './lib/auth';
import { appLog } from './lib/logger';
import ErrorBoundary from './components/ErrorBoundary.jsx';

installFetchWrapper();

// Errors that happen outside React (event handlers, timers, forgotten promises)
window.addEventListener('error', (event) => {
    appLog.error('Uncaught error:', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
    appLog.error('Unhandled promise rejection:', event.reason);
});

// Errors inside React components: logged with the component that failed
const root = ReactDOM.createRoot(document.getElementById('root'), {
  onCaughtError: (error, info) => appLog.error('Page crashed (caught by ErrorBoundary):', error, info.componentStack),
  onUncaughtError: (error, info) => appLog.error('Uncaught React error:', error, info.componentStack),
  onRecoverableError: (error) => appLog.warn('React recovered from an error:', error),
});

root.render(
  <BrowserRouter>
    <ErrorBoundary>
    <Routes>
      {/* Start page: the marketplace when logged in, the landing page otherwise */}
      <Route path="/" element={<HomeSwitch app={<App />} landing={<LandingPage />} />} />

      {/* The rest of the app: only for logged-in users, everyone else goes to /login */}
      <Route path="/profilepage" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/chatpage" element={<RequireAuth><ChatPage /></RequireAuth>} />

      {/* Housing */}
      <Route path="/housing" element={<RequireAuth><HousingListPage mode="browse" key="browse" /></RequireAuth>} />
      <Route path="/housing/saved" element={<RequireAuth><HousingListPage mode="saved" key="saved" /></RequireAuth>} />
      <Route path="/housing/mine" element={<RequireAuth><MyHousingPage /></RequireAuth>} />
      <Route path="/housing/stays" element={<RequireAuth><MyStaysPage /></RequireAuth>} />
      <Route path="/housing/new" element={<RequireAuth><HousingFormPage key="new" /></RequireAuth>} />
      <Route path="/housing/:id" element={<RequireAuth><HousingDetailPage /></RequireAuth>} />
      <Route path="/housing/:id/edit" element={<RequireAuth><HousingFormPage key="edit" /></RequireAuth>} />

      {/* Profiles */}
      <Route path="/profile/student" element={<RequireAuth><StudentProfilePage /></RequireAuth>} />
      <Route path="/users/:id" element={<RequireAuth><PublicProfilePage /></RequireAuth>} />

      {/* Login and register: logged-in users are sent to the app instead */}
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/register/landlord" element={<PublicOnly><LandlordRegisterPage /></PublicOnly>} />

      {/* Email confirmation works either way */}
      <Route path="/verify-pending" element={<VerifyPendingPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Any unknown address goes to the start */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  </BrowserRouter>
);

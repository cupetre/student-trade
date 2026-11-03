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
import ForgotPasswordPage from './Pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './Pages/ResetPasswordPage.jsx';
import HousingListPage from './Pages/housing/HousingListPage.jsx';
import HousingDetailPage from './Pages/housing/HousingDetailPage.jsx';
import HousingFormPage from './Pages/housing/HousingFormPage.jsx';
import MyHousingPage from './Pages/housing/MyHousingPage.jsx';
import MyStaysPage from './Pages/housing/MyStaysPage.jsx';
import MarketDetailPage from './Pages/marketplace/MarketDetailPage.jsx';
import MarketFormPage from './Pages/marketplace/MarketFormPage.jsx';
import MyItemsPage from './Pages/marketplace/MyItemsPage.jsx';
import StudentProfilePage from './Pages/profile/StudentProfilePage.jsx';
import PublicProfilePage from './Pages/profile/PublicProfilePage.jsx';
import SettleInPage from './Pages/SettleInPage.jsx';
import { RequireAuth, PublicOnly, HomeSwitch, StudentOnly } from './components/RouteGuards.jsx';
import { installFetchWrapper } from './lib/auth';
import { appLog } from './lib/logger';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import PageSlide from './components/PageSlide.jsx';
import RouteTitle from './components/RouteTitle.jsx';

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

// Where each page sits in the visitor's journey; PageSlide uses it to pick the slide direction
const STEP = { landing: 0, login: 1, register: 2, landlordRegister: 3, confirm: 4, app: 10 };
const slide = (step, page) => <PageSlide step={step}>{page}</PageSlide>;

root.render(
  <BrowserRouter>
    <ErrorBoundary>
    <RouteTitle />
    <Routes>
      {/* Start page: the landing page for visitors; logged-in users go to their platform */}
      <Route path="/" element={<HomeSwitch landing={slide(STEP.landing, <LandingPage />)} />} />

      {/* Student platforms: landlords are sent to their housing listings instead */}
      <Route path="/marketplace" element={<RequireAuth><StudentOnly>{slide(STEP.app, <App />)}</StudentOnly></RequireAuth>} />
      <Route path="/marketplace/new" element={<RequireAuth><StudentOnly>{slide(STEP.app, <MarketFormPage key="new" />)}</StudentOnly></RequireAuth>} />
      <Route path="/marketplace/mine" element={<RequireAuth><StudentOnly>{slide(STEP.app, <MyItemsPage />)}</StudentOnly></RequireAuth>} />
      <Route path="/marketplace/:id" element={<RequireAuth><StudentOnly>{slide(STEP.app, <MarketDetailPage />)}</StudentOnly></RequireAuth>} />
      <Route path="/marketplace/:id/edit" element={<RequireAuth><StudentOnly>{slide(STEP.app, <MarketFormPage key="edit" />)}</StudentOnly></RequireAuth>} />
      <Route path="/settle-in" element={<RequireAuth><StudentOnly>{slide(STEP.app, <SettleInPage />)}</StudentOnly></RequireAuth>} />

      {/* The rest of the app: only for logged-in users, everyone else goes to /login */}
      <Route path="/profilepage" element={<RequireAuth>{slide(STEP.app, <Profile />)}</RequireAuth>} />
      <Route path="/chatpage" element={<RequireAuth>{slide(STEP.app, <ChatPage />)}</RequireAuth>} />

      {/* Housing */}
      <Route path="/housing" element={<RequireAuth>{slide(STEP.app, <HousingListPage mode="browse" key="browse" />)}</RequireAuth>} />
      <Route path="/housing/saved" element={<RequireAuth><StudentOnly>{slide(STEP.app, <HousingListPage mode="saved" key="saved" />)}</StudentOnly></RequireAuth>} />
      <Route path="/housing/mine" element={<RequireAuth>{slide(STEP.app, <MyHousingPage />)}</RequireAuth>} />
      <Route path="/housing/stays" element={<RequireAuth><StudentOnly>{slide(STEP.app, <MyStaysPage />)}</StudentOnly></RequireAuth>} />
      <Route path="/housing/new" element={<RequireAuth>{slide(STEP.app, <HousingFormPage key="new" />)}</RequireAuth>} />
      <Route path="/housing/:id" element={<RequireAuth>{slide(STEP.app, <HousingDetailPage />)}</RequireAuth>} />
      <Route path="/housing/:id/edit" element={<RequireAuth>{slide(STEP.app, <HousingFormPage key="edit" />)}</RequireAuth>} />

      {/* Profiles */}
      <Route path="/profile/student" element={<RequireAuth><StudentOnly>{slide(STEP.app, <StudentProfilePage />)}</StudentOnly></RequireAuth>} />
      <Route path="/users/:id" element={<RequireAuth>{slide(STEP.app, <PublicProfilePage />)}</RequireAuth>} />

      {/* Login and register: logged-in users are sent to the app instead */}
      <Route path="/login" element={<PublicOnly>{slide(STEP.login, <Login />)}</PublicOnly>} />
      <Route path="/register" element={<PublicOnly>{slide(STEP.register, <Register />)}</PublicOnly>} />
      <Route path="/register/landlord" element={<PublicOnly>{slide(STEP.landlordRegister, <LandlordRegisterPage />)}</PublicOnly>} />

      {/* Email confirmation works either way */}
      <Route path="/verify-pending" element={slide(STEP.confirm, <VerifyPendingPage />)} />
      <Route path="/verify-email" element={slide(STEP.confirm, <VerifyEmailPage />)} />
      {/* Forgot password: ask for a link, then set a new password from the email */}
      <Route path="/forgot-password" element={<PublicOnly>{slide(STEP.login, <ForgotPasswordPage />)}</PublicOnly>} />
      <Route path="/reset-password" element={slide(STEP.confirm, <ResetPasswordPage />)} />

      {/* Any unknown address goes to the start */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  </BrowserRouter>
);

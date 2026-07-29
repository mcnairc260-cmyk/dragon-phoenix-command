import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { MarketingLayout } from './components/MarketingLayout';
import { ToastViewport } from './components/Toast';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import OpportunityDetailPage from './pages/OpportunityDetailPage';
import SavedPage from './pages/SavedPage';
import PricingPage from './pages/PricingPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/opportunities/:slug" element={<OpportunityDetailPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <ToastViewport />
    </>
  );
}

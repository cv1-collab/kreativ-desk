import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Finance from './components/Finance';
import BIMViewer from './components/BIMViewer';
import MeetChat from './components/MeetChat';
import Calendar from './components/Calendar';
import CRM from './components/CRM';
import Whiteboard from './components/Whiteboard';
import PitchDeck from './components/PitchDeck';
import Defects from './components/Defects';
import API from './components/API';
import Documents from './components/Documents';
import SiteMonitoring from './components/SiteMonitoring';
import Login from './components/Login';
import Signup from './components/Signup';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import CompanyDashboard from './components/CompanyDashboard';
import ProjectTeam from './components/ProjectTeam';
import AdminDashboard from './components/AdminDashboard';
import AIConcierge from './components/AIConcierge';
import HelpCenter from './components/HelpCenter';
import DashboardWrapper from './components/DashboardWrapper';
import PricingPage from './components/PricingPage';
import LandingPage from './components/LandingPage';
import DemoApp from './components/DemoApp';
import PrivacyPolicy from './components/PrivacyPolicy';
import Imprint from './components/Imprint';
import Settings from './components/Settings';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ProjectProvider>
            <BrowserRouter>
              <AIConcierge />
              <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/imprint" element={<Imprint />} />
            
            {/* Super Admin Level */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />

            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Company Level */}
            <Route path="/app" element={
              <PrivateRoute>
                <DashboardWrapper>
                  <CompanyDashboard />
                </DashboardWrapper>
              </PrivateRoute>
            } />

            {/* Help Center */}
            <Route path="/help" element={
              <PrivateRoute>
                <DashboardWrapper>
                  <HelpCenter />
                </DashboardWrapper>
              </PrivateRoute>
            } />

            {/* Settings */}
            <Route path="/settings" element={
              <PrivateRoute>
                <DashboardWrapper>
                  <Settings />
                </DashboardWrapper>
              </PrivateRoute>
            } />

            {/* Project Level */}
            <Route path="/project/:projectId" element={
              <PrivateRoute>
                <DashboardWrapper>
                  <Layout />
                </DashboardWrapper>
              </PrivateRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="team" element={<ProjectTeam />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="finance" element={<Finance />} />
              <Route path="bim" element={<BIMViewer />} />
              <Route path="meet" element={<MeetChat />} />
              <Route path="crm" element={<CRM />} />
              <Route path="whiteboard" element={<Whiteboard />} />
              <Route path="pitch" element={<PitchDeck />} />
              <Route path="defects" element={<Defects />} />
              <Route path="api" element={<API />} />
              <Route path="documents" element={<Documents />} />
              <Route path="site" element={<SiteMonitoring />} />
            </Route>
            </Routes>
            </BrowserRouter>
          </ProjectProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

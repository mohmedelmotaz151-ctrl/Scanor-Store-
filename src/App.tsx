import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import TrackOrder from "./pages/TrackOrder";
import Admin from "./pages/Admin";
import DownloadPage from "./pages/Download";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Navbar from "./components/Navbar";
import FloatingChat from "./components/FloatingChat";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { LanguageProvider } from "./context/LanguageContext";
import Login from "./pages/Login";
import Welcome from "./pages/Welcome";
import SplashScreen from './components/SplashScreen';

function AppContent() {
  const { loading, user } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [loading]);

  if (showSplash) return <SplashScreen />;

  return (
    <div key="app-root" className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-amber-500/30">
      {!user && window.location.pathname === '/' ? null : <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={user ? <Home /> : <Welcome />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
        </Routes>
      </main>
      {user || window.location.pathname !== '/' ? (
        <>
          <FloatingChat />
          <footer className="border-t border-neutral-800 py-12 mt-20 bg-black">
            <div className="max-w-7xl mx-auto px-6 text-center text-neutral-500 text-sm">
              <p>© 2026 Scanor STORE. All rights reserved.</p>
              <p className="mt-2 text-xs">متجر سكانور المعتمد لشحن شدات ببجي موبايل بشكل آمن وسريع</p>
              <div className="mt-4 flex items-center justify-center gap-6">
                <a href="/privacy" className="hover:text-amber-500 transition-colors">Privacy Policy</a>
                <a href="/track" className="hover:text-amber-500 transition-colors">Track Order</a>
              </div>
            </div>
          </footer>
        </>
      ) : null}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </CurrencyProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

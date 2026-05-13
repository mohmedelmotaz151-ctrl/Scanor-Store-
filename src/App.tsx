import React from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { FloatingChat } from './components/FloatingChat';
import { Home } from './pages/Home';
import { TrackOrder } from './pages/TrackOrder';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { Download } from './pages/Download';
import { Terms } from './pages/Terms';
import { Link } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
      <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-amber-500/30">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/track" element={<TrackOrder />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/download" element={<Download />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </main>
        <FloatingChat />
        
        <footer className="border-t border-neutral-800 py-12 mt-20 bg-black">
          <div className="max-w-7xl mx-auto px-6 text-center text-neutral-500 text-sm">
            <div className="flex justify-center gap-6 mb-6">
              <Link to="/terms" className="hover:text-amber-500 transition-colors">الشروط والأحكام</Link>
              <Link to="/track" className="hover:text-amber-500 transition-colors">تتبع الطلب</Link>
              <Link to="/download" className="hover:text-amber-500 transition-colors">تحميل التطبيق</Link>
            </div>
            <p>© 2026 Scanor STORE. All rights reserved.</p>
            <p className="mt-2">متجر سكانور المعتمد لشحن شدات ببجي موبايل بشكل آمن وسريع</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

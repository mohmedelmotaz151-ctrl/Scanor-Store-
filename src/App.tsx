import React from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { FloatingChat } from './components/FloatingChat';
import { Home } from './pages/Home';
import { TrackOrder } from './pages/TrackOrder';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { Download } from './pages/Download';

function App() {
  return (
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
          </Routes>
        </main>
        <FloatingChat />
        
        <footer className="border-t border-neutral-800 py-12 mt-20 bg-black">
          <div className="max-w-7xl mx-auto px-6 text-center text-neutral-500 text-sm">
            <p>© 2026 Scanor STORE. All rights reserved.</p>
            <p className="mt-2">متجر سكانور المعتمد لشحن شدات ببجي موبايل بشكل آمن وسريع</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;

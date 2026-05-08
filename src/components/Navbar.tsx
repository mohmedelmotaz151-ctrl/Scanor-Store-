import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gamepad2, Search, User, ShieldCheck, Download } from "lucide-react";
import { motion } from "motion/react";

export default function Navbar() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(true); // Don't hide immediately to allow multiple attempts if needed, or hide if you wish
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <nav className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Gamepad2 className="text-black w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white uppercase italic">Scanor<span className="text-amber-500">STORE</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-neutral-400 hover:text-amber-500 transition-colors">الرئيسية</Link>
          <a href="/#packages" className="text-sm font-medium text-neutral-400 hover:text-amber-500 transition-colors">باقات الشحن</a>
          <Link to="/track" className="text-sm font-medium text-neutral-400 hover:text-amber-500 transition-colors">تتبع الطلب</Link>
          <Link to="/admin" className="text-sm font-medium text-neutral-400 hover:text-amber-500 transition-colors border-l border-neutral-800 pl-8 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            لوحة الإدارة
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {showInstallBtn && (
            <Link 
              to="/download"
              className="hidden sm:flex items-center gap-2 bg-amber-500/10 text-amber-500 px-4 py-2 rounded-full border border-amber-500/20 text-xs font-black uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-all"
            >
              <Download className="w-4 h-4" />
              تحميل التطبيق
            </Link>
          )}
          <button className="p-2 text-neutral-400 hover:text-white transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800 text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            <User className="w-4 h-4" />
            Sign In
          </motion.button>
        </div>
      </div>
    </nav>
  );
}

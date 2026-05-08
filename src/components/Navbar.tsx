import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Gamepad2, Search, User, ShieldCheck, Download, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && userSnap.data().isAdmin) {
            setIsAdmin(true);
          }
        } catch (e) { console.error(e); }
      } else {
        setIsAdmin(false);
      }
    }
    checkAdmin();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Gamepad2 className="text-black w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white uppercase italic notranslate" translate="no">Scanor<span className="text-amber-500 font-sans">STORE</span></span>
        </Link>

        {/* ... (keep existing desktop links) */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-neutral-400 hover:text-amber-500 transition-colors">الرئيسية</Link>
          <a href="/#packages" className="text-sm font-medium text-neutral-400 hover:text-amber-500 transition-colors">باقات الشحن</a>
          <Link to="/track" className="text-sm font-medium text-neutral-400 hover:text-amber-500 transition-colors">تتبع الطلب</Link>
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium text-neutral-400 hover:text-amber-500 transition-colors border-l border-neutral-800 pl-8 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              لوحة الإدارة
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          
          <div className="relative">
            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-neutral-900 px-3 py-2 rounded-full border border-neutral-800 hover:bg-neutral-800 transition-colors"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-amber-500" />
                    </div>
                  )}
                  <span className="text-xs font-medium max-w-[80px] truncate">
                    {user.displayName || user.email?.split('@')[0] || user.phoneNumber}
                  </span>
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden z-50 px-2 py-2"
                    >
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/5 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        تسجيل الخروج
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800 text-sm font-medium hover:bg-neutral-800 transition-colors"
                >
                  <User className="w-4 h-4" />
                  دخول
                </motion.button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

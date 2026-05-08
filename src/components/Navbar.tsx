import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Gamepad2, 
  User, 
  ShieldCheck, 
  Menu, 
  X, 
  Languages, 
  Wallet,
  Bell,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useCurrency } from "../context/CurrencyContext";
import UserDrawer from "./UserDrawer";

export default function Navbar() {
  const { user, profile, isGuest } = useAuth();
  const { language, setLanguage, t, dir } = useLanguage();
  const { formatPrice } = useCurrency();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Don't show navbar on welcome page if not logged in and not guest
  if (!user && !isGuest && location.pathname === '/') return null;

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <nav className="sticky top-0 z-50 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-900/50" dir={dir}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.05 }}
              className="w-11 h-11 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20"
            >
              <Gamepad2 className="text-black w-6 h-6" />
            </motion.div>
            <span className="text-xl sm:text-2xl font-black text-white uppercase italic notranslate hidden xsm:block" translate="no">
              Scanor<span className="text-amber-500 font-sans">STORE</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            <Link to="/" className={`text-sm font-bold transition-colors ${location.pathname === '/' ? 'text-amber-500' : 'text-neutral-500 hover:text-white'}`}>{t('home')}</Link>
            <Link to="/track" className={`text-sm font-bold transition-colors ${location.pathname === '/track' ? 'text-amber-500' : 'text-neutral-500 hover:text-white'}`}>{t('track_order')}</Link>
            {profile?.isAdmin && (
              <Link to="/admin" className="text-sm font-bold text-neutral-500 hover:text-white transition-colors border-l border-neutral-800 pl-8 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                {t('admin_panel')}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleLanguage}
              className="w-10 h-10 rounded-xl bg-neutral-900/50 border border-neutral-800/50 flex items-center justify-center text-neutral-400 hover:text-amber-500 hover:bg-neutral-800 transition-all"
              title={language === 'ar' ? 'English' : 'العربية'}
            >
              <Languages className="w-5 h-5" />
            </button>
            
            <button className="hidden sm:flex w-10 h-10 rounded-xl bg-neutral-900/50 border border-neutral-800/50 items-center justify-center text-neutral-400 hover:text-amber-500 hover:bg-neutral-800 transition-all">
              <Bell className="w-5 h-5" />
            </button>
          </div>
          
          <div className="h-8 w-[1px] bg-neutral-800 mx-1 hidden sm:block" />
          
          {user ? (
             <div className="flex items-center gap-3">
               <button 
                 onClick={() => setIsDrawerOpen(true)}
                 className="flex items-center gap-3 p-1.5 sm:pe-4 bg-neutral-900 border border-neutral-800 rounded-2xl hover:bg-neutral-800/80 transition-all group"
               >
                 <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 flex items-center justify-center overflow-hidden shadow-lg shadow-amber-500/10">
                   {profile?.photoURL ? (
                     <img src={profile.photoURL} alt="User" className="w-full h-full object-cover" />
                   ) : (
                     <User className="w-5 h-5 text-black" />
                   )}
                 </div>
                 <div className={`hidden sm:flex flex-col ${language === 'ar' ? 'items-end' : 'items-start'}`}>
                   <span className="text-xs font-black text-white leading-tight">
                     {profile?.username || profile?.displayName || user.email?.split('@')[0]}
                   </span>
                   <div className="flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] text-amber-500 font-bold tracking-tight">
                      {formatPrice(profile?.balance || 0)}
                    </span>
                   </div>
                 </div>
               </button>
             </div>
          ) : (
            <Link to="/login">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 bg-amber-500 px-6 py-2.5 rounded-2xl text-black text-sm font-black shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all"
              >
                <User className="w-4 h-4" />
                {t('login_btn')}
              </motion.button>
            </Link>
          )}

          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden w-10 h-10 rounded-xl bg-neutral-900/50 border border-neutral-800/50 flex items-center justify-center text-neutral-400 hover:text-white transition-all active:scale-90"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <UserDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden border-t border-neutral-900 bg-neutral-950 px-4 py-8 space-y-6"
          >
            <div className={`grid grid-cols-2 gap-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              <Link 
                to="/" 
                onClick={() => setIsOpen(false)} 
                className={`p-4 rounded-2xl flex flex-col gap-2 ${location.pathname === '/' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-neutral-900 border border-neutral-800'}`}
              >
                <span className={`text-lg font-bold ${location.pathname === '/' ? 'text-amber-500' : 'text-neutral-400'}`}>{t('home') || 'Home'}</span>
              </Link>
              <Link 
                to="/track" 
                onClick={() => setIsOpen(false)} 
                className={`p-4 rounded-2xl flex flex-col gap-2 ${location.pathname === '/track' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-neutral-900 border border-neutral-800'}`}
              >
                <span className={`text-lg font-bold ${location.pathname === '/track' ? 'text-amber-500' : 'text-neutral-400'}`}>{t('track_order') || 'Order Tracking'}</span>
              </Link>
            </div>

            <div className="pt-6 border-t border-neutral-900 flex flex-col gap-4">
              <button 
                onClick={() => { toggleLanguage(); setIsOpen(false); }}
                className={`flex items-center justify-between w-full h-14 px-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm font-black text-neutral-400 ${language === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}
              >
                <span>{language === 'ar' ? 'ENGLISH VERSION' : 'نسخة اللغة العربية'}</span>
                <Languages className="w-5 h-5 text-amber-500" />
              </button>

              {!user && (
                <Link to="/login" onClick={() => setIsOpen(false)} className="block">
                  <button className="w-full h-15 rounded-2xl bg-amber-500 text-black font-black text-lg shadow-xl shadow-amber-500/10">
                    {t('login_btn')}
                  </button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

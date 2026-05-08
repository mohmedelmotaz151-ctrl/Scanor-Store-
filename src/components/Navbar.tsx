import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Gamepad2, 
  User, 
  ShieldCheck, 
  Menu, 
  X, 
  Languages, 
  Wallet
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useCurrency } from "../context/CurrencyContext";
import UserDrawer from "./UserDrawer";

export default function Navbar() {
  const { user, profile } = useAuth();
  const { language, setLanguage, t, dir } = useLanguage();
  const { formatPrice } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <nav className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800" dir={dir}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Gamepad2 className="text-black w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white uppercase italic notranslate" translate="no">Scanor<span className="text-amber-500 font-sans">STORE</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">{t('home')}</Link>
            <Link to="/track" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">{t('track_order')}</Link>
            {profile?.isAdmin && (
              <Link to="/admin" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors border-l border-neutral-800 pl-8 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                {t('admin_panel')}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={toggleLanguage}
              className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            >
              <Languages className="w-5 h-5" />
            </button>
            
            {user ? (
               <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setIsDrawerOpen(true)}
                   className="flex items-center gap-3 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-full transition-all group"
                 >
                   <div className={`flex flex-col ${language === 'ar' ? 'items-end' : 'items-start'}`}>
                     <span className="text-[10px] font-bold text-white leading-tight">
                       {profile?.username || profile?.displayName || user.email?.split('@')[0]}
                     </span>
                     <span className="text-[10px] text-amber-500 font-black">
                       {formatPrice(profile?.balance || 0)}
                     </span>
                   </div>
                   <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center overflow-hidden">
                     {profile?.photoURL ? (
                       <img src={profile.photoURL} alt="User" className="w-full h-full object-cover" />
                     ) : (
                       <User className="w-4 h-4 text-amber-500" />
                     )}
                   </div>
                 </button>
               </div>
            ) : (
              <Link to="/login">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 bg-neutral-900 px-6 py-2.5 rounded-full border border-neutral-800 text-sm font-black hover:bg-neutral-800 transition-colors"
                >
                  <User className="w-4 h-4" />
                  {t('login_btn')}
                </motion.button>
              </Link>
            )}
          </div>

          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400"
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-neutral-900 bg-neutral-950 px-6 py-8 space-y-6 overflow-hidden"
          >
            <div className={`flex flex-col gap-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              <Link to="/" onClick={() => setIsOpen(false)} className="text-lg font-bold text-neutral-400 hover:text-white transition-colors">{t('home')}</Link>
              <Link to="/track" onClick={() => setIsOpen(false)} className="text-lg font-bold text-neutral-400 hover:text-white transition-colors">{t('track_order')}</Link>
              {profile?.isAdmin && (
                <Link to="/admin" onClick={() => setIsOpen(false)} className="text-lg font-bold text-amber-500">{t('admin_panel')}</Link>
              )}
            </div>

            <div className="pt-6 border-t border-neutral-900 flex flex-col gap-4">
              <button 
                onClick={() => { toggleLanguage(); setIsOpen(false); }}
                className={`flex items-center justify-between w-full h-14 px-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm font-bold text-neutral-400 ${language === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}
              >
                <span>{language === 'ar' ? 'English' : 'العربية'}</span>
                <Languages className="w-5 h-5" />
              </button>

              {user ? (
                 <button 
                   onClick={() => { setIsDrawerOpen(true); setIsOpen(false); }}
                   className={`flex items-center justify-between w-full h-14 px-6 rounded-2xl bg-amber-500 text-black text-sm font-black ${language === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}
                 >
                   <span>{t('wallet')} ({formatPrice(profile?.balance || 0)})</span>
                   <Wallet className="w-5 h-5" />
                 </button>
              ) : (
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <button className="w-full h-14 rounded-2xl bg-amber-500 text-black font-black text-lg">
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

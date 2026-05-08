import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, ArrowRight, UserCircle, ShieldCheck, Zap } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

const Welcome: React.FC = () => {
  const { t, language } = useLanguage();
  const { continueAsGuest } = useAuth();
  const navigate = useNavigate();

  const features = [
    { icon: <Zap className="w-5 h-5 text-amber-500" />, text: language === 'ar' ? "شحن فوري" : "Instant Top-up" },
    { icon: <ShieldCheck className="w-5 h-5 text-green-500" />, text: language === 'ar' ? "دفع آمن" : "Secure Payment" },
    { icon: <Gamepad2 className="w-5 h-5 text-blue-500" />, text: language === 'ar' ? "+100 لعبة" : "+100 Games" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-between p-6 pb-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full" />

      {/* Top Section - Logo */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mt-12 flex flex-col items-center text-center"
      >
        <div id="welcome-logo" className="w-24 h-24 bg-gradient-to-br from-amber-500 to-amber-600 rounded-[28px] flex items-center justify-center shadow-2xl shadow-amber-500/20 mb-6 group">
          <Gamepad2 className="w-12 h-12 text-black transition-transform duration-500 group-hover:scale-110" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Scanor Store</h1>
        <div className="h-1 w-12 bg-amber-500 rounded-full mx-auto" />
      </motion.div>

      {/* Middle Section - Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full my-8">
        <motion.h2 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl md:text-3xl font-bold text-white text-center mb-4 leading-tight"
        >
          {t('welcome_title')}
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-neutral-400 text-center text-base mb-10 px-4"
        >
          {t('welcome_subtitle')}
        </motion.p>

        {/* Feature Icons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-4 w-full mb-8"
        >
          {features.map((feature, i) => (
            <div key={i} className="flex flex-col items-center bg-neutral-900/50 border border-neutral-800/50 p-4 rounded-2xl">
              <div className="mb-2 p-2 bg-neutral-800 rounded-xl">
                {feature.icon}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold text-center">
                {feature.text}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-4">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={() => navigate("/login")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full h-16 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:bg-neutral-100 transition-all text-lg group"
        >
          {t('get_started_btn')}
          <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${language === 'ar' ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={() => {
            continueAsGuest();
            navigate("/");
          }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full h-16 bg-neutral-900 border border-neutral-800 text-neutral-300 font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all"
        >
          <UserCircle className="w-5 h-5" />
          {t('continue_guest')}
        </motion.button>
      </div>
    </div>
  );
};

export default Welcome;

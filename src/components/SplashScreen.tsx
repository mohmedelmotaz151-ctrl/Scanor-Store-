import React from 'react';
import { motion } from 'motion/react';
import { Gamepad2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function SplashScreen() {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-neutral-950 z-[999] flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Animated Blobs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1],
          rotate: [0, 90, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute w-[150%] h-[150%] bg-gradient-to-tr from-amber-500/10 via-transparent to-blue-500/10 blur-[100px] rounded-full pointer-events-none"
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.8,
          ease: [0, 0.71, 0.2, 1.01],
          scale: {
            type: "spring",
            damping: 15,
            stiffness: 100,
          }
        }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_60px_rgba(245,158,11,0.4)] relative z-10">
          <Gamepad2 className="w-12 h-12 text-black" />
        </div>
        
        {/* Animated Rings */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -inset-4 border-2 border-amber-500/20 rounded-[3rem]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          className="absolute -inset-8 border border-amber-500/10 rounded-[3.5rem]" 
        />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center relative z-10"
      >
        <h1 className="text-5xl font-black text-white tracking-tighter mb-3 uppercase italic">
          Scanor<span className="text-amber-500 font-sans not-italic">STORE</span>
        </h1>
        <div className="flex items-center justify-center gap-4">
          <div className="h-[1px] w-8 bg-neutral-800" />
          <p className="text-amber-500 font-black text-[11px] uppercase tracking-[0.5em] whitespace-nowrap">
            {t('splash_tagline')}
          </p>
          <div className="h-[1px] w-8 bg-neutral-800" />
        </div>
      </motion.div>

      <div className="absolute bottom-16 flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{ 
              duration: 1, 
              repeat: Infinity, 
              delay: i * 0.2 
            }}
            className="w-1.5 h-1.5 bg-amber-500 rounded-full"
          />
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 text-[10px] text-neutral-500 font-bold tracking-widest uppercase"
      >
        Initializing Secure Connection...
      </motion.p>
    </div>
  );
}

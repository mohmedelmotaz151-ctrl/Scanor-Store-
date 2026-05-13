import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  LogIn,
  User
} from 'lucide-react';
import { signInWithGoogle, loginGuest } from '../lib/firebase';

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError('فشل تسجيل الدخول عبر جوجل. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginGuest();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/admin-restricted-operation') {
        setError('تسجيل دخول الزوار معطل حالياً. يرجى استخدام جوجل.');
      } else {
        setError('فشل تسجيل الدخول كزائر.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-neutral-950">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative text-right"
          dir="rtl"
        >
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 blur-[80px] rounded-full"></div>
          
          <div className="text-center mb-8 relative z-10">
            <h1 className="text-3xl font-black mb-2 tracking-tight">تسجيل الدخول</h1>
            <p className="text-neutral-500 text-sm">مرحباً بك في سكانور ستور</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl mb-6 flex items-center gap-3 text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4 relative z-10">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              تسجيل الدخول عبر جوجل
            </button>

            <button 
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full bg-neutral-800 text-white py-4 rounded-2xl font-black text-lg hover:bg-neutral-700 transition-all flex items-center justify-center gap-3 border border-neutral-700 shadow-xl disabled:opacity-50"
            >
              <User className="w-5 h-5 text-amber-500" />
              الدخول كزائر
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-neutral-800/50 text-center relative z-10 text-neutral-500 text-xs">
            بإكمال تسجيل الدخول، أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بمتجر سكانور.
          </div>
        </motion.div>
      </div>
    </div>
  );
};

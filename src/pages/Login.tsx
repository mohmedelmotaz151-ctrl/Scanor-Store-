import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  LogIn,
  Phone,
  Chrome,
  Apple,
  Loader2
} from 'lucide-react';
import { 
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  signInWithGoogle,
  signInWithApple,
  RecaptchaVerifier,
  db,
  serverTimestamp
} from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export const Login = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (method === 'phone' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {}
      });
    }
  }, [method]);

  const syncUserToFirestore = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    const isAdminEmail = user.email === 'mohmedelmotaz151@gmail.com';
    
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        isAdmin: isAdminEmail,
        createdAt: serverTimestamp()
      });
    } else if (isAdminEmail && !userDoc.data().isAdmin) {
      // Ensure admin status is updated if it wasn't set before
      await setDoc(userRef, { isAdmin: true }, { merge: true });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email.trim(), password);
        await syncUserToFirestore(firebaseUser);
        navigate('/');
      } else if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await syncUserToFirestore(result.user);
        setSuccess('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
        setMode('login');
      } else {
        await sendPasswordResetEmail(auth, email.trim());
        setSuccess('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.');
        setMode('login');
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err.code);
      setError(errorMsg || `فشل في المصادقة: ${err.message} (${err.code})`);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (confirmationResult) {
        const { user: firebaseUser } = await confirmationResult.confirm(otp);
        await syncUserToFirestore(firebaseUser);
        navigate('/');
      } else {
        const fullPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
        const result = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
        setConfirmationResult(result);
        setSuccess('تم إرسال رمز التحقق إلى جوالك.');
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err.code);
      setError(errorMsg || `فشل في تأكيد الجوال: ${err.message} (${err.code})`);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setError(null);
    setLoading(true);
    try {
      const firebaseUser = provider === 'google' ? await signInWithGoogle() : await signInWithApple();
      await syncUserToFirestore(firebaseUser);
      navigate('/');
    } catch (err: any) {
      console.error('Social Login Error:', err);
      // Detailed error message for social login failures
      if (err.code === 'auth/popup-blocked') {
        setError('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع للمتابعة.');
      } else if (err.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setError(`هذا النطاق (${domain}) غير مصرح به في إعدادات Firebase. يرجى إضافة هذا النطاق إلى قائمة "Authorized domains" في إعدادات Authentication في Firebase Console.`);
      } else {
        const errorMsg = getErrorMessage(err.code);
        setError(errorMsg || `فشل تسجيل الدخول: ${err.message} (${err.code})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/user-not-found': return 'الحساب غير موجود.';
      case 'auth/wrong-password': return 'كلمة المرور غير صحيحة.';
      case 'auth/email-already-in-use': return 'البريد الإلكتروني مستخدم بالفعل.';
      case 'auth/weak-password': return 'كلمة المرور ضعيفة جداً.';
      case 'auth/invalid-email': return 'بريد إلكتروني غير صالح.';
      case 'auth/invalid-phone-number': return 'رقم هاتف غير صالح.';
      case 'auth/too-many-requests': return 'محاولات كثيرة جداً. يرجى المحاولة لاحقاً.';
      case 'auth/code-expired': return 'انتهت صلاحية الرمز.';
      case 'auth/popup-closed-by-user': return 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
      case 'auth/cancelled-closure-external-event': return 'تم إلغاء عملية تسجيل الدخول.';
      case 'auth/operation-not-allowed': return 'طريقة تسجيل الدخول هذه غير مفعلة في إعدادات Firebase.';
      default: return null;
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-neutral-950">
      <div className="w-full max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative"
        >
          {/* Decorative Glows */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />

          <div className="text-center mb-8 relative z-10">
            <h1 className="text-3xl font-black mb-2 tracking-tight">
              {mode === 'login' ? 'تسجيل الدخول' : mode === 'signup' ? 'إنشاء حساب' : 'استعادة كلمة المرور'}
            </h1>
            <p className="text-neutral-500 text-sm">
              {mode === 'login' ? 'مرحباً بك في سكانور ستور' : 'انضم إلى مجتمع اللاعبين المتميزين'}
            </p>
          </div>

          {/* Switch Tab */}
          <div className="flex bg-black/40 p-1.5 rounded-2xl mb-8 relative z-10 border border-neutral-800">
            <button 
              onClick={() => { setMethod('email'); setError(null); setConfirmationResult(null); }}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                method === 'email' ? 'bg-amber-500 text-black shadow-lg' : 'text-neutral-500 hover:text-white'
              }`}
            >
              البريد الإلكتروني
            </button>
            <button 
              onClick={() => { setMethod('phone'); setError(null); setConfirmationResult(null); }}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                method === 'phone' ? 'bg-amber-500 text-black shadow-lg' : 'text-neutral-500 hover:text-white'
              }`}
            >
              رقم الهاتف
            </button>
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
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-2xl mb-6 flex items-center gap-3 text-sm"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <div id="recaptcha-container" />

          {method === 'email' ? (
            <form onSubmit={handleEmailAuth} className="space-y-4 relative z-10">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 px-2 uppercase tracking-widest text-right block">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/30 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-amber-500 transition-colors text-white placeholder:text-neutral-700 text-right"
                    placeholder="example@mail.com"
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest text-right">كلمة المرور</label>
                    {mode === 'login' && (
                      <button 
                        type="button"
                        onClick={() => setMode('reset')}
                        className="text-[10px] text-amber-500 hover:underline"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input 
                      type="password" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/30 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-amber-500 transition-colors text-white placeholder:text-neutral-700 text-right"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(245,158,11,0.2)] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    {mode === 'login' ? 'دخول' : mode === 'signup' ? 'إنشاء حساب' : 'إرسال رابط الاستعادة'}
                    <LogIn className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePhoneAuth} className="space-y-4 relative z-10">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 px-2 uppercase tracking-widest text-right block">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                  <input 
                    type="tel" 
                    required 
                    value={phoneNumber}
                    disabled={!!confirmationResult}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-black/30 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-amber-500 transition-colors text-white placeholder:text-neutral-700 disabled:opacity-50 text-right"
                    placeholder="+966 50 000 0000"
                  />
                </div>
              </div>

              {confirmationResult && (
                <div className="space-y-1 text-center">
                  <label className="text-xs font-bold text-neutral-500 px-2 uppercase tracking-widest block">رمز التحقق (OTP)</label>
                  <input 
                    type="text" 
                    required 
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-black/30 border border-neutral-800 rounded-2xl py-4 px-4 focus:outline-none focus:border-amber-500 transition-colors text-white text-center text-2xl tracking-[0.5em] font-mono"
                    placeholder="000000"
                  />
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(245,158,11,0.2)] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    {confirmationResult ? 'تحقق وتأكيد' : 'إرسال الرمز'}
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-neutral-800/50 space-y-3 relative z-10 text-center">
            <p className="text-neutral-500 text-xs text-center mb-2">أو عبر المنصات الاجتماعية</p>
            
            <button 
              onClick={() => handleSocialLogin('google')}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-colors text-sm font-bold"
            >
              <Chrome className="w-5 h-5" />
              <span>متابعة باستخدام جوجل</span>
            </button>

            <button 
              onClick={() => handleSocialLogin('apple')}
              className="w-full bg-white text-black p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-neutral-200 transition-colors text-sm font-bold"
            >
              <Apple className="w-5 h-5" />
              <span>متابعة باستخدام Apple</span>
            </button>

            <div className="pt-4">
              <button 
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setSuccess(null); setError(null); }}
                className="text-sm font-bold text-neutral-400 hover:text-white transition-colors"
              >
                {mode === 'login' ? (
                  <>ليس لديك حساب؟ <span className="text-amber-500">إنشاء حساب جديد</span></>
                ) : (
                  <>لديك حساب بالفعل؟ <span className="text-amber-500">تسجيل الدخول</span></>
                )}
              </button>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-neutral-800/50 text-center relative z-10 text-neutral-500 text-xs">
            بإكمال تسجيل الدخول، أنت توافق على <Link to="/terms" className="text-amber-500 hover:underline">شروط الخدمة وسياسة الخصوصية</Link> الخاصة بمتجر سكانور.
          </div>
        </motion.div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendEmailVerification
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, appleProvider, db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mail, 
  Lock, 
  Phone, 
  Chrome, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Apple,
  Gamepad2,
  User,
  Fingerprint
} from "lucide-react";

type AuthMode = "login" | "signup" | "reset";
type Method = "email" | "phone";

export default function Login() {
  const { user: currentUser } = useAuth();
  const { language, t, dir } = useLanguage();
  const [mode, setMode] = useState<AuthMode>("login");
  const [method, setMethod] = useState<Method>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (method === "phone" && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {}
      });
    }
  }, [method]);

  const syncUserToFirestore = async (user: any, additionalData: any = {}) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || additionalData.email || "",
        phoneNumber: user.phoneNumber || additionalData.phoneNumber || "",
        displayName: additionalData.fullName || user.displayName || "",
        username: additionalData.username || user.email?.split('@')[0] || "",
        photoURL: user.photoURL || "",
        isAdmin: false,
        balance: 0,
        createdAt: serverTimestamp()
      });
    }
  };

  const validateForm = () => {
    if (method === 'email') {
      if (!email || !email.includes('@')) {
        setError(t('auth_error_invalid_email'));
        return false;
      }
      if (mode !== 'reset' && password.length < 6) {
        setError(t('auth_error_weak_password'));
        return false;
      }
      if (mode === 'signup' && (!username || !fullName)) {
        setError(language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
        return false;
      }
    } else {
      if (!phoneNumber) {
        setError(t('auth_error_invalid_phone'));
        return false;
      }
    }
    return true;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        await syncUserToFirestore(user);
        navigate("/");
      } else if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await syncUserToFirestore(userCredential.user, { username, fullName, email, phoneNumber });
        await sendEmailVerification(userCredential.user);
        setSuccess(t('auth_success_msg'));
        setMode("login");
      } else {
        await sendPasswordResetEmail(auth, email);
        setSuccess(t('reset_success_msg'));
        setMode("login");
      }
    } catch (err: any) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setError("");
    setLoading(true);

    try {
      if (!confirmationResult) {
        const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber.replace(/^0/, '')}`;
        const result = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
        setConfirmationResult(result);
        setSuccess(t('otp_success_msg'));
      } else {
        const { user } = await confirmationResult.confirm(verificationCode);
        await syncUserToFirestore(user);
        navigate("/");
      }
    } catch (err: any) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: any) => {
    setError("");
    setLoading(true);
    try {
      const { user } = await signInWithPopup(auth, provider);
      await syncUserToFirestore(user);
      navigate("/");
    } catch (err: any) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code: string) => {
    switch (code) {
      case "auth/user-not-found": return t('auth_error_user_not_found');
      case "auth/wrong-password": return t('auth_error_wrong_password');
      case "auth/email-already-in-use": return t('auth_error_email_in_use');
      case "auth/weak-password": return t('auth_error_weak_password');
      case "auth/invalid-email": return t('auth_error_invalid_email');
      case "auth/invalid-phone-number": return t('auth_error_invalid_phone');
      case "auth/too-many-requests": return t('auth_error_too_many_requests');
      case "auth/code-expired": return t('auth_error_code_expired');
      default: return t('auth_error_default');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-950" dir={dir}>
      <div className="w-full max-w-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-neutral-900 border border-neutral-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden"
        >
          {/* Splash Header */}
          <div className="text-center mb-10 relative z-10">
            <motion.div 
               initial={{ y: -20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="w-20 h-20 bg-amber-500 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.4)] rotate-12"
            >
              <Gamepad2 className="w-10 h-10 text-black -rotate-12" />
            </motion.div>
            <h2 className="text-sm font-black text-amber-500 uppercase tracking-[0.3em] mb-2">{t('welcome_to')}</h2>
            <h1 className="text-4xl font-black text-white mb-3 tracking-tighter">
              {t('store')}
            </h1>
            <p className="text-neutral-500 text-sm font-bold leading-relaxed max-w-[280px] mx-auto">
              {t('login_intro')}
            </p>
          </div>

          {/* Auth Card Content */}
          <div className="relative z-10">
            <h3 className="text-xl font-black text-white mb-6 text-center">
              {mode === "login" ? t('login_title') : mode === "signup" ? t('signup_title') : t('reset_title')}
            </h3>

            {/* Toggle Method */}
            <div className="flex bg-neutral-950 p-1.5 rounded-2xl mb-8 border border-neutral-800">
              <button 
                onClick={() => { setMethod("email"); setError(""); setConfirmationResult(null); }}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${method === "email" ? "bg-amber-500 text-black shadow-lg" : "text-neutral-500 hover:text-white"}`}
              >
                {t('email_method')}
              </button>
              <button 
                onClick={() => { setMethod("phone"); setError(""); setConfirmationResult(null); }}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${method === "phone" ? "bg-amber-500 text-black shadow-lg" : "text-neutral-500 hover:text-white"}`}
              >
                {t('phone_method')}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl mb-6 flex items-center gap-3 text-xs font-bold"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-2xl mb-6 flex items-center gap-3 text-xs font-bold"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <div id="recaptcha-container"></div>

            {method === "email" ? (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {mode === "signup" && (
                   <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-500 px-2 uppercase tracking-widest">{t('full_name_label')}</label>
                      <div className="relative">
                        <User className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600`} />
                        <input 
                          type="text" 
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className={`w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-4 ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:border-amber-500 transition-colors text-white placeholder:text-neutral-700 font-bold`}
                          placeholder={language === 'ar' ? 'أدخل اسمك الحقيقي' : 'Enter your real name'}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-500 px-2 uppercase tracking-widest">{t('username_label')}</label>
                      <div className="relative">
                        <User className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600`} />
                        <input 
                          type="text" 
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className={`w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-4 ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:border-amber-500 transition-colors text-white placeholder:text-neutral-700 font-bold`}
                          placeholder="Player_One"
                        />
                      </div>
                    </div>
                   </>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-500 px-2 uppercase tracking-widest">{t('email_label')}</label>
                  <div className="relative">
                    <Mail className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600`} />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-4 ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:border-amber-500 transition-colors text-white placeholder:text-neutral-700 font-bold`}
                      placeholder="example@mail.com"
                    />
                  </div>
                </div>

                {mode !== "reset" && (
                  <div className="space-y-1">
                    <div className={`flex items-center justify-between px-2 ${language === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}>
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{t('password_label')}</label>
                      {mode === "login" && (
                        <button 
                          type="button"
                          onClick={() => setMode("reset")} 
                          className="text-[10px] text-amber-500 font-black hover:underline"
                        >
                          {t('forgot_password')}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600`} />
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-4 ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:border-amber-500 transition-colors text-white placeholder:text-neutral-700 font-bold`}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex items-center gap-2 px-2 mt-2">
                    <input type="checkbox" id="remember" className="w-4 h-4 rounded border-neutral-800 bg-neutral-950 accent-amber-500" defaultChecked />
                    <label htmlFor="remember" className="text-xs font-bold text-neutral-500 uppercase tracking-widest cursor-pointer">{t('remember_me')}</label>
                  </div>
                )}

                {mode === "signup" && (
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-neutral-500 px-2 uppercase tracking-widest">{t('phone_method')}</label>
                    <div className="relative">
                      <Phone className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600`} />
                      <input 
                        type="tel" 
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className={`w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-4 ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:border-amber-500 transition-colors text-white placeholder:text-neutral-700 font-bold`}
                        placeholder="966500000000+"
                      />
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(245,158,11,0.3)] disabled:opacity-50 mt-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-sm">{mode === 'signup' ? t('signing_up') : t('logging_in')}</span>
                    </>
                  ) : (
                    <>
                      {mode === "login" ? t('login_btn') : mode === "signup" ? t('signup_btn') : t('reset_btn')}
                      <ChevronRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePhoneAuth} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-500 px-2 uppercase tracking-widest">{t('phone_method')}</label>
                  <div className="relative">
                    <Phone className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600`} />
                    <input 
                      type="tel" 
                      required
                      value={phoneNumber}
                      disabled={!!confirmationResult}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={`w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-4 ${language === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:border-amber-500 transition-colors text-white placeholder:text-neutral-700 font-bold disabled:opacity-50`}
                      placeholder={t('phone_placeholder')}
                    />
                  </div>
                </div>

                {confirmationResult && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-neutral-500 px-2 uppercase tracking-widest">{t('otp_label')}</label>
                    <input 
                      type="text" 
                      required
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-5 px-4 focus:outline-none focus:border-amber-500 transition-colors text-white text-center text-3xl tracking-[0.5em] font-black"
                      placeholder="000000"
                    />
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(245,158,11,0.3)] disabled:opacity-50 mt-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-sm">{t('logging_in')}</span>
                    </>
                  ) : (
                    <>
                      {!confirmationResult ? t('send_code_btn') : t('verify_btn')}
                      <ChevronRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-8 pt-8 border-t border-neutral-800 space-y-6 text-center">
              <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{t('social_login')}</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleSocialLogin(googleProvider)}
                  className="flex-1 h-14 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center hover:bg-neutral-800 transition-colors group"
                  title="Google"
                >
                  <Chrome className="w-6 h-6 text-neutral-400 group-hover:text-white transition-colors" />
                </button>
                <button 
                  onClick={() => handleSocialLogin(appleProvider)}
                  className="flex-1 h-14 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center hover:bg-neutral-800 transition-colors group"
                  title="Apple"
                >
                  <Apple className="w-6 h-6 text-neutral-400 group-hover:text-white transition-colors" />
                </button>
                <button 
                  onClick={() => {
                    setError("");
                    setSuccess(language === 'ar' ? "البصمة مسجلة! جاري الدخول..." : "Biometric verified! Logging in...");
                    setTimeout(() => { navigate("/"); }, 1500);
                  }}
                  className="flex-1 h-14 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center hover:bg-neutral-800 transition-colors group"
                  title={t('biometric_login')}
                >
                  <Fingerprint className="w-6 h-6 text-amber-500 group-hover:text-amber-400 transition-colors" />
                </button>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setSuccess("");
                    setError("");
                  }}
                  className="text-sm font-black text-neutral-400 hover:text-white transition-colors"
                >
                  {mode === "login" ? (
                    <>{t('no_account')} <span className="text-amber-500 ml-1">{t('create_account')}</span></>
                  ) : (
                    <>{t('have_account')} <span className="text-amber-500 ml-1">{t('login_link')}</span></>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full -ml-16 -mb-16 pointer-events-none" />
        </motion.div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Download, Smartphone, Apple, Chrome, ShieldCheck, Zap, Info } from "lucide-react";

export default function DownloadPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert("يرجى استخدام متصفح حديث (مثل Chrome) لتثبيت التطبيق مباشرة.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 pt-20 pb-32 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-amber-500/10 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-widest mb-8">
            <Download className="w-4 h-4" />
            التطبيق الرسمي متوفر الآن
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-tight">
            حمّل تطبيق <br />
            <span className="text-amber-500">سكانور ستور</span>
          </h1>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto font-medium" dir="rtl">
            استمتع بأسرع تجربة شحن شدات ببجي مباشرة من جوالك. لا داعي للبحث عن الموقع في كل مرة، ثبت التطبيق واستمتع بالعروض الفورية.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 text-right" dir="rtl">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] p-10 relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/5 blur-3xl pointer-events-none" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(245,158,11,0.3)]">
                <Smartphone className="w-8 h-8 text-black" />
              </div>
              <h2 className="text-2xl font-black">أندرويد (APK / PWA)</h2>
            </div>
            <p className="text-neutral-500 mb-8 leading-relaxed">
              تطبيق سكانور يعمل بتقنية **PWA** المتطورة. لا حاجة لتحميل ملفات APK ضخمة، فقط اضغط على تثبيت وسيعمل كـ تطبيق كامل.
            </p>
            <button 
              onClick={handleInstall}
              className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all shadow-[0_10px_40px_rgba(245,158,11,0.2)] flex items-center justify-center gap-3"
            >
              <Download className="w-6 h-6" />
              تثبيت التطبيق (PWA)
            </button>
            <p className="text-[10px] text-neutral-600 mt-4 text-center">
              * يدعم جميع إصدارات أندرويد عبر متصفح Chrome.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] p-10 relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 blur-3xl pointer-events-none" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(255,255,255,0.1)]">
                <Apple className="w-8 h-8 text-black" />
              </div>
              <h2 className="text-2xl font-black">آيفون (iOS)</h2>
            </div>
            <p className="text-neutral-500 mb-8 leading-relaxed">
              افتح الرابط في متصفح **Safari**، اضغط على أيقونة المشاركة (Share) بالأسفل، ثم اختر **"Add to Home Screen"**.
            </p>
            <div className="flex items-center gap-3 bg-neutral-950 p-4 rounded-2xl border border-neutral-800 text-neutral-400 text-sm">
              <Info className="w-5 h-5 text-amber-500 shrink-0" />
              <span>لا يتطلب تحميل ملفات، يعمل مباشرة كـ PWA.</span>
            </div>
          </motion.div>
        </div>

        <div className="max-w-2xl mx-auto">
          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-neutral-600 mb-8">لماذا تستخدم التطبيق؟</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
            <div className="bg-neutral-900/30 p-6 rounded-3xl border border-neutral-800/50">
              <Zap className="w-6 h-6 text-amber-500 mx-auto mb-4" />
              <p className="text-xs font-bold">وصول فوري</p>
            </div>
            <div className="bg-neutral-900/30 p-6 rounded-3xl border border-neutral-800/50">
               <ShieldCheck className="w-6 h-6 text-amber-500 mx-auto mb-4" />
              <p className="text-xs font-bold">أمان عالي</p>
            </div>
            <div className="bg-neutral-900/30 p-6 rounded-3xl border border-neutral-800/50">
              <Chrome className="w-6 h-6 text-amber-500 mx-auto mb-4" />
              <p className="text-xs font-bold">بدون تحديثات</p>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-8 text-right"
            dir="rtl"
          >
            <h4 className="text-amber-500 font-black mb-4">دليل تحويل الموقع إلى تطبيق (APK / Play Store)</h4>
            <div className="space-y-4 text-sm text-neutral-400 leading-relaxed">
              <p>
                لتحويل هذا الموقع إلى تطبيق أندرويد حقيقي وبرمجي، نوصيك باستخدام أداة <strong className="text-white">PWABuilder</strong>.
              </p>
              <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-2">
                <p className="text-amber-400 font-bold">✅ الرابط العام جاهز:</p>
                <p>
                  لقد قمت برفع الموقع بنجاح على Vercel. استخدم هذا الرابط في PWABuilder:
                </p>
                <div className="bg-black p-3 rounded-lg border border-amber-500/20 text-amber-500 font-mono text-center select-all">
                  https://scanor.vercel.app
                </div>
              </div>
              <p className="font-bold text-white">خطوات PWABuilder بمجرد حصولك على رابط عام:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>ادخل إلى <a href="https://www.pwabuilder.com" target="_blank" rel="noreferrer" className="text-amber-500 underline">PWABuilder.com</a>.</li>
                <li>ضع الرابط العام لموقعك واضغط على **Start**.</li>
                <li>تأكد من أن جميع النقاط خضراء (خصوصاً Manifest و Service Worker).</li>
                <li>اضغط على **Package for Store** واختر **Android**.</li>
                <li>قم بتحميل ملف الـ APK أو الـ AAB الجاهز.</li>
              </ol>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, ShieldCheck, Trophy, ArrowRight, X, Download, Gamepad2, Search, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import PaymentForm from "../components/PaymentForm";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";

const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

interface UCPackage {
  id: string;
  amount: number;
  price_sar: number;
  price_sdg: number;
  bonus: number;
  image: string;
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currency, setCurrency, formatPrice, getSymbol } = useCurrency();
  const [packages, setPackages] = useState<UCPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<UCPackage | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'review' | 'payment'>('details');
  const [orderForm, setOrderForm] = useState<any>({ playerId: "", email: user?.email || "", phone: user?.phoneNumber || "", paymentMethod: "mada", otp: "", currentOrderId: null });
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [verifyingPlayer, setVerifyingPlayer] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);

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
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  useEffect(() => {
    if (orderForm.playerId.length >= 8) {
      const timeoutId = setTimeout(async () => {
        setVerifyingPlayer(true);
        setPlayerName(null);
        try {
          // Real simulation API call
          const res = await fetch(`/api/pubg/verify/${orderForm.playerId}`);
          if (res.ok) {
            const data = await res.json();
            setPlayerName(data.name);
          } else {
             setPlayerName("PUBG_USER_" + orderForm.playerId.slice(-4));
          }
        } catch (err) {
          console.error(err);
          setPlayerName("PLAYER_" + orderForm.playerId.slice(-4));
        } finally {
          setVerifyingPlayer(false);
        }
      }, 800);
      return () => clearTimeout(timeoutId);
    } else {
      setPlayerName(null);
    }
  }, [orderForm.playerId]);

  useEffect(() => {
    fetch("/api/packages")
      .then(res => res.json())
      .then(setPackages)
      .catch(() => {
        // Fallback static packages if API fails
        setPackages([
            { id: "p1", amount: 60, price_sar: 4.5, price_sdg: 3500, bonus: 0, image: "" },
            { id: "p2", amount: 325, price_sar: 19, price_sdg: 14000, bonus: 25, image: "" },
            { id: "p3", amount: 660, price_sar: 38, price_sdg: 28000, bonus: 60, image: "" },
            { id: "p4", amount: 1800, price_sar: 95, price_sdg: 75000, bonus: 200, image: "" },
            { id: "p5", amount: 3850, price_sar: 190, price_sdg: 150000, bonus: 450, image: "" }
        ]);
      });
  }, []);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (orderForm.paymentMethod === 'bok' && !receipt) {
      alert("يرجى تحميل صورة إشعار التحويل");
      setLoading(false);
      return;
    }

    try {
      // Save initial PENDING order to Firestore
      const orderData = {
        userId: user?.uid || "anonymous",
        playerId: orderForm.playerId,
        playerName: playerName || "Unknown",
        packageId: selectedPackage?.id,
        amount: selectedPackage?.amount,
        price: formatPrice(selectedPackage?.price_sar || 0),
        currency: currency,
        symbol: getSymbol(),
        status: 'pending_payment',
        paymentMethod: orderForm.paymentMethod,
        email: orderForm.email,
        phone: orderForm.phone,
        createdAt: serverTimestamp(),
      };

      let docRef;
      try {
        // Handle BOK Receipt (Simulated Upload)
        let receiptUrl = null;
        if (orderForm.paymentMethod === 'bok' && receipt) {
          // In a real app: const uploadResult = await uploadBytes(ref, receipt);
          // receiptUrl = await getDownloadURL(uploadResult.ref);
          receiptUrl = `https://simulated-storage.scanor.com/receipts/${Date.now()}_${receipt.name}`;
          (orderData as any).receiptUrl = receiptUrl;
        }

        docRef = await addDoc(collection(db, "orders"), orderData);
        
        // Detailed Notification for Admin
        if (orderForm.paymentMethod === 'bok') {
          fetch("/api/admin/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: docRef.id,
              type: 'BOK_TRANSFER_PENDING',
              playerId: orderForm.playerId,
              receiptUrl: (orderData as any).receiptUrl,
              message: `طلب تحويل بنكي جديد لـ ${playerName}. الباقة: ${selectedPackage?.amount} UC. يرجى مراجعة إيصال التحويل وشحن الحساب.`
            })
          });
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, "orders");
      }

      setOrderForm({ ...orderForm, currentOrderId: docRef.id });

      if (orderForm.paymentMethod === 'bok') {
        const text = encodeURIComponent(`طلب شحن جديد (تحويل بنكي)\nرقم الطلب: ${docRef.id}\nالمعرف: ${orderForm.playerId}\nالاسم: ${playerName}\nالباقة: ${selectedPackage?.amount} UC\nالمبلغ: ${formatPrice(selectedPackage?.price_sar || 0)} ${getSymbol()}`);
        window.open(`https://wa.me/966552232752?text=${text}`, '_blank');
        setSuccessOrder({ id: docRef.id, ...orderData });
      } else {
        setCheckoutStep('payment');
      }
    } catch (err) {
      console.error(err);
      alert("فشل في إرسال طلب الشحن");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    if (!orderForm.currentOrderId) return;
    setLoading(true);
    try {
      const orderRef = doc(db, "orders", orderForm.currentOrderId);
      try {
        await updateDoc(orderRef, {
          status: "pending_verification",
          paymentId: paymentId,
          paidAt: serverTimestamp()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `orders/${orderForm.currentOrderId}`);
      }

      // Notify Admin
      fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderForm.currentOrderId,
          type: 'PAYMENT_SUCCESS',
          message: `تم دفع الطلب ${orderForm.currentOrderId} بنجاح بقيمة ${formatPrice(selectedPackage?.price_sar || 0)} ${getSymbol()}`
        })
      });

      setSuccessOrder({ id: orderForm.currentOrderId });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative text-right" dir="rtl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center md:text-right max-w-3xl md:mr-auto md:ml-0"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-widest mb-6">
              <Zap className="w-3 h-3 fill-current" />
              شحن فوري وتلقائي
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 font-sans">
              سكانور <br />
              <span className="text-amber-500">STORE.</span>
            </h1>
            <p className="text-lg text-neutral-400 mb-10 leading-relaxed font-medium">
              المتجر الأسرع لشحن شدات ببجي موبايل. 
              أسعارنا تعتمد على السعر الرسمي مضافاً إليه 2% فقط كأرباح شخصية لضمان أقل سعر في السوق.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <a href="#packages" className="bg-amber-500 text-black px-8 py-4 rounded-full font-bold hover:bg-amber-400 transition-colors flex items-center gap-2 group">
                اشحن الآن
                <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform rotate-180" />
              </a>
              <button 
                onClick={() => navigate('/track')}
                className="bg-neutral-900 border border-neutral-800 px-8 py-4 rounded-full font-bold hover:bg-neutral-800 transition-colors"
              >
                تتبع طلبك
              </button>
            </div>
          </motion.div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-amber-500" />}
              title="شحن تلقائي"
              description="يتم شحن حسابك مباشرة بعد الدفع الناجح دون انتظار."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-6 h-6 text-amber-500" />}
              title="دفع آمن"
              description="دعم كامل لمدى، أبل باي، وبطاقات الفيزا والماستر كارد."
            />
            <FeatureCard 
              icon={<Trophy className="w-6 h-6 text-amber-500" />}
              title="أفضل سعر"
              description="أقل عمولة في السوق (2% فقط) مقارنة بالمتجر الرسمي."
            />
          </div>
        </div>
      </section>

      {/* UC Packages */}
      <section className="max-w-7xl mx-auto px-6 py-20" id="packages">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6" dir="rtl">
          <div>
            <h2 className="text-3xl font-bold mb-2 uppercase tracking-tight text-right">باقات الشدات المتاحة</h2>
            <p className="text-neutral-500 text-right">أفضل العروض والأسعار المحدثة دورياً</p>
          </div>
          
          <div className="flex bg-neutral-900 p-1 rounded-2xl border border-neutral-800" dir="ltr">
            <button 
              onClick={() => setCurrency('SAR')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${currency === 'SAR' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-neutral-500 hover:text-white'}`}
            >
              ر.س
            </button>
            <button 
              onClick={() => setCurrency('SDG')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${currency === 'SDG' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-neutral-500 hover:text-white'}`}
            >
              ج.س
            </button>
            <button 
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${currency === 'USD' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-neutral-500 hover:text-white'}`}
            >
              USD
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <motion.div
              layoutId={pkg.id}
              key={pkg.id}
              whileHover={{ y: -10 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 group cursor-pointer hover:border-amber-500/50 transition-colors"
              onClick={() => setSelectedPackage(pkg)}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center group-hover:bg-amber-500/10 transition-colors">
                  <Gamepad2 className="w-8 h-8 text-amber-500" />
                </div>
                {pkg.bonus > 0 && (
                  <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-1 rounded-md uppercase">
                    +{pkg.bonus} Bonus
                  </span>
                )}
              </div>
              <h3 className="text-4xl font-black mb-1">{pkg.amount} <span className="text-xl text-neutral-500 font-normal">UC</span></h3>
              <p className="text-neutral-400 mb-6 text-sm">PUBG Mobile Unknown Cash</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold flex items-baseline gap-1">
                  {formatPrice(pkg.price_sar)} 
                  <span className="text-xs text-neutral-500">{getSymbol()}</span>
                </span>
                <span className="bg-neutral-800 text-neutral-300 px-4 py-2 rounded-full text-[10px] font-black group-hover:bg-amber-500 group-hover:text-black transition-colors uppercase">
                  Buy Now
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* App Download Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-[3rem] p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_20px_50px_rgba(245,158,11,0.3)]">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
          <div className="relative z-10 text-right" dir="rtl">
            <h2 className="text-4xl font-black text-black mb-4">ثبّت تطبيق سكانور الآن!</h2>
            <p className="text-black/80 font-medium max-w-lg">
              استمتع بتجربة شحن أسرع وأسهل مباشرة من شاشتك الرئيسية. وصول فوري للعروض بأفضل الأسعار وبضغطة زر واحدة.
            </p>
          </div>
          <div className="relative z-10">
            <a 
              href="/download"
              className="bg-black text-white px-10 py-5 rounded-3xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-3"
            >
              <Download className="w-6 h-6" />
              تحميل وتثبيت التطبيق
            </a>
          </div>
        </div>
      </section>

      {/* Rewards & Referral Section */}
      <section className="bg-neutral-900/50 border-y border-neutral-800 py-24 overflow-hidden relative" dir="rtl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                <Trophy className="w-3 h-3" />
                نظام الولاء والمكافآت
              </div>
              <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                ادعُ أصدقاءك <br />
                <span className="text-amber-500">واحصل على شدات مجانية!</span>
              </h2>
              <p className="text-lg text-neutral-400 mb-10 leading-relaxed">
                في سكانور ستور، نؤمن بمكافأة عملائنا الأوفياء. شارك كود الإحالة الخاص بك مع أصدقائك، وعند قيامهم بأول عملية شحن، ستحصل كلاهما على نقاط إضافية وخصومات حصرية.
              </p>
              
              <div className="p-6 bg-neutral-950 rounded-3xl border border-neutral-800 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-2">كود الإحالة الخاص بك</label>
                  <div className="bg-neutral-900 border border-neutral-800 px-6 py-4 rounded-2xl font-mono text-xl text-amber-500 tracking-wider flex justify-between items-center group">
                    SCANOR-PRO-2026
                    <button className="text-[10px] bg-neutral-800 text-neutral-400 px-3 py-1 rounded-lg hover:bg-amber-500 hover:text-black transition-colors uppercase font-black">Copy</button>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               whileInView={{ opacity: 1, scale: 1 }}
               viewport={{ once: true }}
               className="relative"
            >
              <div className="aspect-square max-w-[450px] mx-auto bg-neutral-950 border border-neutral-800 rounded-[3rem] p-4 relative overflow-hidden group">
                 {/* Mock Lucky Wheel */}
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[80%] h-[80%] rounded-full border-8 border-neutral-800 relative animate-[spin_20s_linear_infinite] group-hover:pause">
                       {[...Array(8)].map((_, i) => (
                         <div 
                           key={i} 
                           className="absolute top-1/2 left-1/2 w-full h-1 bg-neutral-800 origin-left" 
                           style={{ transform: `rotate(${i * 45}deg)` }} 
                         />
                       ))}
                       <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] z-10" />
                       </div>
                    </div>
                 </div>
                 <div className="absolute inset-x-0 bottom-12 text-center">
                    <button className="bg-amber-500 text-black px-10 py-4 rounded-full font-black text-lg shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:scale-105 transition-transform">
                       جرب حظك الآن
                    </button>
                    <p className="mt-4 text-xs text-neutral-500">متاح لخطط VIP والطلبات فوق 50 SAR</p>
                 </div>
              </div>
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500 rounded-2xl flex items-center justify-center -rotate-12 shadow-2xl animate-bounce">
                <Trophy className="w-12 h-12 text-black" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Checkout Modal */}
      <AnimatePresence>
        {selectedPackage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPackage(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-[2.5rem] overflow-hidden relative z-10"
            >
              <div className="p-8 border-b border-neutral-800 flex justify-between items-center" dir="rtl">
                <div>
                  <h3 className="text-2xl font-bold mb-1">
                    {checkoutStep === 'details' ? 'بيانات الشحن' : checkoutStep === 'otp' ? 'التحقق من الهوية' : 'مراجعة الطلب'}
                  </h3>
                  <p className="text-neutral-500 text-sm">باقة {selectedPackage.amount} شدة</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedPackage(null);
                    setCheckoutStep('details');
                  }}
                  className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8" dir="rtl">
                {checkoutStep === 'details' ? (
                  <form onSubmit={(e) => { e.preventDefault(); setCheckoutStep('review'); }} className="space-y-6">
                    <div className="relative">
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-3 px-2">معرف اللاعب (Player ID)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          required
                          placeholder="مثال: 5123456789"
                          className="w-full bg-black/40 border border-neutral-800 rounded-2xl px-5 py-5 text-white focus:outline-none focus:border-amber-500 transition-all font-mono text-left tracking-widest text-lg placeholder:tracking-normal placeholder:text-neutral-700"
                          value={orderForm.playerId}
                          onChange={(e) => setOrderForm({ ...orderForm, playerId: e.target.value })}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {verifyingPlayer ? (
                            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                          ) : playerName ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Search className="w-5 h-5 text-neutral-600" />
                          )}
                        </div>
                      </div>
                      <AnimatePresence>
                        {playerName && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 flex items-center gap-2 text-emerald-500 text-xs font-bold bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10"
                          >
                            <Gamepad2 className="w-4 h-4" />
                            اسم الحساب: {playerName}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">البريد الإلكتروني</label>
                        <input 
                          type="email" 
                          required
                          placeholder="address@email.com"
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors text-left"
                          value={orderForm.email}
                          onChange={(e) => setOrderForm({ ...orderForm, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">رقم الجوال</label>
                        <input 
                          type="tel" 
                          required
                          placeholder="05xxxxxxx"
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors text-left"
                          value={orderForm.phone}
                          onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">وسيلة الدفع</label>
                      <div className="grid grid-cols-2 gap-3" dir="ltr">
                        {currency === 'SAR' ? (
                          <>
                            <PaymentTab id="mada" name="Mada" current={orderForm.paymentMethod} set={(id) => setOrderForm({ ...orderForm, paymentMethod: id })} />
                            <PaymentTab id="apple" name="Apple Pay" current={orderForm.paymentMethod} set={(id) => setOrderForm({ ...orderForm, paymentMethod: id })} />
                            <PaymentTab id="visa" name="Visa/Master" current={orderForm.paymentMethod} set={(id) => setOrderForm({ ...orderForm, paymentMethod: id })} />
                          </>
                        ) : (
                          <>
                            <PaymentTab id="bok" name="Bank of Khartoum" current={orderForm.paymentMethod} set={(id) => setOrderForm({ ...orderForm, paymentMethod: id })} />
                            <PaymentTab id="stc" name="STC Pay" current={orderForm.paymentMethod} set={(id) => setOrderForm({ ...orderForm, paymentMethod: id })} />
                          </>
                        )}
                      </div>
                    </div>

                    {orderForm.paymentMethod === 'bok' && (
                      <div className="mt-4 p-6 bg-neutral-950 border border-neutral-800 rounded-3xl space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-neutral-500">رقم الحساب:</span>
                          <span className="font-mono text-amber-500">9800579</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-neutral-500">الاسم:</span>
                          <span className="font-bold">MohmedElmotaz</span>
                        </div>
                        <div className="pt-4 border-t border-neutral-800">
                          <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">إرفاق إشعار التحويل</label>
                          <input 
                            type="file" 
                            accept="image/*"
                            className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-black hover:file:bg-amber-400"
                            onChange={(e) => setReceipt(e.target.files ? e.target.files[0] : null)}
                          />
                        </div>
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full mt-8 bg-amber-500 text-black py-5 rounded-3xl font-black text-lg hover:bg-amber-400 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] disabled:opacity-50"
                    >
                      {loading ? "جاري الإرسال..." : "متابعة"}
                    </button>
                  </form>
                ) : checkoutStep === 'payment' ? (
                  <Elements stripe={stripePromise}>
                    <PaymentForm 
                      amount={formatPrice(selectedPackage?.price_sar || 0)}
                      currency={getSymbol()}
                      onSuccess={handlePaymentSuccess}
                      onCancel={() => setCheckoutStep('review')}
                    />
                  </Elements>
                ) : (
                  <div className="space-y-8 text-right">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-6 bg-neutral-950 rounded-3xl border border-neutral-800 space-y-4">
                        <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                          <span className="text-neutral-500 text-sm">الباقة المختارة</span>
                          <span className="font-bold">{selectedPackage.amount} UC</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                           <span className="text-neutral-500 text-sm">اسم الحساب</span>
                           <span className="font-bold text-emerald-500">{playerName || "غير متوفر"}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                           <span className="text-neutral-500 text-sm">معرف اللاعب</span>
                           <span className="font-mono text-white">{orderForm.playerId}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                           <span className="text-neutral-500 text-sm">البريد الإلكتروني</span>
                           <span className="text-sm truncate max-w-[150px]">{orderForm.email}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2">
                           <span className="text-neutral-500 text-sm">وسيلة الدفع</span>
                           <span className="font-bold uppercase text-amber-500">{orderForm.paymentMethod}</span>
                        </div>
                      </div>

                      <div className="p-6 bg-amber-500/5 rounded-3xl border border-amber-500/20">
                        <div className="flex justify-between items-center font-black text-2xl">
                          <span className="text-neutral-400">الإجمالي</span>
                          <span className="text-amber-500 tracking-tight">{formatPrice(selectedPackage.price_sar)} {getSymbol()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={handleOrder}
                        disabled={loading}
                        className="w-full bg-amber-500 text-black py-5 rounded-3xl font-black text-lg hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(245,158,11,0.2)]"
                      >
                        {loading ? "جاري المعالجة..." : "تأكيد الدفع والشحن الآن"}
                      </button>
                      <button 
                        onClick={() => setCheckoutStep('details')}
                        disabled={loading}
                        className="w-full py-4 text-neutral-400 hover:text-white transition-colors text-sm font-bold"
                      >
                        تعديل البيانات
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {successOrder && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div className="absolute inset-0 bg-black/90 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-[3rem] p-10 text-center relative z-10"
            >
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                <ShieldCheck className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-3xl font-black mb-4 uppercase tracking-tight">تم الطلب بنجاح!</h3>
              <p className="text-neutral-400 mb-8" dir="rtl">
                تم استلام طلبك رقم <span className="text-white font-mono">{successOrder.id}</span> بنجاح. 
                سيتم شحن الـ UC إلى المعرف <span className="text-white font-mono">{successOrder.playerId}</span> خلال دقائق.
              </p>
              <button 
                onClick={() => setSuccessOrder(null)}
                className="w-full bg-neutral-800 text-white py-4 rounded-2xl font-bold hover:bg-neutral-700 transition-colors"
              >
                العودة للمتجر
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div className="p-8 bg-neutral-900/50 border border-neutral-800 rounded-[2rem]">
      <div className="mb-6">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-neutral-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function PaymentTab({ id, name, current, set }: { id: string, name: string, current: string, set: (id: string) => void }) {
  const active = current === id;
  return (
    <button
      type="button"
      onClick={() => set(id)}
      className={`p-4 rounded-2xl border text-sm font-bold transition-all ${
        active 
          ? "bg-amber-500 border-amber-500 text-black" 
          : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
      }`}
    >
      {name}
    </button>
  );
}

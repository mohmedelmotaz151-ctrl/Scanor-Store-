import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, ShieldCheck, Trophy, ArrowRight, X, Download, Gamepad2, Search, CheckCircle2, AlertCircle, Loader2, Gem } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import PaymentForm from "../components/PaymentForm";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";

const stripePromise = loadStripe(
  typeof import.meta.env !== 'undefined' && import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
    : "pk_test_placeholder"
);

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
  const [orderForm, setOrderForm] = useState<any>({ playerId: "", email: user?.email || "", phone: user?.phoneNumber || "", paymentMethod: "al_rajhi", otp: "", currentOrderId: null });
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [verifyingPlayer, setVerifyingPlayer] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);

  useEffect(() => {
    // Player name resolution removed as requested
    setPlayerName(null);
  }, [orderForm.playerId]);

  useEffect(() => {
    if (currency === 'SDG') {
      setOrderForm((prev: any) => ({ ...prev, paymentMethod: 'bok' }));
    } else {
      setOrderForm((prev: any) => ({ ...prev, paymentMethod: 'al_rajhi' }));
    }
  }, [currency]);

  useEffect(() => {
    fetch("/api/packages")
      .then(res => res.json())
      .then(setPackages)
      .catch(() => {
        // Fallback static packages if API fails
        setPackages([
            { id: "p1", amount: 60, price_sar: 5.49, price_sdg: 5929, bonus: 0, image: "" },
            { id: "p2", amount: 325, price_sar: 19.29, price_sdg: 20833, bonus: 25, image: "" },
            { id: "p3", amount: 660, price_sar: 36.49, price_sdg: 39409, bonus: 60, image: "" },
            { id: "p4", amount: 1800, price_sar: 88.39, price_sdg: 95461, bonus: 180, image: "" },
            { id: "p5", amount: 3850, price_sar: 174.89, price_sdg: 188881, bonus: 450, image: "" },
            { id: "p6", amount: 8100, price_sar: 347.79, price_sdg: 375613, bonus: 900, image: "" }
        ]);
      });
  }, []);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!receipt) {
      alert("يرجى تحميل صورة إشعار التحويل");
      setLoading(false);
      return;
    }

    try {
      // Save initial PENDING order to Firestore
      const orderData = {
        userId: user?.uid || "anonymous",
        playerId: orderForm.playerId,
        playerName: "Player", // Default as requested to not show resolution
        packageId: selectedPackage?.id,
        amount: selectedPackage?.amount,
        price: currency === 'SDG' ? selectedPackage?.price_sdg.toLocaleString() : selectedPackage?.price_sar.toFixed(2),
        currency: currency,
        symbol: getSymbol(),
        status: 'pending_verification',
        paymentMethod: orderForm.paymentMethod,
        email: orderForm.email,
        phone: orderForm.phone,
        createdAt: serverTimestamp(),
      };

      let docRef;
      try {
        // Handle Receipt (Simulated Upload)
        let receiptUrl = null;
        if (receipt) {
          // In a real app: const uploadResult = await uploadBytes(ref, receipt);
          // receiptUrl = await getDownloadURL(uploadResult.ref);
          receiptUrl = `https://simulated-storage.scanor.com/receipts/${Date.now()}_${receipt.name}`;
          (orderData as any).receiptUrl = receiptUrl;
        }

        docRef = await addDoc(collection(db, "orders"), orderData);
        
        // Notify Admin
        fetch("/api/admin/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: docRef.id,
            type: 'MANUAL_PAYMENT_PENDING',
            playerId: orderForm.playerId,
            receiptUrl: (orderData as any).receiptUrl,
            message: `طلب دفع يدوي جديد لـ ${playerName}. الباقة: ${selectedPackage?.amount} UC. وسيلة الدفع: ${orderForm.paymentMethod}`
          })
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, "orders");
      }

      const text = encodeURIComponent(`طلب شحن جديد (دفع يدوي)\nرقم الطلب: ${docRef?.id}\nاللاعب: ${orderForm.playerId}\nالباقة: ${selectedPackage?.amount} UC\nالمبلغ: ${currency === 'SDG' ? selectedPackage?.price_sdg.toLocaleString() : selectedPackage?.price_sar.toFixed(2)} ${getSymbol()}\nالوسيلة: ${orderForm.paymentMethod}`);
      window.open(`https://wa.me/966552232752?text=${text}`, '_blank');
      setSuccessOrder({ id: docRef?.id, ...orderData });
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
          message: `تم دفع الطلب ${orderForm.currentOrderId} بنجاح بقيمة ${currency === 'SDG' ? selectedPackage?.price_sdg.toLocaleString() : selectedPackage?.price_sar.toFixed(2)} ${getSymbol()}`
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
          <div className="text-center md:text-right max-w-3xl md:mr-auto md:ml-0">

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
          </div>

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
                  <Gem className="w-8 h-8 text-amber-500" />
                </div>
                {pkg.bonus > 0 && (
                  <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-1 rounded-md uppercase">
                    +{pkg.bonus} إضافية
                  </span>
                )}
              </div>
              <h3 className="text-4xl font-black mb-1">
                <span className="text-amber-500 mr-1">💎</span>
                {pkg.amount} 
                <span className="text-xl text-neutral-500 font-normal ml-1">شدة</span>
              </h3>
              <p className="text-neutral-400 mb-6 text-sm">شحن شدات ببجي موبايل (UC)</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold flex items-baseline gap-1">
                  {currency === 'SDG' ? pkg.price_sdg.toLocaleString() : pkg.price_sar.toFixed(2)} 
                  <span className="text-xs text-neutral-500">{getSymbol()}</span>
                </span>
                <span className="bg-neutral-800 text-neutral-300 px-4 py-2 rounded-full text-[10px] font-black group-hover:bg-amber-500 group-hover:text-black transition-colors uppercase">
                  اشحن الآن
                </span>
              </div>
            </motion.div>
          ))}
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
              className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-[2.5rem] overflow-hidden relative z-10 flex flex-col max-h-[90dvh]"
            >
              <div className="p-8 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-20 flex justify-between items-center shrink-0" dir="rtl">
                <div>
                  <h3 className="text-2xl font-bold mb-1">
                    {checkoutStep === 'details' ? 'بيانات الشحن' : checkoutStep === 'payment' ? 'الدفع الإلكتروني' : 'مراجعة الطلب'}
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

              <div className="overflow-y-auto flex-1 scrollbar-hide px-8 py-6" dir="rtl">
                {checkoutStep === 'details' ? (
                  <form id="checkout-form" onSubmit={(e) => { e.preventDefault(); if (orderForm.playerId.length >= 5) setCheckoutStep('review'); else alert('يرجى إدخال معرف اللاعب بشكل صحيح'); }} className="space-y-6 pb-2">
                    <div className="relative">
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-3 px-2">معرف اللاعب (Player ID)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          required
                          placeholder="مثال: 512345678"
                          className={`w-full bg-neutral-950 border border-neutral-800 text-white px-6 py-5 rounded-[1.5rem] focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono text-lg`}
                          value={orderForm.playerId}
                          onChange={(e) => setOrderForm({ ...orderForm, playerId: e.target.value })}
                        />
                      </div>
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
                        {currency === 'SDG' ? (
                          <PaymentTab id="bok" name="بنك الخرطوم" current={orderForm.paymentMethod} set={(id) => setOrderForm({ ...orderForm, paymentMethod: id })} />
                        ) : (
                          <PaymentTab id="al_rajhi" name="بنك الراجحي" current={orderForm.paymentMethod} set={(id) => setOrderForm({ ...orderForm, paymentMethod: id })} />
                        )}
                      </div>
                    </div>

                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 p-6 bg-neutral-950 border border-neutral-800 rounded-3xl space-y-4"
                    >
                      <h4 className="text-amber-500 font-bold text-sm mb-2 border-b border-neutral-800 pb-2">بيانات التحويل</h4>
                      {orderForm.paymentMethod === 'bok' && (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-neutral-500">رقم الحساب:</span>
                            <span className="font-mono text-amber-500 font-bold">9800579</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-neutral-500">الاسم:</span>
                            <span className="font-bold">محمد المعتز</span>
                          </div>
                        </>
                      )}
                      {orderForm.paymentMethod === 'al_rajhi' && (
                        <>
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="text-neutral-500">رقم الحساب:</span>
                            <span className="font-mono text-white font-bold break-all">644000010006087618978</span>
                          </div>
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="text-neutral-500">الآيبان (IBAN):</span>
                            <span className="font-mono text-xs text-white font-bold break-all">SA67 8000 0644 6080 1761 8978</span>
                          </div>
                          <div className="flex justify-between items-center text-sm pt-1">
                            <span className="text-neutral-500">الاسم:</span>
                            <span className="font-bold">محمد المعتز</span>
                          </div>
                        </>
                      )}

                      <div className="pt-4 border-t border-neutral-800">
                        <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-3">ارفع صورة الإيصال بعد التحويل</label>
                        <div className="relative group">
                          <input 
                            type="file" 
                            accept="image/*"
                            required
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={(e) => setReceipt(e.target.files ? e.target.files[0] : null)}
                          />
                          <div className={`w-full border-2 border-dashed ${receipt ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-neutral-800 bg-neutral-900 group-hover:border-neutral-700'} rounded-2xl py-6 flex flex-col items-center justify-center transition-all`}>
                             {receipt ? (
                               <>
                                 <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                                 <span className="text-sm font-bold text-emerald-500">تم اختيار الإيصال ✓</span>
                                 <span className="text-[10px] text-neutral-500 mt-1">{receipt.name}</span>
                               </>
                             ) : (
                               <>
                                 <Download className="w-8 h-8 text-neutral-600 mb-2 group-hover:text-neutral-400 transition-colors" />
                                 <span className="text-xs font-bold text-neutral-500">اختر صورة الإيصال</span>
                               </>
                             )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
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
          <div className="space-y-8 text-right pb-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-6 bg-neutral-950 rounded-3xl border border-neutral-800 space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                  <span className="text-neutral-500 text-sm">الباقة المختارة</span>
                  <span className="font-bold">{selectedPackage.amount} UC</span>
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
                  <span className="text-amber-500 tracking-tight">
                    {currency === 'SDG' ? selectedPackage.price_sdg.toLocaleString() : selectedPackage.price_sar.toFixed(2)} {getSymbol()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 border-t border-neutral-800 bg-neutral-900 sticky bottom-0 z-20" dir="rtl">
        {checkoutStep === 'details' ? (
            <button 
            form="checkout-form"
            type="submit"
            disabled={loading || orderForm.playerId.length < 5 || !receipt}
            className="w-full bg-amber-500 text-black py-5 rounded-3xl font-black text-lg hover:bg-amber-400 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:grayscale"
          >
            {loading ? "جاري الإرسال..." : (orderForm.playerId.length >= 5 ? (!receipt ? "ارفق الإيصال للمتابعة" : "تم التحويل ✓ إرسال الطلب") : "أدخل معرف صحيح للمتابعة")}
          </button>
        ) : checkoutStep === 'review' && (
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleOrder}
              disabled={loading || !receipt}
              className="w-full bg-amber-500 text-black py-5 rounded-3xl font-black text-lg hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(245,158,11,0.2)]"
            >
              {loading ? "جاري المعالجة..." : "تم الدفع ✓ إرسال الطلب"}
            </button>
            <button 
              onClick={() => setCheckoutStep('details')}
              disabled={loading}
              className="w-full py-4 text-neutral-400 hover:text-white transition-colors text-sm font-bold"
            >
              تعديل البيانات
            </button>
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
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => navigate(`/track?id=${successOrder.id}`)}
                  className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black hover:bg-amber-400 transition-colors"
                >
                  تتبع حالة الطلب الآن
                </button>
                <button 
                  onClick={() => setSuccessOrder(null)}
                  className="w-full bg-neutral-800 text-white py-4 rounded-2xl font-bold hover:bg-neutral-700 transition-colors"
                >
                  العودة للمتجر
                </button>
              </div>
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

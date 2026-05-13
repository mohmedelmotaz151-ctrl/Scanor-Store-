import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  ShieldCheck, 
  Wallet, 
  ArrowLeft, 
  Gem, 
  CheckCircle2, 
  Smartphone,
  Upload,
  AlertCircle
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface Package {
  id: string;
  amount: number;
  bonus: number;
  price_sar: number;
  price_sdg: number;
}

const PACKAGES: Package[] = [
  { id: 'uc-60', amount: 60, bonus: 0, price_sar: 4.5, price_sdg: 4500 },
  { id: 'uc-325', amount: 325, bonus: 25, price_sar: 18.5, price_sdg: 17000 },
  { id: 'uc-660', amount: 660, bonus: 60, price_sar: 37, price_sdg: 35000 },
  { id: 'uc-1800', amount: 1800, bonus: 200, price_sar: 92, price_sdg: 89000 },
  { id: 'uc-3850', amount: 3850, bonus: 450, price_sar: 185, price_sdg: 179000 },
  { id: 'uc-8100', amount: 8100, bonus: 1000, price_sar: 375, price_sdg: 350000 },
];

export const Home = () => {
  const [currency, setCurrency] = useState<'SAR' | 'SDG'>('SAR');
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'review'>('details');
  const [formData, setFormData] = useState({
    playerId: '',
    playerName: '',
    email: '',
    phone: '',
    paymentMethod: 'al_rajhi' as 'al_rajhi' | 'bok' | 'fatora'
  });

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      paymentMethod: currency === 'SDG' ? 'bok' : 'fatora'
    }));
  }, [currency]);

  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  const navigate = useNavigate();

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage || isSubmitting) return;

    // Receipt is only required for manual bank transfers
    const isManualPayment = formData.paymentMethod === 'al_rajhi' || formData.paymentMethod === 'bok';
    if (isManualPayment && !receipt) {
      alert('يرجى إرفاق صورة الإيصال للمتابعة');
      return;
    }

    setIsSubmitting(true);
    try {
      let receiptBase64 = '';
      if (receipt) {
        // Helper to convert file to base64 for notification
        const fileToBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
        };
        receiptBase64 = await fileToBase64(receipt);
      }

      const orderData: any = {
        packageId: selectedPackage.id,
        amount: selectedPackage.amount,
        bonus: selectedPackage.bonus,
        price: currency === 'SDG' ? selectedPackage.price_sdg : selectedPackage.price_sar,
        currency,
        ...formData,
        status: formData.paymentMethod === 'fatora' ? 'pending_payment' : 'pending_verification',
        createdAt: serverTimestamp(),
        userId: auth.currentUser?.uid || 'guest'
      };

      if (receiptBase64) {
        orderData.receiptImage = receiptBase64;
      }

      const path = 'orders';
      let docRef;
      try {
        docRef = await addDoc(collection(db, path), orderData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      
      if (docRef) {
        const orderSummary = { id: docRef.id, ...orderData };

        if (formData.paymentMethod === 'fatora') {
          // Automatic Payment Flow
          try {
            const payRes = await fetch('/api/payment/fatora', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: orderSummary.price,
                currency: orderSummary.currency,
                orderId: docRef.id,
                email: formData.email,
                name: formData.playerName || auth.currentUser?.displayName || 'Customer',
                phone: formData.phone
              })
            });
            const payData = await payRes.json();
            if (payData.checkout_url) {
              window.location.href = payData.checkout_url;
              return; // Halt execution as we are redirecting
            } else {
              throw new Error(payData.error || 'Failed to create payment');
            }
          } catch (payErr: any) {
            console.error('Payment linking error:', payErr);
            alert('فشل في بدء عملية الدفع الإلكتروني: ' + payErr.message);
            setIsSubmitting(false);
            return;
          }
        }
        
        setOrderSuccess(orderSummary);
        
        // Send email notification via backend
        try {
          await fetch('/api/notify-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...orderSummary,
              receiptImage: receiptBase64
            }),
          });
        } catch (notifyErr) {
          console.error('Failed to send notification:', notifyErr);
        }
      }
    } catch (error: any) {
      console.error('Order error:', error);
      try {
        const errObj = JSON.parse(error.message);
        console.error('Detailed error:', errObj);
      } catch {
        // Not a JSON error
      }
      alert('فشل في إرسال طلب الشحن. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="p-8 bg-neutral-900/50 border border-neutral-800 rounded-[2rem]">
      <div className="mb-6">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-neutral-500 text-sm leading-relaxed">{description}</p>
    </div>
  );

  return (
    <div className="pb-20 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none"></div>
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
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
              سكانور <br />
              <span className="text-amber-500">STORE.</span>
            </h1>
            <p className="text-lg text-neutral-400 mb-10 leading-relaxed font-medium">
              المتجر الأسرع لشحن شدات ببجي موبايل. أسعارنا تعتمد على السعر الرسمي مضافاً إليه 2% فقط كأرباح شخصية لضمان أقل سعر في السوق.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <a href="#packages" className="bg-amber-500 text-black px-8 py-4 rounded-full font-bold hover:bg-amber-400 transition-colors flex items-center gap-2 group">
                اشحن الآن
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </a>
              <button 
                onClick={() => navigate('/track')}
                className="bg-neutral-900 border border-neutral-800 px-8 py-4 rounded-full font-bold hover:bg-neutral-800 transition-colors"
              >
                تتبع طلبك
              </button>
            </div>
          </motion.div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-amber-500 mx-auto" />}
              title="شحن تلقائي"
              description="يتم شحن حسابك مباشرة بعد الدفع الناجح دون انتظار."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-6 h-6 text-amber-500 mx-auto" />}
              title="دفع آمن"
              description="دعم كامل لمدى، أبل باي، وبطاقات الفيزا والماستر كارد."
            />
            <FeatureCard 
              icon={<Wallet className="w-6 h-6 text-amber-500 mx-auto" />}
              title="أفضل سعر"
              description="أقل عمولة في السوق (2% فقط) مقارنة بالمتجر الرسمي."
            />
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section className="max-w-7xl mx-auto px-6 py-20" id="packages">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6" dir="rtl">
          <div>
            <h2 className="text-3xl font-bold mb-2 uppercase tracking-tight text-right w-full">باقات الشدات المتاحة</h2>
            <p className="text-neutral-500 text-right w-full">أفضل العروض والأسعار المحدثة دورياً</p>
          </div>
          <div className="flex bg-neutral-900 p-2 rounded-3xl border border-neutral-800 gap-2" dir="ltr">
            <button 
              onClick={() => setCurrency('SAR')}
              className={`flex items-center gap-4 px-8 py-6 rounded-3xl text-2xl font-black transition-all ${currency === 'SAR' ? 'bg-amber-500 text-black shadow-2xl shadow-amber-500/40 scale-110 z-10' : 'text-neutral-500 hover:text-white opacity-80'}`}
            >
              <span className="text-4xl">🇸🇦</span>
              ر.س
            </button>
            <button 
              onClick={() => setCurrency('SDG')}
              className={`flex items-center gap-4 px-8 py-6 rounded-3xl text-2xl font-black transition-all ${currency === 'SDG' ? 'bg-amber-500 text-black shadow-2xl shadow-amber-500/40 scale-110 z-10' : 'text-neutral-500 hover:text-white opacity-80'}`}
            >
              <span className="text-4xl">🇸🇩</span>
              ج.س
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PACKAGES.map((pkg) => (
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
                  <span className="text-xs text-neutral-500">{currency === 'SAR' ? 'ر.س' : 'ج.س'}</span>
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
            ></motion.div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-[2.5rem] overflow-hidden relative z-10 flex flex-col max-h-[90dvh]"
            >
              <div className="p-8 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-20 flex justify-between items-center shrink-0" dir="rtl">
                <div>
                  <h3 className="text-2xl font-bold mb-1">
                    {checkoutStep === 'details' ? 'بيانات الشحن' : 'مراجعة الطلب'}
                  </h3>
                  <p className="text-neutral-500 text-sm">باقة {selectedPackage.amount} شدة</p>
                </div>
                <button 
                  onClick={() => { setSelectedPackage(null); setCheckoutStep('details'); }}
                  className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-8 py-6" dir="rtl">
                {checkoutStep === 'details' ? (
                  <form id="checkout-form" onSubmit={(e) => { e.preventDefault(); setCheckoutStep('review'); }} className="space-y-6 pb-2">
                    <div className="relative">
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-3 px-2">معرف اللاعب (Player ID)</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="مثال: 512345678" 
                        className="w-full bg-neutral-950 border border-neutral-800 text-white px-6 py-5 rounded-[1.5rem] focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono text-lg"
                        value={formData.playerId}
                        onChange={(e) => setFormData({ ...formData, playerId: e.target.value })}
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-3 px-2">اسم اللاعب (الاسم في اللعبة)</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="أدخل اسمك داخل اللعبة للتأكد" 
                        className="w-full bg-neutral-950 border border-neutral-800 text-white px-6 py-5 rounded-[1.5rem] focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold"
                        value={formData.playerName}
                        onChange={(e) => setFormData({ ...formData, playerName: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">البريد الإلكتروني</label>
                        <input 
                          type="email" 
                          required 
                          placeholder="address@email.com"
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors text-left"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">رقم الجوال</label>
                        <input 
                          type="tel" 
                          required 
                          placeholder="05xxxxxxx"
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors text-left"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4 px-2">طريقة الدفع</label>
                      <div className="grid grid-cols-1 gap-3">
                        {currency === 'SAR' && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, paymentMethod: 'fatora' })}
                            className={`flex items-center justify-between p-5 rounded-3xl border ${formData.paymentMethod === 'fatora' ? 'bg-amber-500 text-black border-amber-500' : 'bg-neutral-950 border-neutral-800 text-white'} transition-all`}
                          >
                            <div className="flex items-center gap-3">
                              <ShieldCheck className="w-6 h-6" />
                              <div className="text-right">
                                <p className="font-bold">دفع إلكتروني آمن</p>
                                <p className={`text-[10px] ${formData.paymentMethod === 'fatora' ? 'text-black/60' : 'text-neutral-500'}`}>مدى، أبل باي، فيزا، ماستر كارد</p>
                              </div>
                            </div>
                            <CheckCircle2 className={`w-6 h-6 ${formData.paymentMethod === 'fatora' ? 'opacity-100' : 'opacity-0'}`} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, paymentMethod: currency === 'SDG' ? 'bok' : 'al_rajhi' })}
                          className={`flex items-center justify-between p-5 rounded-3xl border ${formData.paymentMethod !== 'fatora' ? 'bg-amber-500 text-black border-amber-500' : 'bg-neutral-950 border-neutral-800 text-white'} transition-all`}
                        >
                          <div className="flex items-center gap-3">
                            <Wallet className="w-6 h-6" />
                            <div className="text-right">
                              <p className="font-bold">{currency === 'SDG' ? 'بنك الخرطوم (نطبيق بنكك)' : 'تحويل بنكي (الراجحي)'}</p>
                              <p className={`text-[10px] ${formData.paymentMethod !== 'fatora' ? 'text-black/60' : 'text-neutral-500'}`}>تحويل يدوي وإرفاق الإيصال</p>
                            </div>
                          </div>
                          <CheckCircle2 className={`w-6 h-6 ${formData.paymentMethod !== 'fatora' ? 'opacity-100' : 'opacity-0'}`} />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {formData.paymentMethod !== 'fatora' ? (
                        <motion.div 
                          key="manual-payment"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 p-6 bg-neutral-950 border border-neutral-800 rounded-3xl space-y-4"
                        >
                          <h4 className="text-amber-500 font-bold text-sm mb-2 border-b border-neutral-800 pb-2">بيانات التحويل</h4>
                          {formData.paymentMethod === 'bok' ? (
                            <>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-neutral-500">رقم الحساب:</span>
                                <span className="font-mono text-amber-500 font-bold">9800579</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-neutral-500">الاسم:</span>
                                <span className="font-bold">Mohmed Elmotaz</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex flex-col gap-1 text-sm">
                                <span className="text-neutral-500">رقم الحساب:</span>
                                <span className="font-mono text-white font-bold break-all">644000010006087618978</span>
                              </div>
                              <div className="flex flex-col gap-1 text-sm">
                                <span className="text-neutral-500">الآيبان (IBAN):</span>
                                <span className="font-mono text-xs text-white font-bold break-all">SA67 8000 0644 6080 1761 8978</span>
                              </div>
                              <div className="flex justify-between items-center text-sm pt-2">
                                <span className="text-neutral-500">الاسم:</span>
                                <span className="font-bold">محمد المعتز عابدين</span>
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
                              <div className={`w-full border-2 border-dashed ${
                                receipt ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-neutral-800 bg-neutral-900 group-hover:border-neutral-700'
                              } rounded-2xl py-6 flex flex-col items-center justify-center transition-all`}>
                                {receipt ? (
                                  <>
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                                    <span className="text-sm font-bold text-emerald-500">تم اختيار الإيصال ✓</span>
                                    <span className="text-[10px] text-neutral-500 mt-1">{receipt?.name}</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-8 h-8 text-neutral-600 mb-2 group-hover:text-neutral-400 transition-colors" />
                                    <span className="text-xs font-bold text-neutral-500">اختر صورة الإيصال</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="electronic-payment"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="mt-4 p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl text-center"
                        >
                          <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                          <h4 className="text-amber-500 font-bold mb-2">دفع إلكتروني فوري</h4>
                          <p className="text-sm text-neutral-400">سيتم توجيهك إلى صفحة الدفع الآمنة فور إتمام الطلب ليتم الشحن تلقائياً.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                ) : (
                  <div className="space-y-8 text-right pb-4">
                    <div className="p-6 bg-neutral-950 rounded-3xl border border-neutral-800 space-y-4">
                      <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                        <span className="text-neutral-500 text-sm">الباقة المختارة</span>
                        <span className="font-bold">{selectedPackage.amount} UC</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                        <span className="text-neutral-500 text-sm">معرف اللاعب</span>
                        <span className="font-mono text-white">{formData.playerId}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                        <span className="text-neutral-500 text-sm">اسم اللاعب</span>
                        <span className="text-white font-bold">{formData.playerName}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                        <span className="text-neutral-500 text-sm">وسيلة الدفع</span>
                        <span className="font-bold uppercase text-amber-500">{formData.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400 font-bold">الإجمالي</span>
                        <span className="text-amber-500 font-black text-2xl tracking-tight">
                          {currency === 'SDG' ? selectedPackage.price_sdg.toLocaleString() : selectedPackage.price_sar.toFixed(2)} {currency === 'SAR' ? 'ر.س' : 'ج.س'}
                        </span>
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
                    disabled={isSubmitting || formData.playerId.length < 5 || (formData.paymentMethod !== 'fatora' && !receipt)}
                    className="w-full bg-amber-500 text-black py-5 rounded-3xl font-black text-lg hover:bg-amber-400 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:grayscale"
                  >
                    {formData.playerId.length >= 5 ? 
                      (formData.paymentMethod === 'fatora' ? 'المتابعة للدفع الآمن' : 
                        (receipt ? 'تم التحويل ✓ إرسال الطلب' : 'ارفق الإيصال للمتابعة')) 
                      : 'أدخل معرف صحيح للمتابعة'}
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleOrder}
                      disabled={isSubmitting || (formData.paymentMethod !== 'fatora' && !receipt)}
                      className="w-full bg-amber-500 text-black py-5 rounded-3xl font-black text-lg hover:bg-amber-400 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] disabled:opacity-50"
                    >
                      {isSubmitting ? 'جاري الإرسال...' : 'تأكيد وإرسال الطلب'}
                    </button>
                    <button 
                      onClick={() => setCheckoutStep('details')}
                      disabled={isSubmitting}
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
        {orderSuccess && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            ></motion.div>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-[3rem] p-10 text-center relative z-10"
            >
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-3xl font-black mb-4 uppercase tracking-tight">تم الطلب بنجاح!</h3>
              <p className="text-neutral-400 mb-8" dir="rtl">
                تم استلام طلبك رقم <span className="text-white font-mono">{orderSuccess.id}</span> بنجاح. سيتم شحن الـ UC إلى المعرف <span className="text-white font-mono">{orderSuccess.playerId}</span> خلال دقائق.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => navigate(`/track?id=${orderSuccess.id}`)}
                  className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black hover:bg-amber-400 transition-colors"
                >
                  تتبع حالة الطلب الآن
                </button>
                <button 
                  onClick={() => setOrderSuccess(null)}
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
};

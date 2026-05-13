import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Phone,
  Wallet
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const TrackOrder = () => {
  const location = useLocation();
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      setOrderId(id);
      fetchOrder(id);
    }
  }, [location.search]);

  const fetchOrder = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const orderRef = doc(db, 'orders', id.trim());
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const data = orderSnap.data();
        setOrder({
          id: orderSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(data.createdAt || Date.now())
        });
      } else {
        setError('لم يتم العثور على الطلب. يرجى التأكد من رقم الطلب.');
      }
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء جلب بيانات الطلب. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(orderId);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const configs: any = {
      pending_verification: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', label: 'بانتظار التأكيد' },
      processing: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', label: 'جاري الشحن' },
      completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', label: 'مكتمل' },
      failed: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', label: 'فشل' }
    };
    const config = configs[status] || configs.pending_verification;
    return (
      <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </span>
    );
  };

  const InfoItem = ({ label, value, isMono = false }: { label: string, value: string, isMono?: boolean }) => (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1">{label}</span>
      <span className={`text-lg font-bold ${isMono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );

  const Step = ({ active, completed, label, icon }: { active: boolean, completed: boolean, label: string, icon: React.ReactNode }) => (
    <div className="relative z-10 flex flex-col items-center gap-3">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
        completed 
          ? 'bg-amber-500 border-amber-500 text-black' 
          : active 
            ? 'bg-neutral-900 border-amber-500 text-amber-500' 
            : 'bg-neutral-900 border-neutral-800 text-neutral-600'
      }`}>
        {completed ? <CheckCircle2 className="w-6 h-6" /> : icon}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-tighter ${active ? 'text-white' : 'text-neutral-600'}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black mb-6 tracking-tight">تتبع <span className="text-amber-500">طلبك</span></h1>
        <p className="text-neutral-400 max-w-lg mx-auto">
          أدخل رقم الطلب الخاص بك لمتابعة حالة الشحن في الوقت الفعلي. ستجد رقم الطلب في فاتورتك أو بريدك الإلكتروني.
        </p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-[3rem] p-10 md:p-16">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-12" dir="rtl">
          <div className="relative flex-1">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input 
              type="text" 
              placeholder="مثال: ORD-123-XYZ" 
              className="w-full bg-neutral-950 border border-neutral-800 rounded-3xl pr-16 pl-6 py-5 text-xl font-mono focus:outline-none focus:border-amber-500 transition-colors uppercase"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>
          <button 
            disabled={loading}
            className="bg-amber-500 text-black px-10 py-5 rounded-3xl font-black text-lg hover:bg-amber-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'تتبع الآن'}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500 font-medium"
              dir="rtl"
            >
              <AlertCircle className="w-6 h-6" />
              {error}
            </motion.div>
          )}

          {order && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              <div className="flex flex-wrap items-center justify-between gap-6 pb-10 border-b border-neutral-800" dir="rtl">
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 block mb-2">رقم الطلب</span>
                  <h3 className="text-3xl font-black font-mono tracking-tighter truncate max-w-[250px]">{order.id}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 block mb-2">الحالة الحالية</span>
                  <StatusBadge status={order.status} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-right" dir="rtl">
                <div className="space-y-6">
                  <InfoItem label="معرف اللاعب" value={order.playerId} isMono />
                  <InfoItem label="الباقة" value={`${order.amount} UC`} />
                </div>
                <div className="space-y-6">
                  <InfoItem label="وسيلة الدفع" value={order.paymentMethod.toUpperCase()} />
                  <InfoItem label="الإجمالي" value={`${order.price} ${order.currency}`} />
                  <InfoItem label="تاريخ الطلب" value={order.createdAt.toLocaleString()} />
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="mt-12 pt-12 border-t border-neutral-800">
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-neutral-800 -translate-y-1/2 z-0"></div>
                  <div 
                    className={`absolute top-1/2 left-0 h-1 bg-amber-500 -translate-y-1/2 z-0 transition-all duration-1000 ${
                      order.status === 'pending_verification' ? 'w-[15%]' : order.status === 'completed' ? 'w-full' : 'w-[50%]'
                    }`}
                  ></div>

                  <Step active completed icon={<Wallet className="w-5 h-5" />} label="تم الدفع" />
                  <Step active={order.status !== 'pending_verification'} completed={order.status === 'completed'} icon={<Clock className="w-5 h-5" />} label="جاري المعالجة" />
                  <Step active={order.status === 'completed'} completed={order.status === 'completed'} icon={<CheckCircle2 className="w-5 h-5" />} label="تم التسليم" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

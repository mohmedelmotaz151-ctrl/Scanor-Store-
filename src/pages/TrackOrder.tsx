import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Loader2, Package, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function TrackOrder() {
  const { language, t, dir } = useLanguage();
  const location = useLocation();
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    setError("");
    setOrder(null);
    
    try {
      const docRef = doc(db, "orders", id.trim());
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `orders/${id.trim()}`);
      }
      
      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        setOrder({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now())
        });
      } else {
        setError(t('order_not_found'));
      }
    } catch (err) {
      console.error(err);
      setError(t('order_fetch_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(orderId);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-20" dir={dir}>
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black mb-6 tracking-tight">
          {language === 'ar' ? (
            <>تتبع <span className="text-amber-500">طلبك</span></>
          ) : (
            <>Track <span className="text-amber-500">Your Order</span></>
          )}
        </h1>
        <p className="text-neutral-400 max-w-lg mx-auto">
          {t('track_order_desc')}
        </p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-[3rem] p-10 md:p-16">
        <form onSubmit={handleTrack} className={`flex flex-col md:flex-row gap-4 mb-12`} dir={dir}>
          <div className="relative flex-1">
            <Search className={`absolute ${language === 'ar' ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500`} />
            <input 
              type="text" 
              placeholder={t('order_id_placeholder')}
              className={`w-full bg-neutral-950 border border-neutral-800 rounded-3xl ${language === 'ar' ? 'pr-16 pl-6' : 'pl-16 pr-6'} py-5 text-xl font-mono focus:outline-none focus:border-amber-500 transition-colors uppercase`}
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>
          <button 
            disabled={loading}
            className="bg-amber-500 text-black px-10 py-5 rounded-3xl font-black text-lg hover:bg-amber-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : t('track_now_btn')}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500 font-medium"
              dir={dir}
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
              <div className={`flex flex-wrap items-center justify-between gap-6 pb-10 border-b border-neutral-800 ${language === 'ar' ? 'flex-row' : 'flex-row-reverse'}`} dir={dir}>
                <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 block mb-2">{t('order_id_label')}</span>
                  <h3 className="text-3xl font-black font-mono tracking-tighter truncate max-w-[250px]">{order.id}</h3>
                </div>
                <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 block mb-2">{t('current_status')}</span>
                  <StatusBadge status={order.status} t={t} />
                </div>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 ${language === 'ar' ? 'text-right' : 'text-left'}`} dir={dir}>
                <div className="space-y-6">
                  <DetailItem label={t('player_id')} value={order.playerId} isMono />
                  <DetailItem label={t('uc_unit')} value={`${order.amount || order.packageName || 0} ${t('uc_unit')}`} />
                </div>
                <div className="space-y-6">
                  <DetailItem label={t('payment_method_label')} value={(order.paymentMethod || "").toUpperCase()} />
                  <DetailItem label={t('total_label')} value={`${order.price} ${order.symbol || order.currency}`} />
                  <DetailItem label={t('order_date')} value={new Date(order.createdAt).toLocaleString()} />
                </div>
              </div>

              {/* Progress Tracker */}
              <div className="mt-12 pt-12 border-t border-neutral-800">
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-neutral-800 -translate-y-1/2 z-0" />
                  <div className={`absolute top-1/2 left-0 h-1 bg-amber-500 -translate-y-1/2 z-0 transition-all duration-1000 ${
                    order.status === 'pending_verification' ? 'w-[15%]' : order.status === 'completed' ? 'w-full' : 'w-[50%]'
                  }`} />
                  
                  <StepIcon active={true} completed={true} icon={<Clock className="w-5 h-5" />} label={t('step_paid')} />
                  <StepIcon active={order.status !== 'pending_verification'} completed={order.status === 'completed'} icon={<Package className="w-5 h-5" />} label={t('step_processing')} />
                  <StepIcon active={order.status === 'completed'} completed={order.status === 'completed'} icon={<CheckCircle2 className="w-5 h-5" />} label={t('step_delivered')} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: string, t: any }) {
  const styles: any = {
    pending_payment: "bg-red-500/10 text-red-500 border-red-500/20",
    pending_verification: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20"
  };

  const getLabel = (s: string) => {
    switch(s) {
      case 'pending_payment': return t('status_pending_payment');
      case 'pending_verification': return t('status_pending_verification');
      case 'processing': return t('status_processing');
      case 'completed': return t('status_completed');
      case 'failed': return t('status_failed');
      default: return s;
    }
  };

  return (
    <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || styles.pending_verification}`}>
      {getLabel(status)}
    </span>
  );
}

function DetailItem({ label, value, isMono = false }: any) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1">{label}</span>
      <span className={`text-lg font-bold ${isMono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function StepIcon({ active, completed, icon, label }: any) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-3">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
        completed ? 'bg-amber-500 border-amber-500 text-black' : active ? 'bg-neutral-900 border-amber-500 text-amber-500' : 'bg-neutral-900 border-neutral-800 text-neutral-600'
      }`}>
        {completed ? <CheckCircle2 className="w-6 h-6" /> : icon}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-tighter ${active ? 'text-white' : 'text-neutral-600'}`}>{label}</span>
    </div>
  );
}

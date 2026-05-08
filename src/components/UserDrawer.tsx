import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, LogOut, Wallet, ShoppingCart, Package, 
  History, User as UserIcon, ShieldCheck, 
  ChevronLeft, ChevronRight, Upload, CheckCircle2, 
  AlertCircle, Loader2, Plus, ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { 
  collection, query, where, orderBy, limit, 
  onSnapshot, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type View = 'menu' | 'wallet' | 'transactions' | 'orders' | 'cart' | 'charge';

export default function UserDrawer({ isOpen, onClose }: UserDrawerProps) {
  const { user, profile, logout } = useAuth();
  const { language, t, dir } = useLanguage();
  const { formatPrice, getSymbol, currency } = useCurrency();
  const [view, setView] = useState<View>('menu');
  const [activities, setActivities] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeBank, setChargeBank] = useState<'bok' | 'rajhi'>('bok');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isOpen) return;

    // Fetch Activities
    const qAct = query(
      collection(db, 'activities'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubAct = onSnapshot(qAct, (snap) => {
      setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Orders
    const qOrd = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubOrd = onSnapshot(qOrd, (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubAct();
      unsubOrd();
    };
  }, [user, isOpen]);

  const handleChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chargeAmount || !receipt) return;

    setLoading(true);
    try {
      // In a real app, upload image to storage first
      // For this demo, we'll store a placeholder URL or base64 equivalent
      // But we'll assume the URL is handled
      const receiptUrl = "https://placeholder.com/receipt.jpg"; 

      await addDoc(collection(db, 'wallet_requests'), {
        userId: user.uid,
        amount: parseFloat(chargeAmount),
        bank: chargeBank,
        receiptUrl,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setSuccess(t('charge_success'));
      setTimeout(() => {
        setSuccess(null);
        setView('menu');
        setChargeAmount('');
        setReceipt(null);
      }, 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'wallet_requests');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'wallet', icon: Wallet, label: t('wallet'), color: 'text-amber-500' },
    { id: 'transactions', icon: History, label: t('transactions'), color: 'text-blue-500' },
    { id: 'cart', icon: ShoppingCart, label: t('cart'), color: 'text-emerald-500' },
    { id: 'orders', icon: Package, label: t('current_orders'), color: 'text-purple-500' },
  ];

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div 
            initial={{ x: dir === 'rtl' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: dir === 'rtl' ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed inset-y-0 ${dir === 'rtl' ? 'left-0' : 'right-0'} w-full max-w-sm bg-neutral-950 border-l border-neutral-800 z-[101] shadow-2xl overflow-hidden flex flex-col`}
            dir={dir}
          >
            {/* Header */}
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center overflow-hidden">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-amber-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white leading-tight">{profile?.username || profile?.displayName || user.email?.split('@')[0]}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-amber-500 font-black uppercase tracking-widest mt-1">
                    <ShieldCheck className="w-3 h-3" />
                    {profile?.isAdmin ? 'ADMIN' : 'PLAYER'}
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar">
              <AnimatePresence mode="wait">
                {view === 'menu' && (
                  <motion.div 
                    key="menu"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Balance Card */}
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2rem] p-6 shadow-xl shadow-amber-500/10">
                      <p className="text-black/60 text-xs font-bold uppercase tracking-widest mb-1">{t('balance_label')}</p>
                      <h4 className="text-3xl font-black text-black mb-6">
                        {formatPrice(profile?.balance || 0)}
                      </h4>
                      <button 
                        onClick={() => setView('charge')}
                        className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-900 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        {t('charge_wallet')}
                      </button>
                    </div>

                    {/* Navigation Menu */}
                    <div className="grid grid-cols-1 gap-3">
                      {menuItems.map((item) => (
                        <button 
                          key={item.id}
                          onClick={() => setView(item.id as any)}
                          className="flex items-center justify-between p-4 bg-neutral-900/50 hover:bg-neutral-900 rounded-2xl border border-neutral-800 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 ${item.color}`}>
                              <item.icon className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-neutral-300 group-hover:text-white transition-colors">{item.label}</span>
                          </div>
                          {language === 'ar' ? <ChevronLeft className="w-4 h-4 text-neutral-600" /> : <ChevronRight className="w-4 h-4 text-neutral-600" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {view === 'wallet' && (
                   <motion.div 
                    key="wallet"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <button 
                      onClick={() => setView('menu')}
                      className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-sm font-bold mb-4"
                    >
                      {language === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                      رجوع
                    </button>
                    <h3 className="text-xl font-bold mb-4">{t('wallet')}</h3>
                    
                    <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800">
                      <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">{t('balance_label')}</p>
                      <h4 className="text-4xl font-black text-amber-500">{formatPrice(profile?.balance || 0)}</h4>
                    </div>

                    <div className="space-y-4">
                       <button 
                        onClick={() => setView('charge')}
                        className="w-full bg-amber-500 text-black py-5 rounded-2xl font-black text-lg shadow-lg shadow-amber-500/20"
                      >
                        {t('charge_wallet')}
                      </button>
                    </div>
                  </motion.div>
                )}

                {view === 'charge' && (
                  <motion.div 
                    key="charge"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <button 
                      onClick={() => setView('wallet')}
                      className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-sm font-bold"
                    >
                      {language === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                      رجوع
                    </button>

                    <h3 className="text-xl font-bold mb-4">{t('charge_wallet')}</h3>

                    {success ? (
                      <div className="p-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                        <p className="font-bold text-emerald-500">{success}</p>
                      </div>
                    ) : (
                      <form onSubmit={handleChargeSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            type="button"
                            onClick={() => setChargeBank('bok')}
                            className={`p-4 rounded-2xl border-2 transition-all text-center ${chargeBank === 'bok' ? 'border-amber-500 bg-amber-500/10' : 'border-neutral-800 bg-neutral-900 text-neutral-500'}`}
                          >
                            <span className="block text-sm font-black mb-1">BOK</span>
                            <span className="text-[10px] uppercase font-bold">{t('bok_account')}</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => setChargeBank('rajhi')}
                            className={`p-4 rounded-2xl border-2 transition-all text-center ${chargeBank === 'rajhi' ? 'border-amber-500 bg-amber-500/10' : 'border-neutral-800 bg-neutral-900 text-neutral-500'}`}
                          >
                            <span className="block text-sm font-black mb-1">AL RAJHI</span>
                            <span className="text-[10px] uppercase font-bold">{t('rajhi_account')}</span>
                          </button>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-3">
                          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{t('account_name')}</p>
                          <p className="font-bold text-white">محمد المعتز</p>
                          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-4">
                            {chargeBank === 'bok' ? t('account_number') : t('iban')}
                          </p>
                          <p className="font-mono text-amber-500 font-bold break-all">
                            {chargeBank === 'bok' ? '9800579' : 'SA67 8000 0644 6080 1761 8978'}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-neutral-500 px-2 uppercase tracking-widest">{t('amount_to_charge')}</label>
                          <div className="relative">
                            <input 
                              type="number"
                              required
                              placeholder="0.00"
                              value={chargeAmount}
                              onChange={(e) => setChargeAmount(e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-4 px-6 text-white font-mono text-lg focus:outline-none focus:border-amber-500 transition-colors"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-sm">
                              {getSymbol()}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-neutral-500 px-2 uppercase tracking-widest">{t('receipt_image')}</label>
                          <div 
                            onClick={() => document.getElementById('wallet-receipt')?.click()}
                            className={`p-6 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${receipt ? 'border-emerald-500 bg-emerald-500/5' : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900'}`}
                          >
                            <input 
                              id="wallet-receipt"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                            />
                            {receipt ? (
                              <>
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                <div className="text-center">
                                  <p className="text-sm font-bold text-emerald-500">تم اختيار الإيصال</p>
                                  <p className="text-[10px] text-neutral-500 truncate max-w-[200px]">{receipt.name}</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <Upload className="w-10 h-10 text-neutral-600" />
                                <p className="text-xs font-bold text-neutral-500">{t('click_attach')}</p>
                              </>
                            )}
                          </div>
                        </div>

                        <button 
                          type="submit"
                          disabled={loading || !chargeAmount || !receipt}
                          className="w-full bg-amber-500 text-black py-5 rounded-2xl font-black text-lg disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
                        >
                          {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : t('send_request')}
                        </button>
                      </form>
                    )}
                  </motion.div>
                )}

                {view === 'transactions' && (
                  <motion.div 
                    key="transactions"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <button 
                        onClick={() => setView('menu')}
                        className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-sm font-bold"
                      >
                        {language === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        رجوع
                      </button>
                      <h3 className="text-lg font-bold">{t('transactions')}</h3>
                    </div>

                    {activities.length === 0 ? (
                      <div className="text-center py-20 bg-neutral-900/30 rounded-3xl border border-neutral-800/50">
                        <History className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                        <p className="text-neutral-500 text-sm font-medium">{t('no_activities')}</p>
                      </div>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.id} className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 flex items-center justify-between group hover:border-neutral-700 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              activity.type === 'charge' ? 'bg-emerald-500/10 text-emerald-500' : 
                              activity.type === 'purchase' ? 'bg-amber-500/10 text-amber-500' : 
                              'bg-neutral-800 text-neutral-400'
                            }`}>
                              {activity.type === 'charge' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-white">{activity.description}</p>
                              <p className="text-[10px] text-neutral-500">{new Date(activity.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <p className={`font-black text-sm ${activity.type === 'charge' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {activity.type === 'charge' ? '+' : '-'}{currency === 'SDG' ? activity.amount.toLocaleString() : activity.amount.toFixed(2)}
                          </p>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}

                {view === 'orders' && (
                  <motion.div 
                    key="orders"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <button 
                        onClick={() => setView('menu')}
                        className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-sm font-bold"
                      >
                        {language === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        رجوع
                      </button>
                      <h3 className="text-lg font-bold">{t('current_orders')}</h3>
                    </div>

                    {orders.length === 0 ? (
                      <div className="text-center py-20 bg-neutral-900/30 rounded-3xl border border-neutral-800/50">
                        <Package className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                        <p className="text-neutral-500 text-sm font-medium">{t('no_orders')}</p>
                      </div>
                    ) : (
                      orders.map((order) => (
                        <div key={order.id} className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-black text-neutral-500 uppercase">#{order.id.slice(-8).toUpperCase()}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                              order.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                              'bg-amber-500/10 text-amber-500'
                            }`}>
                              {order.status.toUpperCase().replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-sm text-white">{order.amount} {t('uc_unit')}</p>
                              <p className="text-[10px] text-neutral-500">{order.playerId}</p>
                            </div>
                            <p className="font-black text-amber-500">{order.price} {order.symbol}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-neutral-800 bg-neutral-900/50">
              <button 
                onClick={() => { logout(); onClose(); }}
                className="w-full flex items-center justify-center gap-3 py-4 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all font-bold border border-transparent hover:border-red-500/20"
              >
                <LogOut className="w-5 h-5" />
                {t('logout')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

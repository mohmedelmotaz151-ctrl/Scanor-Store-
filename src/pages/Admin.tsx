import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ShoppingBag, 
  Users, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  ShieldAlert,
  Loader2,
  Package,
  Search
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export const Admin = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'reports'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().isAdmin) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    if (isAdmin !== true) return;

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const updateOrderStatus = async (id: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', id);
      await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
      alert('فشل في تحديث الحالة');
    }
  };

  if (isAdmin === null || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-black mb-2 uppercase tracking-tight text-white">Access Denied</h1>
        <p className="text-neutral-500 mb-8 max-w-md">عذراً، ليس لديك صلاحيات كافية للوصول إلى لوحة الإدارة. يرجى التواصل مع المسؤول.</p>
        <button onClick={() => navigate('/')} className="bg-neutral-900 border border-neutral-800 text-white px-8 py-3 rounded-2xl font-bold hover:bg-neutral-800 transition-colors">
          العودة للرئيسية
        </button>
      </div>
    );
  }

  const stats = {
    totalOrders: orders.length,
    pending: orders.filter(o => o.status === 'pending_verification').length,
    completed: orders.filter(o => o.status === 'completed').length,
    processing: orders.filter(o => o.status === 'processing').length
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-6 mb-12" dir="rtl">
        <div>
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <ShieldAlert className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-widest">لوحة تحكم الإدارة</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tight text-white">Store <span className="text-neutral-500">Management</span></h1>
        </div>
        
        <div className="flex gap-2 bg-neutral-900 p-1 rounded-2xl border border-neutral-800">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'orders' ? 'bg-amber-500 text-black' : 'text-neutral-500 hover:text-white'}`}
          >
            الطلبات
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'reports' ? 'bg-amber-500 text-black' : 'text-neutral-500 hover:text-white'}`}
          >
            التقارير
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12" dir="rtl">
        <StatCard title="إجمالي الطلبات" value={stats.totalOrders} icon={<ShoppingBag className="text-blue-500" />} />
        <StatCard title="بانتظار التأكيد" value={stats.pending} icon={<Clock className="text-amber-500" />} />
        <StatCard title="جاري الشحن" value={stats.processing} icon={<Loader2 className="text-emerald-500" />} />
        <StatCard title="مكتمل" value={stats.completed} icon={<CheckCircle2 className="text-emerald-500" />} />
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-neutral-800 bg-neutral-900/50 flex justify-between items-center" dir="rtl">
          <h3 className="font-bold text-xl uppercase tracking-tight w-full text-white">الطلبات الأخيرة</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right" dir="rtl">
            <thead>
              <tr className="bg-neutral-950/50 border-b border-neutral-800">
                <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500">رقم الطلب</th>
                <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500">اللاعب</th>
                <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500">الباقة</th>
                <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500">السعر</th>
                <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500">الحالة</th>
                <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="px-8 py-6 font-mono text-xs text-neutral-400 select-all">{order.id}</td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-neutral-200">ID: {order.playerId}</span>
                      <span className="text-[10px] text-neutral-600 truncate max-w-[150px]">{order.email}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="bg-neutral-800 px-3 py-1 rounded-lg text-xs font-bold text-white uppercase">{order.amount} UC</span>
                  </td>
                  <td className="px-8 py-6 font-bold text-amber-500">
                    <div className="flex flex-col">
                      <span>{order.price} {order.currency}</span>
                      <span className="text-[10px] text-neutral-500 uppercase">{order.paymentMethod}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-8 py-6 text-left">
                    <div className="flex items-center gap-4 justify-end">
                      {order.receiptImage && (
                        <button 
                          onClick={() => window.open(order.receiptImage, '_blank')}
                          className="bg-neutral-800 p-2 rounded-lg text-amber-500 hover:bg-neutral-700 transition-colors"
                          title="عرض الإيصال"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                      <select 
                        className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      >
                        <option value="pending_verification">بانتظار التأكيد</option>
                        <option value="processing">جاري الشحن</option>
                        <option value="completed">مكتمل</option>
                        <option value="failed">فشل</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) => (
  <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2rem] flex items-center justify-between">
    <div>
      <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 block mb-1">{title}</span>
      <span className="text-3xl font-black text-white">{value}</span>
    </div>
    <div className="w-12 h-12 bg-neutral-950 rounded-2xl flex items-center justify-center border border-neutral-800">
      {icon}
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const configs: any = {
    pending_verification: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', label: 'بانتظار التأكيد' },
    processing: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', label: 'جاري الشحن' },
    completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', label: 'مكتمل' },
    failed: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', label: 'فشل' }
  };
  const config = configs[status] || configs.pending_verification;
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
};

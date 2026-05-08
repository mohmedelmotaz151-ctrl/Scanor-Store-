import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, Clock, CheckCircle2, ShieldCheck, RefreshCw, User, Lock, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, collection, query, orderBy, onSnapshot, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'reports'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        if (!authLoading) navigate("/login");
        return;
      }
      
      try {
        const userRef = doc(db, "users", user.uid);
        let userSnap;
        try {
          userSnap = await getDoc(userRef);
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
        }
        
        if (userSnap && userSnap.exists() && userSnap.data().isAdmin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Admin check error:", err);
        setIsAdmin(false);
      }
    }
    if (!authLoading) checkAdmin();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin !== true) return;

    // Listen to orders
    const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(qOrders, 
      (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(), 
          createdAt: doc.data().createdAt?.toDate?.() || new Date() 
        })));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "orders")
    );

    // Listen to users
    const qUsers = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubUsers = onSnapshot(qUsers, 
      (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "users")
    );

    return () => {
      unsubOrders();
      unsubUsers();
    };
  }, [isAdmin]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const orderRef = doc(db, "orders", id);
      try {
        await updateDoc(orderRef, { status, updatedAt: Timestamp.now() });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `orders/${id}`);
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert("فشل في تحديث الحالة");
    }
  };

  const calculateProfits = (period: 'day' | 'month' | 'total') => {
    const now = new Date();
    const filtered = orders.filter(o => {
      if (o.status !== 'completed') return false;
      const date = new Date(o.createdAt);
      if (period === 'day') return date.toDateString() === now.toDateString();
      if (period === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      return true;
    });
    
    const revenue = filtered.reduce((acc, curr) => acc + (parseFloat(curr.price?.toString().replace(/,/g, '')) || 0), 0);
    return { revenue, count: filtered.length };
  };

  if (authLoading || (user && isAdmin === null)) {
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
        <h1 className="text-3xl font-black mb-2 tracking-tight uppercase text-white">Access Denied</h1>
        <p className="text-neutral-500 mb-8 max-w-md">عذراً، ليس لديك صلاحيات كافية للوصول إلى لوحة الإدارة. يرجى التواصل مع المسؤول.</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-neutral-900 border border-neutral-800 text-white px-8 py-3 rounded-2xl font-bold hover:bg-neutral-800 transition-colors"
        >
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
      <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-widest text-right" dir="rtl">لوحة تحكم الإدارة</span>
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
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'customers' ? 'bg-amber-500 text-black' : 'text-neutral-500 hover:text-white'}`}
          >
            العملاء
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'reports' ? 'bg-amber-500 text-black' : 'text-neutral-500 hover:text-white'}`}
          >
            التقارير
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard title="إجمالي الطلبات" value={stats.totalOrders} icon={<ShoppingBag className="text-blue-500" />} />
        <StatCard title="بانتظار التأكيد" value={stats.pending} icon={<Clock className="text-amber-500" />} />
        <StatCard title="جاري الشحن" value={stats.processing} icon={<RefreshCw className="text-emerald-500" />} />
        <StatCard title="مكتمل" value={stats.completed} icon={<CheckCircle2 className="text-emerald-500" />} />
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-neutral-800 bg-neutral-900/50 flex justify-between items-center">
          <h3 className="font-bold text-xl uppercase tracking-tight text-right w-full text-white" dir="rtl">
            {activeTab === 'orders' ? 'الطلبات الأخيرة' : activeTab === 'customers' ? 'قائمة العملاء' : 'تقارير المبيعات'}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          {activeTab === 'orders' ? (
            <table className="w-full text-left" dir="rtl">
              <thead>
                <tr className="bg-neutral-950/50 border-b border-neutral-800">
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">رقم الطلب</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">اللاعب</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">الباقة</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">السعر</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">الإيصال</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">الحالة</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-800/30 transition-colors text-right">
                    <td className="px-8 py-6 font-mono text-xs text-neutral-400 select-all">{order.id}</td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-200">{order.playerName}</span>
                        <span className="text-xs text-neutral-500">ID: {order.playerId}</span>
                        <span className="text-[10px] text-neutral-600">{order.email}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="bg-neutral-800 px-3 py-1 rounded-lg text-xs font-bold text-white">{order.amount} UC</span>
                    </td>
                    <td className="px-8 py-6 font-bold text-amber-500">
                      <div className="flex flex-col">
                        <span>{order.price} {order.symbol}</span>
                        <span className="text-[10px] text-neutral-500 uppercase">{order.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       {order.receiptUrl ? (
                         <a 
                           href={order.receiptUrl} 
                           target="_blank" 
                           rel="noreferrer"
                           className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 underline"
                         >
                           عرض الإيصال
                         </a>
                       ) : (
                         <span className="text-xs text-neutral-600 italic">لا يوجد</span>
                       )}
                    </td>
                    <td className="px-8 py-6">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-8 py-6 text-left">
                      <select 
                        className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                      >
                        <option value="pending_verification">بانتظار التأكيد</option>
                        <option value="processing">جاري الشحن</option>
                        <option value="completed">مكتمل</option>
                        <option value="failed">فشل</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'customers' ? (
            <table className="w-full text-left" dir="rtl">
              <thead>
                <tr className="bg-neutral-950/50 border-b border-neutral-800">
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">العميل</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">معلومات التواصل</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">تاريخ الانضمام</th>
                  <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-left">عدد الطلبات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-800/30 transition-colors text-right">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center text-xs font-bold">
                            {u.displayName?.[0] || u.email?.[0] || 'U'}
                          </div>
                        )}
                        <span className="font-bold text-white">{u.displayName || "بدون اسم"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs">
                      <div className="text-neutral-300">{u.email}</div>
                      <div className="text-neutral-500">{u.phoneNumber}</div>
                    </td>
                    <td className="px-8 py-6 text-xs text-neutral-500">
                      {new Date(u.createdAt?.toDate?.() || u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6 text-left font-bold text-amber-500">
                      {orders.filter(o => o.userId === u.id).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 space-y-12" dir="rtl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-black/20 p-8 rounded-3xl border border-neutral-800">
                  <h4 className="text-neutral-500 font-bold mb-4 uppercase text-xs tracking-widest">أرباح اليوم</h4>
                  <div className="text-4xl font-black text-emerald-500 mb-2">
                    {calculateProfits('day').revenue.toLocaleString()} <span className="text-sm font-normal">ر.س</span>
                  </div>
                  <p className="text-neutral-600 text-sm">{calculateProfits('day').count} طلبات مكتملة</p>
                </div>
                <div className="bg-black/20 p-8 rounded-3xl border border-neutral-800">
                  <h4 className="text-neutral-500 font-bold mb-4 uppercase text-xs tracking-widest">أرباح الشهر</h4>
                  <div className="text-4xl font-black text-amber-500 mb-2">
                    {calculateProfits('month').revenue.toLocaleString()} <span className="text-sm font-normal">ر.س</span>
                  </div>
                  <p className="text-neutral-600 text-sm">{calculateProfits('month').count} طلبات مكتملة</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
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
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    pending_verification: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20"
  };

  const labels: any = {
    pending_verification: "بانتظار التأكيد",
    processing: "جاري الشحن",
    completed: "مكتمل",
    failed: "فشل"
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || styles.pending_verification}`}>
      {labels[status] || status}
    </span>
  );
}

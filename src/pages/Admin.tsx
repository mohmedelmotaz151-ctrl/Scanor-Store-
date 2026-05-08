import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TrendingUp, ShoppingBag, Clock, CheckCircle2, ShieldCheck, RefreshCw, ExternalLink, MessageSquare, User, Send, History, ArrowLeftRight } from "lucide-react";

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'orders' | 'support'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, statsRes, chatsRes, agentsRes] = await Promise.all([
        fetch("/api/admin/orders"),
        fetch("/api/admin/stats"),
        fetch("/api/admin/chats"),
        fetch("/api/admin/agents")
      ]);
      const ordersData = await ordersRes.json();
      const statsData = await statsRes.json();
      const chatsData = await chatsRes.json();
      const agentsData = await agentsRes.json();
      
      setOrders(ordersData.reverse());
      setStats(statsData);
      setChats(chatsData);
      setAgents(agentsData);

      if (selectedChat) {
        const updatedChat = chatsData.find((c: any) => c.id === selectedChat.id);
        if (updatedChat) setSelectedChat(updatedChat);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedChat?.id]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedChat) return;

    try {
      await fetch(`/api/chats/${selectedChat.userEmail}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "agent", text: replyMessage })
      });
      setReplyMessage("");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const assignAgent = async (email: string, agentName: string) => {
    try {
      await fetch(`/api/chats/${email}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "talking", assignedTo: agentName })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserOrders = async (email: string) => {
    try {
      const res = await fetch(`/api/admin/user-orders/${email}`);
      const data = await res.json();
      setUserOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedChat) {
      fetchUserOrders(selectedChat.userEmail);
    }
  }, [selectedChat?.id]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-widest text-right" dir="rtl">لوحة تحكم الإدارة</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tight">Store <span className="text-neutral-500">Management</span></h1>
        </div>
        <div className="flex gap-2 bg-neutral-900 p-1 rounded-2xl border border-neutral-800">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-amber-500 text-black' : 'text-neutral-500 hover:text-white'}`}
          >
            الطلبات
          </button>
          <button 
            onClick={() => setActiveTab('support')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'support' ? 'bg-amber-500 text-black' : 'text-neutral-500 hover:text-white'}`}
          >
            الدعم الفني
            {chats.filter(c => c.status === 'waiting').length > 0 && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'orders' ? (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <StatCard title="Total Earnings" value={(stats.totalEarnings || 0).toLocaleString()} icon={<TrendingUp className="text-emerald-500" />} />
                <StatCard title="Total Orders" value={stats.totalOrders || 0} icon={<ShoppingBag className="text-blue-500" />} />
                <StatCard title="Pending" value={stats.pendingOrders || 0} icon={<Clock className="text-amber-500" />} />
                <StatCard title="Completed" value={stats.completedOrders || 0} icon={<CheckCircle2 className="text-emerald-500" />} />
              </div>
            )}

            <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-neutral-800 bg-neutral-900/50 flex justify-between items-center">
                <h3 className="font-bold text-xl uppercase tracking-tight text-right w-full" dir="rtl">الطلبات الأخيرة</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left" dir="rtl">
                  <thead>
                    <tr className="bg-neutral-950/50 border-b border-neutral-800">
                      <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">رقم الطلب</th>
                      <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">بيانات اللاعب</th>
                      <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">الباقة</th>
                      <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">السعر</th>
                      <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">الحالة</th>
                      <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-neutral-500 text-left">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-neutral-800/30 transition-colors text-right">
                        <td className="px-8 py-6 font-mono text-sm">{order.id}</td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-neutral-200">ID: {order.playerId}</span>
                            <span className="text-xs text-neutral-500">{order.email}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="bg-neutral-800 px-3 py-1 rounded-lg text-xs font-bold">{order.packageName}</span>
                        </td>
                        <td className="px-8 py-6 font-bold text-amber-500">
                          {(order.price || 0).toLocaleString()} <span className="text-[10px] text-neutral-500">{order.currency || 'SAR'}</span>
                        </td>
                        <td className="px-8 py-6">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-8 py-6 text-left">
                          <div className="flex items-center justify-start gap-2">
                            <select 
                              className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1 text-xs focus:outline-none focus:border-amber-500"
                              value={order.status}
                              onChange={(e) => updateStatus(order.id, e.target.value)}
                            >
                              <option value="pending">معلق</option>
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
          </motion.div>
        ) : (
          <motion.div
            key="support"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[700px]"
          >
            {/* Conversations List */}
            <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-neutral-800 bg-neutral-950/30 flex justify-between items-center" dir="rtl">
                 <h3 className="font-bold uppercase tracking-tight">المحادثات</h3>
                 <span className="px-3 py-1 bg-neutral-800 rounded-full text-[10px] font-black">{chats.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto" dir="rtl">
                {chats.map(chat => (
                  <button 
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full p-6 border-b border-neutral-800 flex items-center gap-4 hover:bg-neutral-800/50 transition-all text-right ${selectedChat?.id === chat.id ? 'bg-amber-500/10 border-r-4 border-r-amber-500' : ''}`}
                  >
                    <div className="w-12 h-12 bg-neutral-800 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <User className={`w-6 h-6 ${chat.status === 'waiting' ? 'text-red-500 animate-pulse' : 'text-neutral-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold truncate text-sm">{chat.userEmail}</span>
                        <span className="text-[8px] text-neutral-500 uppercase">{chat.status}</span>
                      </div>
                      <p className="text-xs text-neutral-500 truncate text-right">
                        {chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : "لا يوجد رسائل"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl">
              {selectedChat ? (
                <>
                  <div className="p-6 border-b border-neutral-800 bg-neutral-950/30 flex justify-between items-center" dir="rtl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{selectedChat.userEmail}</h4>
                        <p className="text-[10px] text-neutral-500">
                          {selectedChat.assignedTo ? `متصل مع: ${selectedChat.assignedTo}` : "بانتظار استلام المحادثة"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       {selectedChat.status === 'waiting' && (
                         <button 
                           onClick={() => assignAgent(selectedChat.userEmail, "المعتز")}
                           className="bg-emerald-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                         >
                           قبول
                         </button>
                       )}
                       <div className="relative group">
                         <button className="bg-neutral-800 p-2 rounded-xl hover:bg-neutral-700 transition-colors">
                           <ArrowLeftRight className="w-4 h-4 text-neutral-400" />
                         </button>
                         <div className="absolute top-full right-0 mt-2 w-48 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <div className="p-2 space-y-1">
                               <p className="text-[8px] font-black text-neutral-500 uppercase px-2 py-1">تحويل إلى</p>
                               {agents.map(agent => (
                                 <button 
                                   key={agent.id}
                                   onClick={() => assignAgent(selectedChat.userEmail, agent.name)}
                                   className="w-full text-right px-4 py-2 text-[10px] hover:bg-amber-500 hover:text-black rounded-lg transition-colors"
                                 >
                                   {agent.name}
                                 </button>
                               ))}
                            </div>
                         </div>
                       </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-950/20" dir="rtl">
                    {selectedChat.messages.map((m: any, i: number) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-neutral-800 border border-neutral-700' : 'bg-amber-500 text-black font-medium'}`}>
                          {m.text}
                          <div className="mt-1 text-[8px] opacity-50">{new Date(m.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleReply} className="p-6 bg-neutral-950/50 border-t border-neutral-800 flex gap-4" dir="rtl">
                    <input 
                      type="text"
                      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-amber-500"
                      placeholder="اكتب ردك هنا..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                    />
                    <button className="bg-amber-500 text-black p-4 rounded-2xl shadow-lg hover:scale-105 transition-transform">
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
                  <MessageSquare className="w-16 h-16 opacity-20 mb-4" />
                  <p>اختر محادثة للبدء</p>
                </div>
              )}
            </div>

            {/* Profile/History Panel */}
            <div className="lg:col-span-3 bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8 flex flex-col overflow-hidden shadow-2xl">
              {selectedChat ? (
                <div className="space-y-8" dir="rtl">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-neutral-800 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-neutral-700 shadow-xl">
                      <User className="w-10 h-10 text-amber-500" />
                    </div>
                    <h3 className="font-black text-lg truncate mb-1">{selectedChat.userEmail}</h3>
                    <span className="text-[10px] px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full font-black uppercase tracking-widest">Customer</span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-amber-500 mb-2">
                       <History className="w-4 h-4" />
                       <h4 className="text-xs font-black uppercase tracking-widest">تاريخ الطلبات</h4>
                    </div>
                    <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                      {userOrders.length > 0 ? userOrders.map(order => (
                        <div key={order.id} className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 group hover:border-amber-500/50 transition-colors">
                           <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-mono text-neutral-400">#{order.id}</span>
                              <StatusBadge status={order.status} />
                           </div>
                           <h5 className="font-bold text-sm mb-1">{order.packageName}</h5>
                           <div className="flex justify-between items-center text-[10px]">
                              <span className="text-amber-500 font-black">{order.price} {order.currency}</span>
                              <span className="text-neutral-600">{new Date(order.createdAt).toLocaleDateString()}</span>
                           </div>
                        </div>
                      )) : (
                        <p className="text-center text-xs text-neutral-600 py-4">لا توجد طلبات سابقة</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
                  <User className="w-16 h-16 opacity-20 mb-4" />
                  <p className="text-xs text-center px-4">حدد محادثة لعرض تفاصيل العميل</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2rem] flex items-center justify-between">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 block mb-1">{title}</span>
        <span className="text-3xl font-black">{value}</span>
      </div>
      <div className="w-12 h-12 bg-neutral-950 rounded-2xl flex items-center justify-center border border-neutral-800">
        {icon}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20"
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>
      {status}
    </span>
  );
}

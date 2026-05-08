import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isEmailSubmitted, setIsEmailSubmitted] = useState(false);
  const [chatData, setChatData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchChat = async (targetEmail: string) => {
    try {
      const res = await fetch(`/api/chats/${targetEmail}`);
      const data = await res.json();
      setChatData(data);
      setIsEmailSubmitted(true);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isEmailSubmitted) {
      const interval = setInterval(() => fetchChat(email), 5000); // Polling for updates
      return () => clearInterval(interval);
    }
  }, [isEmailSubmitted, email]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatData?.messages]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      fetchChat(email);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userText = message;
    setMessage("");
    setLoading(true);

    try {
      // 1. Save user message
      await fetch(`/api/chats/${email}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", text: userText })
      });

      // 2. If AI mode, get AI response
      if (chatData?.status === "active") {
        const aiRes = await fetch("/api/support/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: userText, 
            history: chatData.messages.map((m: any) => ({ role: m.role, parts: [{ text: m.text }] })) 
          })
        });
        const aiData = await aiRes.json();
        
        await fetch(`/api/chats/${email}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "model", text: aiData.text })
        });
      }

      fetchChat(email);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const requestHuman = async () => {
    setLoading(true);
    try {
      await fetch(`/api/chats/${email}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "waiting" })
      });
      fetchChat(email);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]" dir="rtl">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-[350px] md:w-[400px] h-[580px] bg-neutral-900 border border-neutral-800 rounded-[2.8rem] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-neutral-800 flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-full bg-amber-500/5 pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Bot className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h4 className="font-bold text-white leading-tight">سكانور للدعم</h4>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-neutral-400 uppercase font-black tracking-widest">
                      {chatData?.status === 'talking' ? `متصل مع ${chatData.assignedTo}` : chatData?.status === 'waiting' ? 'بانتظار العميل...' : 'مساعد ذكي'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-neutral-700 rounded-xl transition-colors relative z-10"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Content */}
            {!isEmailSubmitted ? (
              <div className="flex-1 p-8 flex flex-col justify-center items-center text-center space-y-6">
                <div className="w-20 h-20 bg-neutral-800 rounded-3xl flex items-center justify-center mb-4">
                   <MessageSquare className="w-10 h-10 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">الدعم الفني المباشر</h3>
                  <p className="text-sm text-neutral-500">تحدث مباشرة مع محمد المعتز عبر واتساب لحل أي مشكلة أو استفسار</p>
                </div>
                <a 
                  href="https://wa.me/966552232752" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full bg-emerald-500 text-black py-5 rounded-2xl font-black text-center flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
                >
                  <MessageSquare className="w-5 h-5" />
                  تحدث عبر واتساب
                </a>
                <button 
                  onClick={() => setIsEmailSubmitted(true)}
                  className="text-xs text-neutral-500 hover:text-white transition-colors underline"
                >
                  أو استخدم المحادثة الكتابية هنا
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-950/50">
                  {chatData?.messages.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                      <Bot className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                      <p className="text-sm">كيف يمكنني مساعدتك اليوم؟</p>
                    </div>
                  )}
                  {chatData?.messages.map((msg: any, i: number) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-amber-500 text-black font-medium rounded-tr-none' 
                          : 'bg-neutral-800 text-neutral-200 rounded-tl-none border border-neutral-700'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-end">
                      <div className="bg-neutral-800 p-3 rounded-2xl">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-neutral-900 border-t border-neutral-800 space-y-4">
                  {chatData?.status === 'active' && (
                    <button 
                      onClick={requestHuman}
                      className="w-full py-2 text-[10px] uppercase font-black tracking-widest text-amber-500/60 hover:text-amber-500 transition-colors border border-amber-500/10 rounded-lg"
                    >
                      التحدث مع موظف خدمة العملاء
                    </button>
                  )}
                  {chatData?.status === 'waiting' && (
                    <div className="text-center py-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                      <p className="text-[10px] text-amber-500 font-bold animate-pulse">جاري البحث عن موظف متاح...</p>
                    </div>
                  )}
                  
                  <form onSubmit={handleSend} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="اكتب رسالتك..."
                      className="flex-1 bg-neutral-800 border-none rounded-2xl px-5 py-3 text-sm focus:ring-1 focus:ring-amber-500"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button className="p-3 bg-amber-500 text-black rounded-2xl shadow-lg hover:bg-amber-400 transition-all">
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-amber-500 rounded-full shadow-[0_10px_40px_rgba(245,158,11,0.4)] flex items-center justify-center group"
      >
        {isOpen ? <X className="w-8 h-8 text-black" /> : <MessageSquare className="w-8 h-8 text-black group-hover:rotate-12 transition-transform" />}
      </motion.button>
    </div>
  );
}

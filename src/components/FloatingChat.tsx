import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, User, Bot, Loader2, Phone } from 'lucide-react';

export const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'selection' | 'chat'>('selection');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
        })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="floating-chat-container" className="fixed bottom-6 right-6 z-[100]" dir="rtl">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="chat-window"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-[350px] md:w-[400px] h-[580px] bg-neutral-900 border border-neutral-800 rounded-[2.8rem] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-neutral-800 flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-full bg-amber-500/5 pointer-events-none"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <MessageCircle className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h4 className="font-bold text-white leading-tight">سكانور للدعم</h4>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] text-neutral-400 uppercase font-black tracking-widest">مساعد ذكي</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-neutral-700 rounded-xl transition-colors relative z-10">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {mode === 'selection' ? (
              <div className="flex-1 p-8 flex flex-col justify-center items-center text-center space-y-6">
                <div className="w-20 h-20 bg-neutral-800 rounded-3xl flex items-center justify-center mb-4">
                  <Phone className="w-10 h-10 text-amber-500" />
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
                  <Phone className="w-5 h-5" />
                  تحدث عبر واتساب
                </a>
                <button 
                  onClick={() => setMode('chat')}
                  className="text-xs text-neutral-500 hover:text-white transition-colors underline"
                >
                  أو استخدم المحادثة الكتابية هنا
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-950/50">
                  {messages.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                      <MessageCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                      <p className="text-sm">كيف يمكنني مساعدتك اليوم؟</p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                        m.role === 'user' 
                          ? 'bg-amber-500 text-black font-medium rounded-tr-none' 
                          : 'bg-neutral-800 text-neutral-200 rounded-tl-none border border-neutral-700'
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-end">
                      <div className="bg-neutral-800 p-3 rounded-2xl">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>

                <div className="p-4 bg-neutral-900 border-t border-neutral-800">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="اكتب رسالتك..."
                      className="flex-1 bg-neutral-800 border-none rounded-2xl px-5 py-3 text-sm focus:ring-1 focus:ring-amber-500 outline-none text-white"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
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
        {isOpen ? <X className="w-8 h-8 text-black" /> : <MessageCircle className="w-8 h-8 text-black group-hover:rotate-12 transition-transform" />}
      </motion.button>
    </div>
  );
};

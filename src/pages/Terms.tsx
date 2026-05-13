import React from 'react';
import { motion } from 'motion/react';
import { FileText, Shield, AlertTriangle, Scale } from 'lucide-react';

export const Terms = () => {
  return (
    <div className="min-h-screen bg-neutral-950 pt-20 pb-32">
      <div className="max-w-4xl mx-auto px-6" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-widest mb-6">
            <FileText className="w-4 h-4" />
            السياسات القانونية
          </div>
          <h1 className="text-5xl font-black mb-6 tracking-tight text-white">الشروط <span className="text-amber-500">والأحكام</span></h1>
          <p className="text-neutral-400 max-w-2xl mx-auto font-medium">
            يرجى قراءة شروط الخدمة بعناية قبل استخدام متجر سكانور لضمان تجربة شحن آمنة وموثوقة.
          </p>
        </motion.div>

        <div className="space-y-12 text-right">
          <section className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] p-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="text-black w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white">1. قبول الشروط</h2>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              باستخدامك لموقع أو تطبيق سكانور ستور، فأنت تقر بأنك قرأت وفهمت ووافقت على جميع الشروط والأحكام الواردة هنا. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام المتجر.
            </p>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] p-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="text-black w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white">2. دقة بيانات الشحن</h2>
            </div>
            <p className="text-neutral-400 leading-relaxed mb-4">
              المستخدم مسؤول مسؤولية كاملة عن صحة "معرف اللاعب" (Player ID) المدخل. 
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2 mr-4">
              <li>المتجر غير مسؤول عن شحن شدات لحساب خاطئ بسبب خطأ من المستخدم.</li>
              <li>بمجرد اكتمال عملية الشحن، لا يمكن التراجع عنها أو استرداد المبلغ.</li>
              <li>يرجى التأكد من أن الحساب متاح لاستقبال الشدات (غير محظور).</li>
            </ul>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] p-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Scale className="text-black w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white">3. سياسة الدفع والاسترداد</h2>
            </div>
            <p className="text-neutral-400 leading-relaxed mb-4">
              نحن نحرص على تقديم أفضل الأسعار بأقل عمولة (2% فقط).
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2 mr-4">
              <li>يتم تنفيذ الطلبات فور تأكيد عملية التحويل البنكي أو الدفع الإلكتروني.</li>
              <li>في حال فشل عملية الشحن لأسباب تقنية من جانب المتجر، يتم استرداد المبلغ كاملاً للعميل.</li>
              <li>عمليات التحويل البنكي تتطلب إرفاق صورة واضحة للإيصال للمراجعة اليدوية السريعة.</li>
            </ul>
          </section>

          <section className="bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] p-10">
            <h2 className="text-2xl font-black text-white mb-6">4. الخصوصية والأمان</h2>
            <p className="text-neutral-400 leading-relaxed">
              نحن لا نقوم بتخزين أي كلمات مرور أو بيانات حساسة خاصة بحسابات لعبة ببجي. نحن نطلب فقط الـ ID لإتمام عملية الشحن عبر النظام الرسمي. بياناتك الشخصية (الإيميل والجوال) تُستخدم فقط للتواصل معك بشأن طلبك.
            </p>
          </section>
        </div>

        <div className="mt-16 text-center text-neutral-600 text-sm">
          تاريخ آخر تحديث: 13 مايو 2026
        </div>
      </div>
    </div>
  );
};

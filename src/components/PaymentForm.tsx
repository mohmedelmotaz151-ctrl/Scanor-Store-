import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, ShieldCheck, CreditCard } from 'lucide-react';

interface PaymentFormProps {
  amount: string;
  currency: string;
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

export default function PaymentForm({ amount, currency, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    // Simulate Payment Processing for Scanor Store
    // In a real app, you would use stripe.confirmCardPayment(clientSecret, ...)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      onSuccess("pi_success_" + Math.random().toString(36).substr(2, 9));
    } catch (err) {
      setError("فشلت عملية الدفع. يرجى التحقق من بيانات البطاقة.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3" />
            Secure Payment
          </div>
          <div className="text-right">
            <div className="text-xs text-neutral-500 mb-1">المبلغ المطلوب</div>
            <div className="text-xl font-black">{amount} {currency}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-black/40 border border-neutral-800 rounded-2xl p-4">
            <CardElement 
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#fff',
                    '::placeholder': { color: '#404040' },
                    iconColor: '#f59e0b',
                  },
                },
              }}
            />
          </div>
          
          <div className="flex items-center gap-4 justify-center py-2 opacity-50 grayscale hover:grayscale-0 transition-all">
             <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Mada_Logo.svg" alt="Mada" className="h-4" />
             <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
             <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg" alt="Mastercard" className="h-4" />
             <img src="https://upload.wikimedia.org/wikipedia/commons/a/ad/Apple_Pay_logo.svg" alt="Apple Pay" className="h-4" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm text-center">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <button
          type="submit"
          disabled={!stripe || loading}
          className="w-full bg-amber-500 text-black py-5 rounded-3xl font-black text-lg hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(245,158,11,0.2)]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري المعالجة...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              دفع الآن
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-neutral-500 hover:text-white"
        >
          إلغاء العملية
        </button>
      </div>
      
      <p className="text-[10px] text-neutral-600 text-center uppercase tracking-widest leading-relaxed">
        By clicking pay, you agree to Scanor Store terms of service.<br />
        Encryption: AES-256 SSL Secured Protocol.
      </p>
    </form>
  );
}

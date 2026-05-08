import React, { createContext, useContext, useState, useEffect } from 'react';

export type Currency = 'SAR' | 'SDG' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (price: number) => string;
  getSymbol: () => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const RATES = {
  SAR: 1,
  SDG: 700, // تقريبي
  USD: 0.27
};

const SYMBOLS = {
  SAR: 'ر.س',
  SDG: 'ج.س',
  USD: '$'
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => {
    return (localStorage.getItem('user_currency') as Currency) || 'SAR';
  });

  useEffect(() => {
    localStorage.setItem('user_currency', currency);
  }, [currency]);

  const formatPrice = (basePrice: number) => {
    const converted = basePrice * RATES[currency];
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: currency === 'SDG' ? 0 : 2
    }).format(converted);
  };

  const getSymbol = () => SYMBOLS[currency];

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, getSymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

// Currency utilities for multi-currency support

export const CURRENCIES = {
  XOF: { code: 'XOF', symbol: 'FCFA', name: 'Franc CFA (BCEAO)', decimals: 0 },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA (BEAC)', decimals: 0 },
  NGN: { code: 'NGN', symbol: '₦', name: 'Naira', decimals: 2 },
  GHS: { code: 'GHS', symbol: '₵', name: 'Cedi', decimals: 2 },
  MAD: { code: 'MAD', symbol: 'DH', name: 'Dirham', decimals: 2 },
};

export type CurrencyCode = keyof typeof CURRENCIES;

export function formatCurrency(amount: number, currency: CurrencyCode = 'XOF'): string {
  const currencyInfo = CURRENCIES[currency];
  const formatted = amount.toFixed(currencyInfo.decimals);
  
  if (currency === 'XOF' || currency === 'XAF') {
    return `${formatted} ${currencyInfo.symbol}`;
  }
  
  return `${currencyInfo.symbol}${formatted}`;
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
}

export const PAYMENT_METHODS = {
  cash: { name: 'Espèces', icon: '💵' },
  mobile_money: { name: 'Mobile Money', icon: '📱' },
  credit: { name: 'Crédit Client', icon: '💳' },
  card: { name: 'Carte Bancaire', icon: '💳' },
};

export const MOBILE_MONEY_PROVIDERS = {
  mtn_money: { name: 'MTN Mobile Money', icon: '📱' },
  moov_money: { name: 'Moov Money', icon: '📱' },
  orange_money: { name: 'Orange Money', icon: '📱' },
  wave: { name: 'Wave', icon: '📱' },
};

export type PaymentMethod = keyof typeof PAYMENT_METHODS;
export type MobileMoneyProvider = keyof typeof MOBILE_MONEY_PROVIDERS;
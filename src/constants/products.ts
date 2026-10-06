import type { Product } from '@/types';

export const PRODUCTS: Product[] = [
  { id: 1, vip: 1, name: 'VIP 1 Legend One BMW', price: 30000, dailyIncome: 4500, totalIncome: 270000, term: 60 },
  { id: 2, vip: 2, name: 'VIP 2 Legend One BMW', price: 42000, dailyIncome: 9000, totalIncome: 540000, term: 60 },
  { id: 3, vip: 3, name: 'VIP 3 Legend One BMW', price: 50000, dailyIncome: 11000, totalIncome: 660000, term: 60 },
  { id: 4, vip: 4, name: 'VIP 4 Legend One BMW', price: 68000, dailyIncome: 15000, totalIncome: 900000, term: 60 },
  { id: 5, vip: 5, name: 'VIP 5 Legend One BMW', price: 80000, dailyIncome: 19800, totalIncome: 1188000, term: 60 },
  { id: 6, vip: 6, name: 'VIP 6 Legend One BMW', price: 100000, dailyIncome: 21000, totalIncome: 1260000, term: 60 },
  { id: 7, vip: 7, name: 'VIP 7 Legend One BMW', price: 150000, dailyIncome: 32500, totalIncome: 1950000, term: 60 },
  { id: 8, vip: 8, name: 'VIP 8 Legend One BMW', price: 250000, dailyIncome: 50000, totalIncome: 3000000, term: 60 },
  { id: 9, vip: 9, name: 'VIP 9 Legend One BMW', price: 300000, dailyIncome: 75000, totalIncome: 4500000, term: 60 },
  { id: 10, vip: 10, name: 'VIP 10 Legend One BMW', price: 550000, dailyIncome: 121000, totalIncome: 7260000, term: 60 },
  { id: 11, vip: 11, name: 'VIP 11 Legend One BMW', price: 800000, dailyIncome: 176000, totalIncome: 10560000, term: 60 },
  { id: 12, vip: 12, name: 'VIP 12 Legend One BMW', price: 1000000, dailyIncome: 200000, totalIncome: 12000000, term: 60 },
  { id: 13, vip: 13, name: 'VIP 13 Legend One BMW', price: 1500000, dailyIncome: 300000, totalIncome: 18000000, term: 60 },
];

export const REGISTRATION_BONUS = 9000;
export const CHECKIN_REWARD = 300;
export const MIN_DEPOSIT = 30000;
export const MIN_WITHDRAWAL = 9000;
export const WITHDRAWAL_FEE_RATE = 0.16;
export const MTN_ACCOUNT = '0756406186';
export const MTN_NAME = 'Nabakooza Milly';
export const AIRTEL_MERCHANT = '7232654';
export const AIRTEL_MERCHANT_NAME = 'Social Development Investors';
export const LEVEL1_RATE = 0.27;
export const LEVEL2_RATE = 0.02;
export const LEVEL3_RATE = 0.01;
export const TELEGRAM_LINK = 'https://t.me/+-dWGeVqFYhllZWY0';
export const CUSTOMER_SERVICE = '+966557067827';

export function formatUGX(n: number): string {
  return `UGX ${n.toLocaleString()}`;
}

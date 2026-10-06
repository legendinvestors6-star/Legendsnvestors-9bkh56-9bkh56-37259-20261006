export interface Product {
  id: number;
  vip: number;
  name: string;
  price: number;
  dailyIncome: number;
  totalIncome: number;
  term: number;
}

export interface BankCard {
  bank: string;
  holderName: string;
  accountNumber: string;
}

export interface User {
  id: string;
  phone: string;
  password: string;
  balance: number;
  cumulativeIncome: number;
  level: number;
  referralCode: string;
  referredBy?: string;
  checkInDays: number;
  lastCheckIn?: string;
  bankCard?: BankCard;
  createdAt: string;
  isAdmin?: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'recharge' | 'withdraw' | 'income' | 'bonus' | 'checkin' | 'referral';
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  description: string;
  createdAt: string;
}

export interface RechargeOrder {
  id: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  phoneNumber: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
  mtnAccount: string;
  mtnName: string;
}

export interface WithdrawOrder {
  id: string;
  userId: string;
  amount: number;
  receivedAmount: number;
  fee: number;
  bankCard: BankCard;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
}

export interface UserProduct {
  id: string;
  userId: string;
  productId: number;
  purchaseDate: string;
  endDate: string;
  totalEarned: number;
  status: 'active' | 'expired';
}

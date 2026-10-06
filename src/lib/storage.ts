import type { User, Transaction, RechargeOrder, WithdrawOrder, UserProduct } from '@/types';
import { REGISTRATION_BONUS, PRODUCTS, MTN_ACCOUNT, MTN_NAME } from '@/constants/products';

const KEYS = {
  USERS: 'legend_users',
  CURRENT_USER: 'legend_current_user',
  TRANSACTIONS: 'legend_transactions',
  RECHARGE_ORDERS: 'legend_recharge_orders',
  WITHDRAW_ORDERS: 'legend_withdraw_orders',
  USER_PRODUCTS: 'legend_user_products',
  GIFT_CODES: 'legend_gift_codes',
  PASSWORD_RESETS: 'legend_password_resets',
};

export interface PasswordResetRequest {
  id: string;
  phone: string;
  newPassword: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
  note?: string;
}

export interface GiftCode {
  id: string;
  code: string;
  amount: number;
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
  note?: string;
  expiresAt?: string;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function generateReferralCode(): string {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

const ADMIN_PHONE = '0746085840';
const ADMIN_PASSWORD = 'milly@2323';

function initAdmin() {
  const users = getUsers();
  const adminIdx = users.findIndex(u => u.isAdmin);
  if (adminIdx === -1) {
    const admin: User = {
      id: 'admin001',
      phone: ADMIN_PHONE,
      password: ADMIN_PASSWORD,
      balance: 0,
      cumulativeIncome: 0,
      level: 1,
      referralCode: 'ADMIN000',
      checkInDays: 0,
      createdAt: new Date().toISOString(),
      isAdmin: true,
    };
    saveUsers([...users, admin]);
  } else {
    // Migrate old credentials to new ones
    if (users[adminIdx].phone !== ADMIN_PHONE || users[adminIdx].password !== ADMIN_PASSWORD) {
      users[adminIdx].phone = ADMIN_PHONE;
      users[adminIdx].password = ADMIN_PASSWORD;
      saveUsers(users);
    }
  }
}

export function getUsers(): User[] {
  try {
    const data = localStorage.getItem(KEYS.USERS);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function saveUsers(users: User[]): void {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

export function getCurrentUser(): User | null {
  try {
    const id = localStorage.getItem(KEYS.CURRENT_USER);
    if (!id) return null;
    const users = getUsers();
    return users.find(u => u.id === id) || null;
  } catch { return null; }
}

export function setCurrentUser(userId: string | null): void {
  if (userId) {
    localStorage.setItem(KEYS.CURRENT_USER, userId);
  } else {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
}

export function updateUser(userId: string, updates: Partial<User>): User | null {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return users[idx];
}

export function registerUser(phone: string, password: string, referralCode?: string): { success: boolean; message: string; user?: User } {
  initAdmin();
  const users = getUsers();
  if (users.find(u => u.phone === phone)) {
    return { success: false, message: 'Phone number already registered' };
  }
  let referredBy: string | undefined;
  if (referralCode) {
    const referrer = users.find(u => u.referralCode === referralCode.toUpperCase());
    if (referrer) referredBy = referrer.id;
  }
  const newUser: User = {
    id: generateId(),
    phone,
    password,
    balance: REGISTRATION_BONUS,
    cumulativeIncome: 0,
    level: 1,
    referralCode: generateReferralCode(),
    referredBy,
    checkInDays: 0,
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, newUser]);
  addTransaction({
    userId: newUser.id,
    type: 'bonus',
    amount: REGISTRATION_BONUS,
    status: 'completed',
    description: 'Registration bonus reward',
  });
  return { success: true, message: 'Registration successful', user: newUser };
}

export function loginUser(phone: string, password: string): { success: boolean; message: string; user?: User } {
  initAdmin();
  const users = getUsers();
  const user = users.find(u => u.phone === phone && u.password === password);
  if (!user) return { success: false, message: 'Incorrect phone number or password' };
  setCurrentUser(user.id);
  return { success: true, message: 'Login successful', user };
}

export function getTransactions(userId?: string): Transaction[] {
  try {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    const all: Transaction[] = data ? JSON.parse(data) : [];
    return userId ? all.filter(t => t.userId === userId) : all;
  } catch { return []; }
}

export function addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  const transactions = getTransactions();
  const newTx: Transaction = {
    ...tx,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([newTx, ...transactions]));
  return newTx;
}

export function getRechargeOrders(userId?: string): RechargeOrder[] {
  try {
    const data = localStorage.getItem(KEYS.RECHARGE_ORDERS);
    const all: RechargeOrder[] = data ? JSON.parse(data) : [];
    return userId ? all.filter(o => o.userId === userId) : all;
  } catch { return []; }
}

export function createRechargeOrder(userId: string, amount: number, paymentMethod: string, phoneNumber: string): RechargeOrder {
  const orders = getRechargeOrders();
  const order: RechargeOrder = {
    id: generateId(),
    userId,
    amount,
    paymentMethod,
    phoneNumber,
    status: 'pending',
    createdAt: new Date().toISOString(),
    mtnAccount: MTN_ACCOUNT,
    mtnName: MTN_NAME,
  };
  localStorage.setItem(KEYS.RECHARGE_ORDERS, JSON.stringify([order, ...orders]));
  return order;
}

export function approveRechargeOrder(orderId: string): boolean {
  const orders = getRechargeOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;
  const order = orders[idx];
  if (order.status !== 'pending') return false;
  orders[idx].status = 'completed';
  localStorage.setItem(KEYS.RECHARGE_ORDERS, JSON.stringify(orders));
  const users = getUsers();
  const uIdx = users.findIndex(u => u.id === order.userId);
  if (uIdx !== -1) {
    users[uIdx].balance += order.amount;
    saveUsers(users);
  }
  addTransaction({
    userId: order.userId,
    type: 'recharge',
    amount: order.amount,
    status: 'completed',
    description: `Recharge via ${order.paymentMethod}`,
  });
  const referredUser = users[uIdx];
  if (referredUser?.referredBy) {
    const l1Commission = Math.floor(order.amount * 0.27);
    const rIdx = users.findIndex(u => u.id === referredUser.referredBy);
    if (rIdx !== -1) {
      users[rIdx].balance += l1Commission;
      users[rIdx].cumulativeIncome += l1Commission;
      saveUsers(users);
      addTransaction({
        userId: referredUser.referredBy,
        type: 'referral',
        amount: l1Commission,
        status: 'completed',
        description: `Level 1 referral commission from ${referredUser.phone}`,
      });
    }
  }
  return true;
}

export function rejectRechargeOrder(orderId: string): boolean {
  const orders = getRechargeOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;
  orders[idx].status = 'rejected';
  localStorage.setItem(KEYS.RECHARGE_ORDERS, JSON.stringify(orders));
  return true;
}

export function getWithdrawOrders(userId?: string): WithdrawOrder[] {
  try {
    const data = localStorage.getItem(KEYS.WITHDRAW_ORDERS);
    const all: WithdrawOrder[] = data ? JSON.parse(data) : [];
    return userId ? all.filter(o => o.userId === userId) : all;
  } catch { return []; }
}

export function createWithdrawOrder(userId: string, amount: number): { success: boolean; message: string; order?: WithdrawOrder } {
  const user = getUsers().find(u => u.id === userId);
  if (!user) return { success: false, message: 'User not found' };
  if (!user.bankCard) return { success: false, message: 'Please bind your bank card first' };
  const activeProducts = getUserProducts(userId).filter(p => p.status === 'active');
  if (activeProducts.length === 0) return { success: false, message: 'You must have at least one active product to withdraw' };
  if (amount < 6000) return { success: false, message: 'Minimum withdrawal is UGX 6,000' };
  if (amount > user.balance) return { success: false, message: 'Insufficient balance' };
  const fee = Math.floor(amount * 0.16);
  const received = amount - fee;
  const orders = getWithdrawOrders();
  const order: WithdrawOrder = {
    id: generateId(),
    userId,
    amount,
    receivedAmount: received,
    fee,
    bankCard: user.bankCard,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(KEYS.WITHDRAW_ORDERS, JSON.stringify([order, ...orders]));
  updateUser(userId, { balance: user.balance - amount });
  addTransaction({
    userId,
    type: 'withdraw',
    amount: -amount,
    status: 'pending',
    description: `Withdrawal to ${user.bankCard.bank} - ${user.bankCard.accountNumber}`,
  });
  return { success: true, message: 'Withdrawal submitted', order };
}

export function approveWithdrawOrder(orderId: string): boolean {
  const orders = getWithdrawOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;
  orders[idx].status = 'completed';
  localStorage.setItem(KEYS.WITHDRAW_ORDERS, JSON.stringify(orders));
  return true;
}

export function creditDailyIncome(userId: string): { credited: number; nextPayoutMs: number } {
  const user = getUsers().find(u => u.id === userId);
  if (!user) return { credited: 0, nextPayoutMs: 0 };
  const products = getUserProducts(userId).filter(p => p.status === 'active');
  if (products.length === 0) return { credited: 0, nextPayoutMs: 0 };

  const INCOME_KEY = `legend_last_income_${userId}`;
  const lastCreditStr = localStorage.getItem(INCOME_KEY);
  const lastCredit = lastCreditStr ? parseInt(lastCreditStr) : 0;
  const now = Date.now();
  const INTERVAL_MS = 24 * 60 * 60 * 1000;
  const nextPayoutMs = lastCredit + INTERVAL_MS - now;

  if (nextPayoutMs > 0) return { credited: 0, nextPayoutMs };

  let totalIncome = 0;
  for (const up of products) {
    const productDef = PRODUCTS.find(p => p.id === up.productId);
    if (productDef) totalIncome += productDef.dailyIncome;
  }
  if (totalIncome > 0) {
    const freshUser = getUsers().find(u => u.id === userId);
    if (freshUser) {
      updateUser(userId, { balance: freshUser.balance + totalIncome, cumulativeIncome: freshUser.cumulativeIncome + totalIncome });
      addTransaction({ userId, type: 'income', amount: totalIncome, status: 'completed', description: `Daily income from ${products.length} active product(s)` });
    }
  }
  localStorage.setItem(INCOME_KEY, now.toString());
  return { credited: totalIncome, nextPayoutMs: INTERVAL_MS };
}

export function getNextPayoutMs(userId: string): number {
  const INCOME_KEY = `legend_last_income_${userId}`;
  const lastCreditStr = localStorage.getItem(INCOME_KEY);
  const lastCredit = lastCreditStr ? parseInt(lastCreditStr) : 0;
  const INTERVAL_MS = 24 * 60 * 60 * 1000;
  const ms = lastCredit + INTERVAL_MS - Date.now();
  return Math.max(0, ms);
}

export function rejectWithdrawOrder(orderId: string): boolean {
  const orders = getWithdrawOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;
  const order = orders[idx];
  orders[idx].status = 'rejected';
  localStorage.setItem(KEYS.WITHDRAW_ORDERS, JSON.stringify(orders));
  const user = getUsers().find(u => u.id === order.userId);
  if (user) updateUser(order.userId, { balance: user.balance + order.amount });
  return true;
}

export function getUserProducts(userId?: string): UserProduct[] {
  try {
    const data = localStorage.getItem(KEYS.USER_PRODUCTS);
    const all: UserProduct[] = data ? JSON.parse(data) : [];
    return userId ? all.filter(p => p.userId === userId) : all;
  } catch { return []; }
}

export function purchaseProduct(userId: string, productId: number, price: number, dailyIncome: number, term: number): { success: boolean; message: string } {
  const user = getUsers().find(u => u.id === userId);
  if (!user) return { success: false, message: 'User not found' };
  if (user.balance < price) return { success: false, message: 'Insufficient balance. Please recharge first.' };
  const products = getUserProducts();
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + term);
  const newProduct: UserProduct = {
    id: generateId(),
    userId,
    productId,
    purchaseDate: now.toISOString(),
    endDate: endDate.toISOString(),
    totalEarned: 0,
    status: 'active',
  };
  localStorage.setItem(KEYS.USER_PRODUCTS, JSON.stringify([...products, newProduct]));
  updateUser(userId, { balance: user.balance - price });
  addTransaction({
    userId,
    type: 'recharge',
    amount: -price,
    status: 'completed',
    description: `Purchased VIP ${productId} Legend One BMW`,
  });
  return { success: true, message: 'Product purchased successfully' };
}

export function performCheckIn(userId: string): { success: boolean; message: string; reward?: number } {
  const user = getUsers().find(u => u.id === userId);
  if (!user) return { success: false, message: 'User not found' };
  const today = new Date().toDateString();
  if (user.lastCheckIn === today) return { success: false, message: 'Already checked in today' };
  const reward = 300;
  updateUser(userId, {
    balance: user.balance + reward,
    cumulativeIncome: user.cumulativeIncome + reward,
    checkInDays: user.checkInDays + 1,
    lastCheckIn: today,
  });
  addTransaction({
    userId,
    type: 'checkin',
    amount: reward,
    status: 'completed',
    description: 'Daily check-in reward',
  });
  return { success: true, message: 'Check-in successful', reward };
}

export function getTeamMembers(userId: string): { level1: User[]; level2: User[]; level3: User[] } {
  const users = getUsers();
  const level1 = users.filter(u => u.referredBy === userId);
  const level2 = users.filter(u => level1.some(l1 => l1.id === u.referredBy));
  const level3 = users.filter(u => level2.some(l2 => l2.id === u.referredBy));
  return { level1, level2, level3 };
}

export function getTeamCommissions(userId: string): { level1: number; level2: number; level3: number } {
  const txs = getTransactions(userId).filter(t => t.type === 'referral');
  return {
    level1: txs.filter(t => t.description.includes('Level 1')).reduce((sum, t) => sum + t.amount, 0),
    level2: txs.filter(t => t.description.includes('Level 2')).reduce((sum, t) => sum + t.amount, 0),
    level3: txs.filter(t => t.description.includes('Level 3')).reduce((sum, t) => sum + t.amount, 0),
  };
}

export function getGiftCodes(): GiftCode[] {
  try {
    const data = localStorage.getItem(KEYS.GIFT_CODES);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function createGiftCode(amount: number, note?: string, customCode?: string): GiftCode {
  const codes = getGiftCodes();
  // Auto-expire 30 minutes after creation
  const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const code: GiftCode = {
    id: generateId(),
    code: customCode ? customCode.toUpperCase() : Math.random().toString(36).substr(2, 8).toUpperCase(),
    amount,
    note,
    expiresAt: expiry,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(KEYS.GIFT_CODES, JSON.stringify([code, ...codes]));
  return code;
}

export function deleteGiftCode(codeId: string): void {
  const codes = getGiftCodes().filter(c => c.id !== codeId);
  localStorage.setItem(KEYS.GIFT_CODES, JSON.stringify(codes));
}

export function getPasswordResets(): PasswordResetRequest[] {
  try {
    const data = localStorage.getItem(KEYS.PASSWORD_RESETS);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function createPasswordReset(phone: string, newPassword: string): { success: boolean; message: string } {
  const users = getUsers();
  const user = users.find(u => u.phone === phone && !u.isAdmin);
  if (!user) return { success: false, message: 'No account found with this phone number' };
  const resets = getPasswordResets();
  // Check for existing pending request from same phone
  const existing = resets.find(r => r.phone === phone && r.status === 'pending');
  if (existing) return { success: false, message: 'A reset request is already pending for this account' };
  const req: PasswordResetRequest = {
    id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
    phone,
    newPassword,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(KEYS.PASSWORD_RESETS, JSON.stringify([req, ...resets]));
  return { success: true, message: 'Reset request submitted. Admin will verify and approve shortly.' };
}

export function getPasswordResetStatus(phone: string): PasswordResetRequest | null {
  const resets = getPasswordResets();
  // Return the latest request for this phone
  return resets.find(r => r.phone === phone) || null;
}

export function approvePasswordReset(resetId: string): boolean {
  const resets = getPasswordResets();
  const idx = resets.findIndex(r => r.id === resetId);
  if (idx === -1) return false;
  const req = resets[idx];
  if (req.status !== 'pending') return false;
  // Apply the new password
  const users = getUsers();
  const uIdx = users.findIndex(u => u.phone === req.phone);
  if (uIdx !== -1) {
    users[uIdx].password = req.newPassword;
    saveUsers(users);
  }
  resets[idx] = { ...req, status: 'approved', resolvedAt: new Date().toISOString() };
  localStorage.setItem(KEYS.PASSWORD_RESETS, JSON.stringify(resets));
  return true;
}

export function rejectPasswordReset(resetId: string, note?: string): boolean {
  const resets = getPasswordResets();
  const idx = resets.findIndex(r => r.id === resetId);
  if (idx === -1) return false;
  resets[idx] = { ...resets[idx], status: 'rejected', resolvedAt: new Date().toISOString(), note };
  localStorage.setItem(KEYS.PASSWORD_RESETS, JSON.stringify(resets));
  return true;
}

export function redeemGiftCode(userId: string, codeStr: string): { success: boolean; message: string; amount?: number } {
  const user = getUsers().find(u => u.id === userId);
  if (!user) return { success: false, message: 'User not found' };
  const codes = getGiftCodes();
  const idx = codes.findIndex(c => c.code === codeStr.toUpperCase() && !c.usedBy);
  if (idx === -1) return { success: false, message: 'Invalid or already used gift code' };
  const expiry = codes[idx].expiresAt;
  if (expiry && new Date(expiry) < new Date()) return { success: false, message: 'This gift code has expired' };
  const code = codes[idx];
  codes[idx] = { ...code, usedBy: userId, usedAt: new Date().toISOString() };
  localStorage.setItem(KEYS.GIFT_CODES, JSON.stringify(codes));
  updateUser(userId, { balance: user.balance + code.amount });
  addTransaction({ userId, type: 'bonus', amount: code.amount, status: 'completed', description: `Gift code redeemed: ${code.code}` });
  return { success: true, message: 'Gift code redeemed successfully!', amount: code.amount };
}

export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString()}`;
}

import type { User, Transaction, RechargeOrder, WithdrawOrder, UserProduct } from '@/types';
import { REGISTRATION_BONUS, PRODUCTS, MTN_ACCOUNT, MTN_NAME, LEVEL1_RATE, LEVEL2_RATE, LEVEL3_RATE, CHECKIN_REWARD } from '@/constants/products';
import { createClient } from '@supabase/supabase-js';

// Supabase for cloud
export const supabase = createClient(
  (import.meta as any).env?.VITE_SUPABASE_URL || '',
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''
);

const KEYS = {
  USERS: 'legend_users',
  CURRENT_USER: 'legend_current_user',
  TRANSACTIONS: 'legend_transactions',
  RECHARGE_ORDERS: 'legend_recharge_orders',
  WITHDRAW_ORDERS: 'legend_withdraw_orders',
  USER_PRODUCTS: 'legend_user_products',
  GIFT_CODES: 'legend_gift_codes',
  PASSWORD_RESETS: 'legend_password_resets',
  LAST_DAILY_CREDIT: 'legend_last_daily_credit',
};

export interface PasswordResetRequest { id: string; phone: string; newPassword: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string; resolvedAt?: string; note?: string; }
export interface GiftCode { id: string; code: string; amount: number; usedBy?: string; usedAt?: string; createdAt: string; note?: string; expiresAt?: string; }

function generateId(): string { return Math.random().toString(36).slice(2, 11) + Date.now().toString(36); }
function generateReferralCode(): string { return Math.random().toString(36).slice(2, 10).toUpperCase(); }

const ADMIN_PHONE = '0746085840';
const ADMIN_PASSWORD = 'milly@2323';

function safeParse<T>(s: string | null, fallback: T): T {
  try { return s ? JSON.parse(s) as T : fallback; } catch { return fallback; }
}

function initAdmin() {
  const users = getUsers();
  const adminIdx = users.findIndex((u: any) => u?.isAdmin);
  if (adminIdx === -1) {
    const admin: User = { id: 'admin001', phone: ADMIN_PHONE, password: ADMIN_PASSWORD, balance: 0, cumulativeIncome: 0, level: 1, referralCode: 'ADMIN000', checkInDays: 0, createdAt: new Date().toISOString(), isAdmin: true } as any;
    saveUsers([...users, admin]);
  }
}

export function getUsers(): User[] {
  return safeParse<User[]>(localStorage.getItem(KEYS.USERS), []);
}
export function saveUsers(users: User[]): void {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

export function getCurrentUser(): User | null {
  try {
    const supaRaw = localStorage.getItem('legend_user');
    if (supaRaw) {
      const u: any = JSON.parse(supaRaw);
      if (!u || !u.id) return null;
      return {
        id: u.id,
        phone: u.phone,
        password: u.password || '',
        balance: Number(u.balance || 0),
        cumulativeIncome: Number(u.cumulativeIncome || 0) || 0,
        level: u.level || 1,
        referralCode: u.referral_code || u.referralCode || '',
        referredBy: u.referred_by || u.referredBy || undefined,
        checkInDays: u.checkInDays || 0,
        lastCheckIn: u.lastCheckIn || undefined,
        createdAt: u.created_at || new Date().toISOString(),
        isAdmin: u.phone === ADMIN_PHONE || u.is_admin || u.isAdmin || false,
        bankCard: u.bankCard || null,
      } as User;
    }
    const id = localStorage.getItem(KEYS.CURRENT_USER);
    if (!id) return null;
    return getUsers().find(u => u.id === id) || null;
  } catch { return null; }
}

export function setCurrentUser(user: any): void {
  if (!user) {
    localStorage.removeItem('legend_user');
    localStorage.removeItem(KEYS.CURRENT_USER);
  } else if (typeof user === 'string') {
    localStorage.setItem(KEYS.CURRENT_USER, user);
  } else {
    localStorage.setItem('legend_user', JSON.stringify(user));
    if (user.id) localStorage.setItem(KEYS.CURRENT_USER, user.id);
  }
}

export function updateUser(userId: string, updates: Partial<User>): User | null {
  try {
    const raw = localStorage.getItem('legend_user');
    if (raw) {
      const u = JSON.parse(raw) as any;
      if (u.id === userId) {
        const updated = { ...u, ...updates, balance: (updates as any).balance ?? u.balance } as any;
        if ((updates as any).referralCode) updated.referral_code = (updates as any).referralCode;
        if ((updates as any).lastCheckIn) updated.lastCheckIn = (updates as any).lastCheckIn;
        if ((updates as any).checkInDays !== undefined) updated.checkInDays = (updates as any).checkInDays;
        if ((updates as any).cumulativeIncome !== undefined) updated.cumulativeIncome = (updates as any).cumulativeIncome;
        localStorage.setItem('legend_user', JSON.stringify(updated));
      }
    }
  } catch {}
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return users[idx];
}

export function formatUGX(amount: number): string {
  try { return `UGX ${(Number(amount) || 0).toLocaleString()}`; } catch { return `UGX ${amount}`; }
}

export function registerUser(phone: string, password: string, referralCode?: string): { success: boolean; message: string; user?: User } {
  initAdmin();
  const users = getUsers();
  if (users.find(u => u.phone === phone)) return { success: false, message: 'Phone number already registered' };
  let referredBy: string | undefined;
  if (referralCode) {
    const referrer = users.find(u => u.referralCode === referralCode.toUpperCase());
    if (referrer) referredBy = referrer.id;
  }
  const newUser: User = { id: generateId(), phone, password, balance: REGISTRATION_BONUS || 0, cumulativeIncome: 0, level: 1, referralCode: generateReferralCode(), referredBy, checkInDays: 0, createdAt: new Date().toISOString(), isAdmin: false } as any;
  saveUsers([...users, newUser]);
  addTransaction({ userId: newUser.id, type: 'bonus', amount: REGISTRATION_BONUS || 0, status: 'completed', description: 'Registration bonus reward' } as any);
  return { success: true, message: 'Registration successful', user: newUser };
}

// FIXED: login with name OR phone + password
export function loginUser(identifier: string, password: string): { success: boolean; message: string; user?: User } {
  initAdmin();
  const users = getUsers();
  const id = identifier.trim().toLowerCase();
  const user = users.find(u => {
    const phoneMatch = u.phone === identifier.trim() || u.phone.toLowerCase() === id;
    const nameMatch = (u as any).name?.toLowerCase() === id || (u as any).username?.toLowerCase() === id || (u as any).fullName?.toLowerCase() === id;
    return phoneMatch || nameMatch;
  });
  if (!user) return { success: false, message: 'Incorrect phone/name or password' };
  if (user.password !== password) return { success: false, message: 'Incorrect password' };
  setCurrentUser(user as any);
  return { success: true, message: 'Login successful', user };
}

export function getTransactions(userId?: string): Transaction[] {
  const data = safeParse<Transaction[]>(localStorage.getItem(KEYS.TRANSACTIONS), []);
  if (!userId) return data;
  return data.filter(t => (t as any).userId === userId);
}
export function addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  const transactions = getTransactions();
  const newTx: Transaction = { ...tx, id: generateId(), createdAt: new Date().toISOString() } as any;
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([newTx, ...transactions]));
  return newTx;
}

export function getRechargeOrders(userId?: string): RechargeOrder[] {
  const all = safeParse<RechargeOrder[]>(localStorage.getItem(KEYS.RECHARGE_ORDERS), []);
  if (!userId) return all;
  return all.filter(o => (o as any).userId === userId);
}
export function createRechargeOrder(userId: string, amount: number, paymentMethod: string, phoneNumber: string): RechargeOrder {
  const orders = getRechargeOrders();
  const order: RechargeOrder = { id: generateId(), userId, amount, paymentMethod, phoneNumber, status: 'pending', createdAt: new Date().toISOString() } as any;
  localStorage.setItem(KEYS.RECHARGE_ORDERS, JSON.stringify([order, ...orders]));
  return order;
}
export function approveRechargeOrder(orderId: string): boolean {
  const orders = getRechargeOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;
  orders[idx].status = 'completed' as any;
  localStorage.setItem(KEYS.RECHARGE_ORDERS, JSON.stringify(orders));
  addTransaction({ userId: orders[idx].userId, type: 'recharge', amount: orders[idx].amount, status: 'completed', description: 'Recharge approved' } as any);
  updateUser(orders[idx].userId, { balance: ((orders[idx] as any).amount || 0) + (getUsers().find(u=>u.id===orders[idx].userId)?.balance || 0) } as any);
  return true;
}
export function rejectRechargeOrder(orderId: string): boolean {
  const orders = getRechargeOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;
  orders[idx].status = 'rejected' as any;
  localStorage.setItem(KEYS.RECHARGE_ORDERS, JSON.stringify(orders));
  return true;
}

export function getWithdrawOrders(userId?: string): WithdrawOrder[] { return safeParse<WithdrawOrder[]>(localStorage.getItem(KEYS.WITHDRAW_ORDERS), []).filter(o => !userId || (o as any).userId === userId); }
export function createWithdrawOrder(userId: string, amount: number): { success: boolean; message: string; order?: WithdrawOrder } {
  const user = getUsers().find(u => u.id === userId) || getCurrentUser();
  if (!user) return { success: false, message: 'User not found' };
  if (!(user as any).bankCard) return { success: false, message: 'No bank card linked' };
  if (amount < 9000) return { success: false, message: 'Minimum withdrawal is UGX 9,000' };
  if (amount > user.balance) return { success: false, message: 'Insufficient balance' };
  const fee = Math.floor(amount * 0.16);
  const received = amount - fee;
  const orders = getWithdrawOrders();
  const order: WithdrawOrder = { id: generateId(), userId, amount, receivedAmount: received, fee, bankCard: (user as any).bankCard, status: 'pending', createdAt: new Date().toISOString() } as any;
  localStorage.setItem(KEYS.WITHDRAW_ORDERS, JSON.stringify([order, ...orders]));
  updateUser(userId, { balance: user.balance - amount } as any);
  return { success: true, message: 'Withdrawal submitted', order };
}
export function approveWithdrawOrder(orderId: string): boolean {
  const orders = getWithdrawOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;
  orders[idx].status = 'completed' as any;
  localStorage.setItem(KEYS.WITHDRAW_ORDERS, JSON.stringify(orders));
  return true;
}
export function rejectWithdrawOrder(orderId: string): boolean {
  const orders = getWithdrawOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;
  const order = orders[idx];
  orders.splice(idx, 1);
  localStorage.setItem(KEYS.WITHDRAW_ORDERS, JSON.stringify(orders));
  updateUser(order.userId, { balance: ((getUsers().find(u=>u.id===order.userId)?.balance||0) + order.amount) } as any);
  return true;
}

export function getUserProducts(userId?: string): UserProduct[] { return safeParse<UserProduct[]>(localStorage.getItem(KEYS.USER_PRODUCTS), []).filter(p => !userId || (p as any).userId === userId); }
export function saveUserProducts(products: UserProduct[]): void { localStorage.setItem(KEYS.USER_PRODUCTS, JSON.stringify(products)); }

export function creditDailyIncome(userId: string): { credited: number } {
  try {
    const user = getUsers().find(u => u.id === userId);
    if (!user) return { credited: 0 };
    const products = getUserProducts(userId).filter(p => p.status === 'active');
    if (!products.length) return { credited: 0 };
    const dailySum = products.reduce((s, p) => s + ((p as any).dailyIncome || 0), 0);
    if (!dailySum) return { credited: 0 };
    const lastMap = safeParse<Record<string, number>>(localStorage.getItem(KEYS.LAST_DAILY_CREDIT), {});
    const last = lastMap[userId] || 0;
    const now = Date.now();
    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
    if (last >= startOfToday) return { credited: 0 };
    updateUser(userId, { balance: (user.balance || 0) + dailySum, cumulativeIncome: (user.cumulativeIncome || 0) + dailySum } as any);
    addTransaction({ userId, type: 'daily-income', amount: dailySum, status: 'completed', description: 'Daily product income' } as any);
    lastMap[userId] = now;
    localStorage.setItem(KEYS.LAST_DAILY_CREDIT, JSON.stringify(lastMap));
    return { credited: dailySum };
  } catch { return { credited: 0 }; }
}

export function getNextPayoutMs(userId?: string): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, next.getTime() - now.getTime());
}

export function performCheckIn(userId: string): { success: boolean; reward?: number; message?: string } {
  try {
    const user = getUsers().find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };
    const today = new Date().toDateString();
    if (user.lastCheckIn === today) return { success: false, message: 'Already checked in today' };
    const reward = CHECKIN_REWARD || 300;
    const newCheckInDays = (user.checkInDays || 0) + 1;
    updateUser(userId, { balance: (user.balance || 0) + reward, cumulativeIncome: (user.cumulativeIncome || 0) + reward, lastCheckIn: today, checkInDays: newCheckInDays } as any);
    addTransaction({ userId, type: 'checkin', amount: reward, status: 'completed', description: 'Daily check-in reward' } as any);
    return { success: true, reward };
  } catch (e) { return { success: false, message: 'Check-in failed' }; }
}

export function purchaseProduct(userId: string, productId: number, price: number, dailyIncome: number, term: number): { success: boolean; message: string } {
  const user = getUsers().find(u => u.id === userId) || getCurrentUser();
  if (!user) return { success: false, message: 'User not found' };
  if (user.balance < price) return { success: false, message: 'Insufficient balance' };
  updateUser(user.id, { balance: user.balance - price } as any);
  const products = getUserProducts(userId);
  const userProduct: UserProduct = { id: generateId(), userId, productId, price, dailyIncome, term, purchasedAt: new Date().toISOString(), status: 'active' } as any;
  saveUserProducts([userProduct, ...products]);
  addTransaction({ userId: userId, type: 'purchase', amount: price, status: 'completed', description: `Purchased product ${productId}` } as any);
  return { success: true, message: 'Product purchased successfully' };
}

export function getGiftCodes(): GiftCode[] { return safeParse<GiftCode[]>(localStorage.getItem(KEYS.GIFT_CODES), []); }
export function createGiftCode(amount: number, note?: string, expiresAt?: string): GiftCode {
  const codes = getGiftCodes();
  const codeObj: GiftCode = { id: generateId(), code: generateReferralCode(), amount, createdAt: new Date().toISOString(), note: note || '', expiresAt } as any;
  localStorage.setItem(KEYS.GIFT_CODES, JSON.stringify([codeObj, ...codes]));
  return codeObj;
}
export function deleteGiftCode(id: string): boolean {
  const codes = getGiftCodes();
  const idx = codes.findIndex(c => c.id === id);
  if (idx === -1) return false;
  codes.splice(idx, 1);
  localStorage.setItem(KEYS.GIFT_CODES, JSON.stringify(codes));
  return true;
}

export function getPasswordResets(): PasswordResetRequest[] { return safeParse<PasswordResetRequest[]>(localStorage.getItem(KEYS.PASSWORD_RESETS), []); }
export function createPasswordResetRequest(phone: string, newPassword: string, note?: string): PasswordResetRequest {
  const reqs = getPasswordResets();
  const req: PasswordResetRequest = { id: generateId(), phone, newPassword, status: 'pending', createdAt: new Date().toISOString(), note };
  localStorage.setItem(KEYS.PASSWORD_RESETS, JSON.stringify([req, ...reqs]));
  return req;
}
export function approvePasswordReset(id: string): boolean {
  const reqs = getPasswordResets();
  const idx = reqs.findIndex(r => r.id === id);
  if (idx === -1) return false;
  reqs[idx].status = 'approved';
  reqs[idx].resolvedAt = new Date().toISOString();
  localStorage.setItem(KEYS.PASSWORD_RESETS, JSON.stringify(reqs));
  const req = reqs[idx];
  const users = getUsers();
  const uidx = users.findIndex(u => u.phone === req.phone);
  if (uidx !== -1) {
    users[uidx].password = req.newPassword;
    saveUsers(users);
    const supaRaw = localStorage.getItem('legend_user');
    if (supaRaw) {
      try { const su = JSON.parse(supaRaw); if (su.phone === req.phone) { su.password = req.newPassword; localStorage.setItem('legend_user', JSON.stringify(su)); } } catch {}
    }
  }
  return true;
}
export function rejectPasswordReset(id: string, note?: string): boolean {
  const reqs = getPasswordResets();
  const idx = reqs.findIndex(r => r.id === id);
  if (idx === -1) return false;
  reqs[idx].status = 'rejected';
  reqs[idx].resolvedAt = new Date().toISOString();
  reqs[idx].note = note || reqs[idx].note;
  localStorage.setItem(KEYS.PASSWORD_RESETS, JSON.stringify(reqs));
  return true;
}

export function getTeamMembers(userId: string) {
  const users = getUsers();
  const level1 = users.filter(u => u.referredBy === userId || (u as any).referred_by === userId);
  const level1Ids = level1.map(u => u.id);
  const level2 = users.filter(u => level1Ids.includes(u.referredBy as any) || level1Ids.includes((u as any).referred_by));
  const level2Ids = level2.map(u => u.id);
  const level3 = users.filter(u => level2Ids.includes(u.referredBy as any) || level2Ids.includes((u as any).referred_by));
  return { level1, level2, level3 };
}

export function getTeamCommissions(userId: string) {
  const { level1, level2, level3 } = getTeamMembers(userId);
  const sum = (arr: User[]) => arr.reduce((s, u) => s + (u.balance || 0), 0);
  const c1 = sum(level1) * (LEVEL1_RATE || 0.27);
  const c2 = sum(level2) * (LEVEL2_RATE || 0.02);
  const c3 = sum(level3) * (LEVEL3_RATE || 0.01);
  return { level1: Math.floor(c1), level2: Math.floor(c2), level3: Math.floor(c3) };
}

// --- FIX FOR BUILD ERROR D7thKo1Yq ---
export function createPasswordReset(phone: string, newPassword: string) {
  const users = getUsers();
  if (!users.find(u => u.phone === phone)) {
    return { success: false, message: 'Phone not registered' };
  }
  createPasswordResetRequest(phone, newPassword);
  return { success: true, message: 'Request submitted' };
}

export function getPasswordResetStatus(phone: string) {
  const all = getPasswordResets();
  const found = all
    .filter(r => r.phone === phone)
    .sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return found || null;
}
import type { User, Transaction, RechargeOrder, WithdrawOrder, UserProduct } from '@/types';
import { REGISTRATION_BONUS, PRODUCTS, MTN_ACCOUNT, MTN_NAME, LEVEL1_RATE, LEVEL2_RATE, LEVEL3_RATE, CHECKIN_REWARD } from '@/constants/products';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
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
  const users = safeParse<User[]>(localStorage.getItem(KEYS.USERS), []);
  if (users.length === 0) {
    try {
      const raw = localStorage.getItem('legend_user');
      if (raw) {
        const u = JSON.parse(raw) as any;
        if (u?.id) {
          return [{ id: u.id, phone: u.phone, password: u.password || '', balance: Number(u.balance || 0), cumulativeIncome: Number(u.cumulativeIncome || 0) || 0, level: u.level || 1, referralCode: u.referral_code || u.referralCode || '', referredBy: u.referred_by || u.referredBy || undefined, checkInDays: u.checkInDays || 0, lastCheckIn: u.lastCheckIn || undefined, createdAt: u.created_at || new Date().toISOString(), isAdmin: u.phone === ADMIN_PHONE || u.is_admin || u.isAdmin || false, bankCard: u.bankCard || null } as User];
        }
      }
    } catch {}
  }
  return users;
}
export function saveUsers(users: User[]): void { localStorage.setItem(KEYS.USERS, JSON.stringify(users)); }

export function getCurrentUser(): User | null {
  try {
    const supaRaw = localStorage.getItem('legend_user');
    if (supaRaw) {
      const u: any = JSON.parse(supaRaw);
      if (!u || !u.id) return null;
      return { id: u.id, phone: u.phone, password: u.password || '', balance: Number(u.balance || 0), cumulativeIncome: Number(u.cumulativeIncome || 0) || 0, level: u.level || 1, referralCode: u.referral_code || u.referralCode || '', referredBy: u.referred_by || u.referredBy || undefined, checkInDays: u.checkInDays || 0, lastCheckIn: u.lastCheckIn || undefined, createdAt: u.created_at || new Date().toISOString(), isAdmin: u.phone === ADMIN_PHONE || u.is_admin || u.isAdmin || false, bankCard: u.bankCard || null } as User;
    }
    const id = localStorage.getItem(KEYS.CURRENT_USER);
    if (!id) return null;
    return getUsers().find(u => u.id === id) || null;
  } catch { return null; }
}

export function setCurrentUser(user: any): void {
  if (!user) { localStorage.removeItem('legend_user'); localStorage.removeItem(KEYS.CURRENT_USER); }
  else if (typeof user === 'string') { localStorage.setItem(KEYS.CURRENT_USER, user); }
  else { localStorage.setItem('legend_user', JSON.stringify(user)); if (user.id) localStorage.setItem(KEYS.CURRENT_USER, user.id); }
}

export function updateUser(userId: string, updates: Partial<User>): User | null {
  try {
    const raw = localStorage.getItem('legend_user');
    if (raw) {
      const u = JSON.parse(raw) as any;
      if (u.id === userId) {
        const updated = { ...u, ...updates, balance: (updates as any).balance ?? u.balance, checkInDays: (updates as any).checkInDays ?? u.checkInDays, cumulativeIncome: (updates as any).cumulativeIncome ?? u.cumulativeIncome, lastCheckIn: (updates as any).lastCheckIn ?? u.lastCheckIn } as any;
        if ((updates as any).referralCode) updated.referral_code = (updates as any).referralCode;
        localStorage.setItem('legend_user', JSON.stringify(updated));
        let users = safeParse<User[]>(localStorage.getItem(KEYS.USERS), []);
        const idx = users.findIndex(x => x.id === userId);
        if (idx === -1) { users.push(updated as any); } else { users[idx] = { ...users[idx], ...updates } as any; }
        saveUsers(users);
        return updated as any;
      }
    }
  } catch {}
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) {
    const cur = getCurrentUser();
    if (cur && cur.id === userId) {
      const merged = { ...cur, ...updates } as User;
      saveUsers([...users, merged]);
      return merged;
    }
    return null;
  }
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return users[idx];
}

export function formatUGX(amount: number): string { try { return `UGX ${(Number(amount) || 0).toLocaleString()}`; } catch { return `UGX ${amount}`; } }

// FIXED: 9000 BONUS IMMEDIATELY ON REGISTER
export function registerUser(phone: string, password: string, referralCode?: string): { success: boolean; message: string; user?: User } {
  initAdmin(); 
  const users = getUsers(); 
  if (users.find(u => u.phone === phone)) return { success: false, message: 'Phone number already registered' };
  let referredBy: string | undefined; 
  if (referralCode) { const referrer = users.find(u => u.referralCode === referralCode.toUpperCase()); if (referrer) referredBy = referrer.id; }
  
  const BONUS = 9000;
  
  const newUser: User = { 
    id: generateId(), 
    phone, 
    password, 
    balance: BONUS,
    cumulativeIncome: 0, 
    level: 1, 
    referralCode: generateReferralCode(), 
    referredBy, 
    checkInDays: 0, 
    createdAt: new Date().toISOString(), 
    isAdmin: false 
  } as any;
  
  saveUsers([...users, newUser]); 
  addTransaction({ userId: newUser.id, type: 'bonus', amount: BONUS, status: 'completed', description: 'Registration bonus - UGX 9,000' } as any);
  setCurrentUser(newUser);
  
  return { success: true, message: 'Registration successful - UGX 9,000 bonus credited!', user: newUser };
}

export function loginUser(phone: string, password: string): { success: boolean; message: string; user?: User } {
  initAdmin(); const users = getUsers(); const user = users.find(u => u.phone === phone && u.password === password); if (!user) return { success: false, message: 'Incorrect phone number or password' }; setCurrentUser(user as any); return { success: true, message: 'Login successful', user };
}

export function getTransactions(userId?: string): Transaction[] { const data = safeParse<Transaction[]>(localStorage.getItem(KEYS.TRANSACTIONS), []); if (!userId) return data; return data.filter(t => (t as any).userId === userId); }
export function addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Transaction { const transactions = getTransactions(); const newTx: Transaction = { ...tx, id: generateId(), createdAt: new Date().toISOString() } as any; localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([newTx, ...transactions])); return newTx; }
export function getRechargeOrders(userId?: string): RechargeOrder[] { const all = safeParse<RechargeOrder[]>(localStorage.getItem(KEYS.RECHARGE_ORDERS), []); if (!userId) return all; return all.filter(o => (o as any).userId === userId); }
export function createRechargeOrder(userId: string, amount: number, paymentMethod: string, phoneNumber: string): RechargeOrder { const orders = getRechargeOrders(); const order: RechargeOrder = { id: generateId(), userId, amount, paymentMethod, phoneNumber, status: 'pending', createdAt: new Date().toISOString() } as any; localStorage.setItem(KEYS.RECHARGE_ORDERS, JSON.stringify([order, ...orders])); return order; }
export function approveRechargeOrder(orderId: string): boolean { const orders = getRechargeOrders(); const idx = orders.findIndex(o => o.id === orderId); if (idx === -1) return false; orders[idx].status = 'completed' as any; localStorage.setItem(KEYS.RECHARGE_ORDERS, JSON.stringify(orders)); addTransaction({ userId: orders[idx].userId, type: 'recharge', amount: orders[idx].amount, status: 'completed', description: 'Recharge approved - PesaJet' } as any); updateUser(orders[idx].userId, { balance: ((orders[idx] as any).amount || 0) + (getUsers().find(u=>u.id===orders[idx].userId)?.balance || 0) } as any); return true; }
export function rejectRechargeOrder(orderId: string): boolean { const orders = getRechargeOrders(); const idx = orders.findIndex(o => o.id === orderId); if (idx === -1) return false; orders[idx].status = 'rejected' as any; localStorage.setItem(KEYS.RECHARGE_ORDERS, JSON.stringify(orders)); return true; }

export function getWithdrawOrders(userId?: string): WithdrawOrder[] { return safeParse<WithdrawOrder[]>(localStorage.getItem(KEYS.WITHDRAW_ORDERS), []).filter(o => !userId || (o as any).userId === userId); }
export function createWithdrawOrder(userId: string, amount: number): { success: boolean; message: string; order?: WithdrawOrder } {
  const user = getUsers().find(u => u.id === userId) || getCurrentUser(); if (!user) return { success: false, message: 'User not found' }; if (!(user as any).bankCard) return { success: false, message: 'No bank card linked' }; if (amount < 9000) return { success: false, message: 'Minimum withdrawal is UGX 9,000' }; if (amount > user.balance) return { success: false, message: 'Insufficient balance' };
  const fee = Math.floor(amount * 0.16); const received = amount - fee; const orders = getWithdrawOrders(); const order: WithdrawOrder = { id: generateId(), userId, amount, receivedAmount: received, fee, bankCard: (user as any).bankCard, status: 'pending', createdAt: new Date().toISOString() } as any;
  localStorage.setItem(KEYS.WITHDRAW_ORDERS, JSON.stringify([order, ...orders])); updateUser(userId, { balance: user.balance - amount } as any); return { success: true, message: 'Withdrawal submitted', order };
}
export function approveWithdrawOrder(orderId: string): boolean { const orders = getWithdrawOrders(); const idx = orders.findIndex(o => o.id === orderId); if (idx === -1) return false; orders[idx].status = 'completed' as any; localStorage.setItem(KEYS.WITHDRAW_ORDERS, JSON.stringify(orders)); return true; }
export function rejectWithdrawOrder(orderId: string): boolean { const orders = getWithdrawOrders(); const idx = orders.findIndex(o => o.id === orderId); if (idx === -1) return false; const order = orders[idx]; orders.splice(idx, 1); localStorage.setItem(KEYS.WITHDRAW_ORDERS, JSON.stringify(orders)); updateUser(order.userId, { balance: ((getUsers().find(u=>u.id===order.userId)?.balance||0) + order.amount) } as any); return true; }

export function getUserProducts(userId?: string): UserProduct[] { 
  if (userId) creditDailyIncome(userId);
  return safeParse<UserProduct[]>(localStorage.getItem(KEYS.USER_PRODUCTS), []).filter(p => !userId || (p as any).userId === userId); 
}
export function saveUserProducts(products: UserProduct[]): void { localStorage.setItem(KEYS.USER_PRODUCTS, JSON.stringify(products)); }

export function creditDailyIncome(userId: string): { credited: number } {
  try {
    const user = getUsers().find(u => u.id === userId) || getCurrentUser(); 
    if (!user || (user as any).id !== userId) return { credited: 0 }; 
    const allProducts = safeParse<any[]>(localStorage.getItem(KEYS.USER_PRODUCTS), []);
    const products = allProducts.filter(p => p.userId === userId && p.status === 'active');
    if (!products.length) return { credited: 0 };
    const now = Date.now();
    let totalToCredit = 0;
    let updated = false;
    for (const p of products) {
      const purchaseTime = new Date(p.purchasedAt || p.purchaseDate || p.createdAt).getTime();
      const lastCreditTime = p.lastIncomeAt ? new Date(p.lastIncomeAt).getTime() : purchaseTime;
      const nextIncomeTime = lastCreditTime + 24*60*60*1000;
      const endTime = new Date(p.endDate || (purchaseTime + (p.term||30)*24*60*60*1000)).getTime();
      if (now > endTime) { p.status = 'expired'; updated = true; continue; }
      if (now >= nextIncomeTime) {
        const daysMissed = Math.floor((now - lastCreditTime) / (24*60*60*1000));
        let incomeForThisProduct = 0;
        for (let i = 0; i < daysMissed; i++) {
          const checkTime = lastCreditTime + (i+1)*24*60*60*1000;
          if (checkTime <= now && checkTime <= endTime) {
            incomeForThisProduct += Number(p.dailyIncome || 0);
            p.daysPaid = (p.daysPaid || 0) + 1;
            p.totalEarned = (p.totalEarned || 0) + Number(p.dailyIncome || 0);
          }
        }
        if (incomeForThisProduct > 0) {
          totalToCredit += incomeForThisProduct;
          p.lastIncomeAt = new Date(lastCreditTime + daysMissed*24*60*60*1000).toISOString();
          p.nextIncomeAt = new Date(new Date(p.lastIncomeAt).getTime() + 24*60*60*1000).toISOString();
          updated = true;
        }
      }
    }
    if (totalToCredit > 0) {
      updateUser(userId, { balance: (user.balance || 0) + totalToCredit, cumulativeIncome: (user.cumulativeIncome || 0) + totalToCredit } as any); 
      addTransaction({ userId, type: 'daily-income', amount: totalToCredit, status: 'completed', description: `Daily income - ${products.length} products - After 24hrs` } as any);
      if (updated) {
        const otherUsersProducts = allProducts.filter(p => p.userId !== userId);
        localStorage.setItem(KEYS.USER_PRODUCTS, JSON.stringify([...products, ...otherUsersProducts]));
      }
    }
    return { credited: totalToCredit };
  } catch (e) { console.error('creditDailyIncome error', e); return { credited: 0 }; }
}

export function getNextPayoutMs(userId?: string): number { 
  if (!userId) return 0;
  const products = safeParse<any[]>(localStorage.getItem(KEYS.USER_PRODUCTS), []).filter(p => p.userId === userId && p.status === 'active');
  if (!products.length) return 0;
  const now = Date.now();
  let nextMs = Infinity;
  for (const p of products) {
    const last = p.lastIncomeAt ? new Date(p.lastIncomeAt).getTime() : new Date(p.purchasedAt || p.purchaseDate).getTime();
    const next = last + 24*60*60*1000;
    const remaining = next - now;
    if (remaining > 0 && remaining < nextMs) nextMs = remaining;
  }
  return nextMs === Infinity ? 0 : nextMs;
}

export function performCheckIn(userId: string): { success: boolean; reward?: number; message?: string } {
  try {
    let user = getUsers().find(u => u.id === userId) || getCurrentUser();
    if (!user || user.id !== userId) {
      try {
        const raw = localStorage.getItem('legend_user');
        if (raw) {
          const u = JSON.parse(raw) as any;
          if (u?.id === userId) user = getCurrentUser();
        }
      } catch {}
    }
    if (!user) return { success: false, message: 'User not found' };
    const today = new Date().toDateString();
    if ((user as any).lastCheckIn === today) return { success: false, message: 'Already checked in today' };
    const reward = CHECKIN_REWARD || 300;
    const newCheckInDays = ((user as any).checkInDays || 0) + 1;
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
  const now = new Date();
  const endDate = new Date(now.getTime() + term * 24 * 60 * 60 * 1000);
  const nextIncomeAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const products = getUserProducts(userId); 
  const userProduct: any = { 
    id: generateId(), 
    userId, 
    productId, 
    price, 
    dailyIncome, 
    term, 
    purchasedAt: now.toISOString(),
    purchaseDate: now.toISOString(),
    endDate: endDate.toISOString(),
    nextIncomeAt: nextIncomeAt.toISOString(),
    lastIncomeAt: null,
    totalEarned: 0,
    daysPaid: 0,
    status: 'active' 
  }; 
  saveUserProducts([userProduct, ...safeParse<UserProduct[]>(localStorage.getItem(KEYS.USER_PRODUCTS), [])]); 
  addTransaction({ userId: userId, type: 'purchase', amount: price, status: 'completed', description: `Purchased product ${productId} - First income after 24hrs` } as any); 
  return { success: true, message: `Product purchased! First daily income UGX ${dailyIncome.toLocaleString()} will come after 24 hours automatically every day!` };
}

export function getPasswordResets(): PasswordResetRequest[] { return safeParse<PasswordResetRequest[]>(localStorage.getItem(KEYS.PASSWORD_RESETS), []); }
export function createPasswordResetRequest(phone: string, newPassword: string, note?: string): PasswordResetRequest { const reqs = getPasswordResets(); const req: PasswordResetRequest = { id: generateId(), phone, newPassword, status: 'pending', createdAt: new Date().toISOString(), note }; localStorage.setItem(KEYS.PASSWORD_RESETS, JSON.stringify([req, ...reqs])); return req; }
export function approvePasswordReset(id: string): boolean { const reqs = getPasswordResets(); const idx = reqs.findIndex(r => r.id === id); if (idx === -1) return false; reqs[idx].status = 'approved'; reqs[idx].resolvedAt = new Date().toISOString(); localStorage.setItem(KEYS.PASSWORD_RESETS, JSON.stringify(reqs)); const req = reqs[idx]; const users = getUsers(); const uidx = users.findIndex(u => u.phone === req.phone); if (uidx !== -1) { users[uidx].password = req.newPassword; saveUsers(users); const supaRaw = localStorage.getItem('legend_user'); if (supaRaw) { try { const su = JSON.parse(supaRaw); if (su.phone === req.phone) { su.password = req.newPassword; localStorage.setItem('legend_user', JSON.stringify(su)); } } catch {} } } return true; }
export function rejectPasswordReset(id: string, note?: string): boolean { const reqs = getPasswordResets(); const idx = reqs.findIndex(r => r.id === id); if (idx === -1) return false; reqs[idx].status = 'rejected'; reqs[idx].resolvedAt = new Date().toISOString(); reqs[idx].note = note || reqs[idx].note; localStorage.setItem(KEYS.PASSWORD_RESETS, JSON.stringify(reqs)); return true; }

export function getTeamMembers(userId: string) { const users = getUsers(); const level1 = users.filter(u => u.referredBy === userId || (u as any).referred_by === userId); const level1Ids = level1.map(u => u.id); const level2 = users.filter(u => level1Ids.includes(u.referredBy as any) || level1Ids.includes((u as any).referred_by)); const level2Ids = level2.map(u => u.id); const level3 = users.filter(u => level2Ids.includes(u.referredBy as any) || level2Ids.includes((u as any).referred_by)); return { level1, level2, level3 }; }
export function getTeamCommissions(userId: string) { const { level1, level2, level3 } = getTeamMembers(userId); const sum = (arr: User[]) => arr.reduce((s, u) => s + (u.balance || 0), 0); const c1 = sum(level1) * (LEVEL1_RATE || 0.27); const c2 = sum(level2) * (LEVEL2_RATE || 0.02); const c3 = sum(level3) * (LEVEL3_RATE || 0.01); return { level1: Math.floor(c1), level2: Math.floor(c2), level3: Math.floor(c3) }; }

// ===== REDEEM CODES - FIXED - NO MORE d is not a function =====
export function getGiftCodes(): GiftCode[] { 
  const raw = localStorage.getItem(KEYS.GIFT_CODES);
  if(!raw) return [];
  try {
    const codes = JSON.parse(raw) as GiftCode[];
    const now = Date.now();
    const valid = codes.filter(c => {
      if(c.usedBy) return true;
      if(!c.expiresAt) return true;
      return new Date(c.expiresAt).getTime() > now;
    });
    if(valid.length !== codes.length) localStorage.setItem(KEYS.GIFT_CODES, JSON.stringify(valid));
    return valid;
  } catch { return []; }
}

export function createGiftCode(amount: number, note?: string, expiresAt?: string, customCode?: string): GiftCode { 
  const codes = getGiftCodes(); 
  const codeStr = (customCode?.trim().toUpperCase() || generateReferralCode());
  if(codes.some(c => c.code === codeStr && !c.usedBy)) throw new Error('Code exists');
  const codeObj: GiftCode = { 
    id: generateId(), 
    code: codeStr, 
    amount: Number(amount), 
    createdAt: new Date().toISOString(), 
    note: note || '', 
    expiresAt: expiresAt || new Date(Date.now()+30*60*1000).toISOString()
  }; 
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

export function useGiftCode(code: string, userId: string): { success: boolean; amount?: number; message?: string } {
  const all = getGiftCodes();
  const idx = all.findIndex(c => c.code.toUpperCase() === code.toUpperCase());
  if(idx===-1) return { success:false, message:'Invalid code' };
  const f = all[idx];
  if(f.usedBy) return { success:false, message:'Already used' };
  if(f.expiresAt && new Date(f.expiresAt).getTime() < Date.now()) return { success:false, message:'Expired' };
  f.usedBy = userId;
  f.usedAt = new Date().toISOString();
  localStorage.setItem(KEYS.GIFT_CODES, JSON.stringify(all));
  return { success:true, amount:f.amount };
}

// FIXES "d is not a function" - THIS WAS MISSING!
export async function redeemGiftCode(userId: string, enteredCode: string): Promise<{ success: boolean; amount?: number; message?: string }> {
  try {
    const trimmed = enteredCode.trim().toUpperCase();
    if(!trimmed) return { success:false, message:'Enter code' };
    const all = getGiftCodes();
    const found = all.find(c => c.code.toUpperCase() === trimmed);
    if(!found) return { success:false, message:'Invalid gift code - Not found' };
    if(found.usedBy) return { success:false, message:'Code already used!' };
    if(found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) return { success:false, message:'Code expired! (30min limit)' };
    
    found.usedBy = userId;
    found.usedAt = new Date().toISOString();
    localStorage.setItem(KEYS.GIFT_CODES, JSON.stringify(all));

    const users = getUsers();
    const uIdx = users.findIndex(u => u.id === userId);
    if(uIdx!==-1){
      const u = users[uIdx];
      const newBal = Number(u.balance||0) + Number(found.amount||0);
      users[uIdx] = { ...u, balance:newBal, cumulativeIncome: Number((u as any).cumulativeIncome||0)+Number(found.amount||0) } as any;
      saveUsers(users);
      try{
        const raw = localStorage.getItem('legend_user');
        if(raw){
          const cu = JSON.parse(raw);
          if(cu.id===userId){ cu.balance=newBal; cu.cumulativeIncome=Number(cu.cumulativeIncome||0)+Number(found.amount||0); localStorage.setItem('legend_user', JSON.stringify(cu)); }
        }
      }catch{}
    }
    return { success:true, amount:found.amount, message:`Success! +UGX ${Number(found.amount).toLocaleString()} added!` };
  } catch(e:any){
    console.error(e);
    return { success:false, message:e.message||'Redeem failed' };
  }
}

export const createPasswordReset = createPasswordResetRequest;
export function getPasswordResetStatus(phone: string) {
  const reqs = getPasswordResets();
  return reqs.find(r => r.phone === phone) || null;
}

export { supabase };

import type { User, Transaction, RechargeOrder, WithdrawOrder, UserProduct } from '@/types';
import {
  REGISTRATION_BONUS,
  PRODUCTS,
  MTN_ACCOUNT,
  MTN_NAME,
  LEVEL1_RATE,
  LEVEL2_RATE,
  LEVEL3_RATE,
  CHECKIN_REWARD
} from '@/constants/products';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  (import.meta as any).env?.VITE_SUPABASE_URL || '',
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''
);

const HAS_SUPABASE =
  Boolean((import.meta as any).env?.VITE_SUPABASE_URL) &&
  Boolean((import.meta as any).env?.VITE_SUPABASE_ANON_KEY);

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
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function generateReferralCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

const ADMIN_PHONE = '0746085840';
const ADMIN_PASSWORD = 'milly@2323';

function safeParse<T>(s: string | null, fallback: T): T {
  try {
    return s ? JSON.parse(s) as T : fallback;
  } catch {
    return fallback;
  }
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function toDbUser(user: User): any {
  return {
    id: user.id,
    phone: user.phone,
    password: user.password,
    balance: Number(user.balance || 0),
    cumulative_income: Number(user.cumulativeIncome || 0),
    level: Number(user.level || 1),
    referral_code: user.referralCode || null,
    referred_by: user.referredBy || null,
    full_name: user.fullName || null,
    name: user.name || user.fullName || null,
    check_in_days: Number(user.checkInDays || 0),
    last_check_in: user.lastCheckIn || null,
    created_at: user.createdAt,
    is_admin: !!user.isAdmin,
    is_banned: !!user.isBanned,
    is_deleted: !!user.isDeleted,
    status: user.status || (user.isBanned ? 'banned' : 'active'),
    bank_card: user.bankCard || null
  };
}

function toCamelUser(row: any): User {
  return {
    id: row.id,
    phone: row.phone,
    password: row.password || '',
    balance: Number(row.balance || 0),
    cumulativeIncome: Number(row.cumulative_income || 0),
    level: Number(row.level || 1),
    referralCode: row.referral_code || '',
    referredBy: row.referred_by || undefined,
    fullName: row.full_name || row.name || '',
    name: row.name || row.full_name || '',
    checkInDays: Number(row.check_in_days || 0),
    lastCheckIn: row.last_check_in || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    isAdmin: !!row.is_admin,
    isBanned: !!row.is_banned,
    isDeleted: !!row.is_deleted,
    status: row.status || 'active',
    bankCard: row.bank_card || undefined
  };
}

function toDbTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): any {
  return {
    id: tx.id || generateId(),
    user_id: tx.userId,
    type: tx.type,
    amount: Number(tx.amount || 0),
    status: tx.status,
    description: tx.description || '',
    created_at: new Date().toISOString()
  };
}

function toCamelTransaction(row: any): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: Number(row.amount || 0),
    status: row.status,
    description: row.description || '',
    createdAt: row.created_at || new Date().toISOString()
  };
}

function toDbRechargeOrder(order: RechargeOrder): any {
  return {
    id: order.id,
    user_id: order.userId,
    amount: Number(order.amount || 0),
    payment_method: order.paymentMethod,
    phone_number: order.phoneNumber,
    status: order.status,
    created_at: order.createdAt,
    mtn_account: order.mtnAccount,
    mtn_name: order.mtnName
  };
}

function toCamelRechargeOrder(row: any): RechargeOrder {
  return {
    id: row.id,
    userId: row.user_id,
    amount: Number(row.amount || 0),
    paymentMethod: row.payment_method || 'MTN',
    phoneNumber: row.phone_number || '',
    status: row.status || 'pending',
    createdAt: row.created_at || new Date().toISOString(),
    mtnAccount: row.mtn_account || MTN_ACCOUNT || '0756406186',
    mtnName: row.mtn_name || MTN_NAME || 'Nabakooza Milly'
  };
}

function toDbWithdrawOrder(order: WithdrawOrder): any {
  return {
    id: order.id,
    user_id: order.userId,
    amount: Number(order.amount || 0),
    received_amount: Number(order.receivedAmount || 0),
    fee: Number(order.fee || 0),
    bank_card: order.bankCard || null,
    status: order.status,
    created_at: order.createdAt
  };
}

function toCamelWithdrawOrder(row: any): WithdrawOrder {
  return {
    id: row.id,
    userId: row.user_id,
    amount: Number(row.amount || 0),
    receivedAmount: Number(row.received_amount || 0),
    fee: Number(row.fee || 0),
    bankCard: row.bank_card || { bank: '', holderName: '', accountNumber: '' },
    status: row.status || 'pending',
    createdAt: row.created_at || new Date().toISOString()
  };
}

function toDbUserProduct(product: UserProduct): any {
  return {
    id: product.id,
    user_id: product.userId,
    product_id: Number(product.productId || 0),
    price: Number(product.price || 0),
    daily_income: Number(product.dailyIncome || 0),
    term: Number(product.term || 0),
    purchased_at: product.purchasedAt || new Date().toISOString(),
    status: product.status || 'active'
  };
}

function toCamelUserProduct(row: any): UserProduct {
  return {
    id: row.id,
    userId: row.user_id,
    productId: Number(row.product_id || 0),
    price: Number(row.price || 0),
    dailyIncome: Number(row.daily_income || 0),
    term: Number(row.term || 0),
    purchasedAt: row.purchased_at || new Date().toISOString(),
    status: row.status || 'active'
  };
}

function toDbGiftCode(code: GiftCode): any {
  return {
    id: code.id,
    code: code.code,
    amount: Number(code.amount || 0),
    used_by: code.usedBy || null,
    used_at: code.usedAt || null,
    created_at: code.createdAt,
    note: code.note || null,
    expires_at: code.expiresAt || null
  };
}

function toCamelGiftCode(row: any): GiftCode {
  return {
    id: row.id,
    code: row.code,
    amount: Number(row.amount || 0),
    usedBy: row.used_by || undefined,
    usedAt: row.used_at || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    note: row.note || undefined,
    expiresAt: row.expires_at || undefined
  };
}

function toDbPasswordReset(req: PasswordResetRequest): any {
  return {
    id: req.id,
    phone: req.phone,
    new_password: req.newPassword,
    status: req.status,
    created_at: req.createdAt,
    resolved_at: req.resolvedAt || null,
    note: req.note || null
  };
}

function toCamelPasswordReset(row: any): PasswordResetRequest {
  return {
    id: row.id,
    phone: row.phone,
    newPassword: row.new_password,
    status: row.status || 'pending',
    createdAt: row.created_at || new Date().toISOString(),
    resolvedAt: row.resolved_at || undefined,
    note: row.note || undefined
  };
}

function getLocalUsers(): User[] {
  return readLocal<User[]>(KEYS.USERS, []);
}

function saveLocalUsers(users: User[]): void {
  writeLocal(KEYS.USERS, users);
}

function getLocalTransactions(): Transaction[] {
  return readLocal<Transaction[]>(KEYS.TRANSACTIONS, []);
}

function getLocalRechargeOrders(): RechargeOrder[] {
  return readLocal<RechargeOrder[]>(KEYS.RECHARGE_ORDERS, []);
}

function getLocalWithdrawOrders(): WithdrawOrder[] {
  return readLocal<WithdrawOrder[]>(KEYS.WITHDRAW_ORDERS, []);
}

function getLocalUserProducts(): UserProduct[] {
  return readLocal<UserProduct[]>(KEYS.USER_PRODUCTS, []);
}

function getLocalGiftCodes(): GiftCode[] {
  return readLocal<GiftCode[]>(KEYS.GIFT_CODES, []);
}

function getLocalPasswordResets(): PasswordResetRequest[] {
  return readLocal<PasswordResetRequest[]>(KEYS.PASSWORD_RESETS, []);
}

function initAdminLocal() {
  const users = getLocalUsers();
  const adminIdx = users.findIndex((u: any) => u?.isAdmin);
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
      isBanned: false,
      isDeleted: false,
      status: 'active'
    } as any;

    saveLocalUsers([...users, admin]);
  }
}

export async function initAdmin(): Promise<void> {
  if (!HAS_SUPABASE) {
    initAdminLocal();
    return;
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_admin', true);

  if (error) throw error;

  if (!data || data.length === 0) {
    const admin = {
      id: 'admin001',
      phone: ADMIN_PHONE,
      password: ADMIN_PASSWORD,
      balance: 0,
      cumulative_income: 0,
      level: 1,
      referral_code: 'ADMIN000',
      check_in_days: 0,
      created_at: new Date().toISOString(),
      is_admin: true,
      is_banned: false,
      is_deleted: false,
      status: 'active'
    };

    const { error: insertError } = await supabase.from('users').insert(admin);
    if (insertError) throw insertError;
  }
}

export async function getUsers(): Promise<User[]> {
  if (!HAS_SUPABASE) {
    return getLocalUsers();
  }

  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return (data || []).map(toCamelUser);
}

export async function saveUsers(users: User[]): Promise<void> {
  if (!HAS_SUPABASE) {
    saveLocalUsers(users);
    return;
  }

  for (const user of users) {
    const { error } = await supabase.from('users').upsert(toDbUser(user));
    if (error) throw error;
  }
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
        fullName: u.fullName || u.full_name || u.name || '',
        name: u.name || u.fullName || u.full_name || '',
        balance: Number(u.balance || 0),
        cumulativeIncome: Number(u.cumulativeIncome || 0) || 0,
        level: u.level || 1,
        referralCode: u.referral_code || u.referralCode || '',
        referredBy: u.referred_by || u.referredBy || undefined,
        checkInDays: u.checkInDays || 0,
        lastCheckIn: u.lastCheckIn || undefined,
        createdAt: u.created_at || u.createdAt || new Date().toISOString(),
        isAdmin: u.phone === ADMIN_PHONE || u.is_admin || u.isAdmin || false,
        isBanned: !!(u.isBanned || u.is_banned || u.banned),
        isDeleted: !!(u.isDeleted || u.is_deleted || u.deleted),
        status: u.status || (u.isBanned ? 'banned' : 'active'),
        bankCard: u.bankCard || null,
      } as User;
    }

    const id = localStorage.getItem(KEYS.CURRENT_USER);
    if (!id) return null;

    const localUsers = getLocalUsers();
    return localUsers.find(u => u.id === id) || null;
  } catch {
    return null;
  }
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

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  if (!HAS_SUPABASE) {
    const users = getLocalUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return null;

    users[idx] = { ...users[idx], ...updates } as any;
    saveLocalUsers(users);

    const raw = localStorage.getItem('legend_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.id === userId) {
        const updated = { ...u, ...updates };
        localStorage.setItem('legend_user', JSON.stringify(updated));
      }
    }

    return users[idx];
  }

  const { data: current, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!current) return null;

  const merged = {
    ...toCamelUser(current),
    ...updates
  };

  const { data, error } = await supabase
    .from('users')
    .update(toDbUser(merged))
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;

  return toCamelUser(data);
}

export function formatUGX(amount: number): string {
  try {
    return `UGX ${(Number(amount) || 0).toLocaleString()}`;
  } catch {
    return `UGX ${amount}`;
  }
}

export async function registerUser(
  phone: string,
  password: string,
  referralCode?: string,
  fullName?: string
): Promise<{ success: boolean; message: string; user?: User }> {
  if (!HAS_SUPABASE) {
    initAdminLocal();
    const users = getLocalUsers();
    if (users.find(u => u.phone === phone)) {
      return { success: false, message: 'Phone number already registered' };
    }

    let referredBy: string | undefined;
    if (referralCode) {
      const referrer = users.find(u => u.referralCode === referralCode.toUpperCase());
      if (referrer) referredBy = referrer.id;
    }

    const newUser: any = {
      id: generateId(),
      phone,
      password,
      fullName: fullName?.trim() || '',
      name: fullName?.trim() || '',
      full_name: fullName?.trim() || '',
      balance: REGISTRATION_BONUS || 9000,
      cumulativeIncome: 0,
      level: 1,
      referralCode: generateReferralCode(),
      referredBy,
      checkInDays: 0,
      createdAt: new Date().toISOString(),
      isAdmin: false,
      isBanned: false,
      isDeleted: false,
      status: 'active'
    };

    saveLocalUsers([...users, newUser]);
    addTransaction({
      userId: newUser.id,
      type: 'bonus',
      amount: REGISTRATION_BONUS || 9000,
      status: 'completed',
      description: `Registration bonus for ${fullName || phone}`
    } as any);

    setCurrentUser(newUser);

    return { success: true, message: 'Registration successful', user: newUser as User };
  }

  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    return { success: false, message: 'Phone number already registered' };
  }

  let referredBy: string | undefined;

  const { data: allUsers } = await supabase.from('users').select('*');

  if (referralCode) {
    const referrer = (allUsers || []).find((u: any) => (u.referral_code || '').toUpperCase() === referralCode.toUpperCase());
    if (referrer) referredBy = referrer.id;
  }

  const newUser: any = {
    id: generateId(),
    phone,
    password,
    full_name: fullName?.trim() || '',
    name: fullName?.trim() || '',
    balance: REGISTRATION_BONUS || 9000,
    cumulative_income: 0,
    level: 1,
    referral_code: generateReferralCode(),
    referred_by: referredBy || null,
    check_in_days: 0,
    created_at: new Date().toISOString(),
    is_admin: false,
    is_banned: false,
    is_deleted: false,
    status: 'active'
  };

  const { error } = await supabase.from('users').insert(newUser);
  if (error) {
    return { success: false, message: error.message };
  }

  const { error: txErr } = await supabase.from('transactions').insert({
    id: generateId(),
    user_id: newUser.id,
    type: 'bonus',
    amount: REGISTRATION_BONUS || 9000,
    status: 'completed',
    description: `Registration bonus for ${fullName || phone}`,
    created_at: new Date().toISOString()
  });

  if (txErr) throw txErr;

  setCurrentUser(newUser);

  return {
    success: true,
    message: 'Registration successful',
    user: toCamelUser(newUser)
  };
}

export async function loginUser(identifier: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
  if (!HAS_SUPABASE) {
    initAdminLocal();
    const users = getLocalUsers();
    const id = identifier.trim().toLowerCase();

    const user = users.find(u => {
      const phoneMatch = u.phone === identifier.trim() || u.phone.toLowerCase() === id;
      const nameMatch =
        (u as any).fullName?.toLowerCase() === id ||
        (u as any).name?.toLowerCase() === id ||
        (u as any).username?.toLowerCase() === id;

      return phoneMatch || nameMatch;
    });

    if (!user) return { success: false, message: 'Incorrect phone/name or password' };
    if (user.password !== password) return { success: false, message: 'Incorrect password' };

    setCurrentUser(user as any);
    return { success: true, message: 'Login successful', user };
  }

  const normalized = identifier.trim();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`phone.eq.${normalized},name.eq.${normalized},full_name.eq.${normalized}`);

  if (error) throw error;

  const userRow = (data || []).find((u: any) => {
    const phoneMatch = u.phone === normalized;
    const nameMatch = (u.name || '').toLowerCase() === normalized.toLowerCase() || (u.full_name || '').toLowerCase() === normalized.toLowerCase();
    return phoneMatch || nameMatch;
  });

  if (!userRow) return { success: false, message: 'Incorrect phone/name or password' };
  if (userRow.password !== password) return { success: false, message: 'Incorrect password' };

  const user = toCamelUser(userRow);
  setCurrentUser(user);
  return { success: true, message: 'Login successful', user };
}

export async function getTransactions(userId?: string): Promise<Transaction[]> {
  if (!HAS_SUPABASE) {
    const data = getLocalTransactions();
    if (!userId) return data;
    return data.filter(t => (t as any).userId === userId);
  }

  let query = supabase.from('transactions').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map(toCamelTransaction);
}

export async function addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  if (!HAS_SUPABASE) {
    const transactions = getLocalTransactions();
    const newTx: Transaction = { ...tx, id: generateId(), createdAt: new Date().toISOString() } as any;
    writeLocal(KEYS.TRANSACTIONS, [newTx, ...transactions]);
    return newTx;
  }

  const payload = {
    id: generateId(),
    user_id: tx.userId,
    type: tx.type,
    amount: Number(tx.amount || 0),
    status: tx.status,
    description: tx.description || '',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('transactions').insert(payload).select('*').single();
  if (error) throw error;

  return toCamelTransaction(data);
}

export async function getRechargeOrders(userId?: string): Promise<RechargeOrder[]> {
  if (!HAS_SUPABASE) {
    const all = getLocalRechargeOrders();
    if (!userId) return all;
    return all.filter(o => (o as any).userId === userId);
  }

  let query = supabase.from('recharge_orders').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map(toCamelRechargeOrder);
}

export async function createRechargeOrder(
  userId: string,
  amount: number,
  paymentMethod: string,
  phoneNumber: string
): Promise<RechargeOrder> {
  if (!HAS_SUPABASE) {
    const orders = getLocalRechargeOrders();
    const order: RechargeOrder = {
      id: generateId(),
      userId,
      amount,
      paymentMethod,
      phoneNumber,
      status: 'pending',
      createdAt: new Date().toISOString(),
      mtnAccount: MTN_ACCOUNT || '0756406186',
      mtnName: MTN_NAME || 'Nabakooza Milly'
    } as any;

    writeLocal(KEYS.RECHARGE_ORDERS, [order, ...orders]);
    return order;
  }

  const payload = {
    id: generateId(),
    user_id: userId,
    amount: Number(amount || 0),
    payment_method: paymentMethod,
    phone_number: phoneNumber,
    status: 'pending',
    created_at: new Date().toISOString(),
    mtn_account: MTN_ACCOUNT || '0756406186',
    mtn_name: MTN_NAME || 'Nabakooza Milly'
  };

  const { data, error } = await supabase.from('recharge_orders').insert(payload).select('*').single();
  if (error) throw error;

  return toCamelRechargeOrder(data);
}

export async function approveRechargeOrder(orderId: string): Promise<boolean> {
  if (!HAS_SUPABASE) {
    const orders = getLocalRechargeOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return false;

    orders[idx].status = 'completed';
    writeLocal(KEYS.RECHARGE_ORDERS, orders);

    await addTransaction({
      userId: orders[idx].userId,
      type: 'recharge',
      amount: orders[idx].amount,
      status: 'completed',
      description: 'Recharge approved'
    } as any);

    const user = getLocalUsers().find(u => u.id === orders[idx].userId);
    if (user) {
      await updateUser(orders[idx].userId, {
        balance: (user.balance || 0) + (orders[idx].amount || 0)
      } as any);
    }

    return true;
  }

  const { data: order, error: orderError } = await supabase
    .from('recharge_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError) throw orderError;

  const { error } = await supabase
    .from('recharge_orders')
    .update({ status: 'completed' })
    .eq('id', orderId);

  if (error) throw error;

  await addTransaction({
    userId: order.user_id,
    type: 'recharge',
    amount: Number(order.amount || 0),
    status: 'completed',
    description: 'Recharge approved'
  } as any);

  const { data: userRow } = await supabase.from('users').select('*').eq('id', order.user_id).single();
  if (userRow) {
    await updateUser(order.user_id, {
      balance: Number(userRow.balance || 0) + Number(order.amount || 0)
    } as any);
  }

  return true;
}

export async function rejectRechargeOrder(orderId: string): Promise<boolean> {
  if (!HAS_SUPABASE) {
    const orders = getLocalRechargeOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return false;
    orders[idx].status = 'rejected';
    writeLocal(KEYS.RECHARGE_ORDERS, orders);
    return true;
  }

  const { error } = await supabase
    .from('recharge_orders')
    .update({ status: 'rejected' })
    .eq('id', orderId);

  if (error) throw error;
  return true;
}

export async function getWithdrawOrders(userId?: string): Promise<WithdrawOrder[]> {
  if (!HAS_SUPABASE) {
    const all = getLocalWithdrawOrders();
    if (!userId) return all;
    return all.filter(o => (o as any).userId === userId);
  }

  let query = supabase.from('withdraw_orders').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map(toCamelWithdrawOrder);
}

export async function createWithdrawOrder(userId: string, amount: number): Promise<{ success: boolean; message: string; order?: WithdrawOrder }> {
  if (!HAS_SUPABASE) {
    const user = getLocalUsers().find(u => u.id === userId) || getCurrentUser();
    if (!user) return { success: false, message: 'User not found' };
    if (!(user as any).bankCard) return { success: false, message: 'No bank card linked' };
    if (amount < 9000) return { success: false, message: 'Minimum withdrawal is UGX 9,000' };
    if (amount > user.balance) return { success: false, message: 'Insufficient balance' };

    const fee = Math.floor(amount * 0.16);
    const received = amount - fee;

    const orders = getLocalWithdrawOrders();
    const order: WithdrawOrder = {
      id: generateId(),
      userId,
      amount,
      receivedAmount: received,
      fee,
      bankCard: (user as any).bankCard,
      status: 'pending',
      createdAt: new Date().toISOString()
    } as any;

    writeLocal(KEYS.WITHDRAW_ORDERS, [order, ...orders]);
    await updateUser(userId, { balance: user.balance - amount } as any);

    return { success: true, message: 'Withdrawal submitted', order };
  }

  const { data: userRow } = await supabase.from('users').select('*').eq('id', userId).single();
  if (!userRow) return { success: false, message: 'User not found' };
  if (!userRow.bank_card) return { success: false, message: 'No bank card linked' };
  if (amount < 9000) return { success: false, message: 'Minimum withdrawal is UGX 9,000' };
  if (amount > Number(userRow.balance || 0)) return { success: false, message: 'Insufficient balance' };

  const fee = Math.floor(amount * 0.16);
  const received = amount - fee;

  const payload = {
    id: generateId(),
    user_id: userId,
    amount,
    received_amount: received,
    fee,
    bank_card: userRow.bank_card,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('withdraw_orders').insert(payload).select('*').single();
  if (error) throw error;

  await updateUser(userId, { balance: Number(userRow.balance || 0) - amount } as any);

  return {
    success: true,
    message: 'Withdrawal submitted',
    order: toCamelWithdrawOrder(data)
  };
}

export async function approveWithdrawOrder(orderId: string): Promise<boolean> {
  if (!HAS_SUPABASE) {
    const orders = getLocalWithdrawOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return false;
    orders[idx].status = 'completed';
    writeLocal(KEYS.WITHDRAW_ORDERS, orders);
    return true;
  }

  const { error } = await supabase
    .from('withdraw_orders')
    .update({ status: 'completed' })
    .eq('id', orderId);

  if (error) throw error;
  return true;
}

export async function rejectWithdrawOrder(orderId: string): Promise<boolean> {
  if (!HAS_SUPABASE) {
    const orders = getLocalWithdrawOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return false;

    const order = orders[idx];
    orders.splice(idx, 1);
    writeLocal(KEYS.WITHDRAW_ORDERS, orders);

    const user = getLocalUsers().find(u => u.id === order.userId);
    if (user) {
      await updateUser(order.userId, { balance: (user.balance || 0) + order.amount } as any);
    }

    return true;
  }

  const { data: order, error: fetchError } = await supabase
    .from('withdraw_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase.from('withdraw_orders').delete().eq('id', orderId);
  if (error) throw error;

  const { data: userRow } = await supabase.from('users').select('*').eq('id', order.user_id).single();
  if (userRow) {
    await updateUser(order.user_id, {
      balance: Number(userRow.balance || 0) + Number(order.amount || 0)
    } as any);
  }

  return true;
}

export async function getUserProducts(userId?: string): Promise<UserProduct[]> {
  if (!HAS_SUPABASE) {
    const all = getLocalUserProducts();
    if (!userId) return all;
    return all.filter(p => (p as any).userId === userId);
  }

  let query = supabase.from('user_products').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.order('purchased_at', { ascending: false });
  if (error) throw error;

  return (data || []).map(toCamelUserProduct);
}

export async function saveUserProducts(products: UserProduct[]): Promise<void> {
  if (!HAS_SUPABASE) {
    writeLocal(KEYS.USER_PRODUCTS, products);
    return;
  }

  for (const p of products) {
    const { error } = await supabase.from('user_products').upsert(toDbUserProduct(p));
    if (error) throw error;
  }
}

export async function creditDailyIncome(userId: string): Promise<{ credited: number }> {
  if (!HAS_SUPABASE) {
    const user = getLocalUsers().find(u => u.id === userId);
    if (!user) return { credited: 0 };

    const products = getLocalUserProducts().filter(p => p.status === 'active' && p.userId === userId);
    if (!products.length) return { credited: 0 };

    const dailySum = products.reduce((s, p) => s + (p.dailyIncome || 0), 0);
    if (!dailySum) return { credited: 0 };

    const lastMap = readLocal<Record<string, number>>(KEYS.LAST_DAILY_CREDIT, {});
    const last = lastMap[userId] || 0;
    const now = Date.now();
    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();

    if (last >= startOfToday) return { credited: 0 };

    await updateUser(userId, {
      balance: (user.balance || 0) + dailySum,
      cumulativeIncome: (user.cumulativeIncome || 0) + dailySum
    } as any);

    await addTransaction({
      userId,
      type: 'daily-income',
      amount: dailySum,
      status: 'completed',
      description: 'Daily product income'
    } as any);

    lastMap[userId] = now;
    writeLocal(KEYS.LAST_DAILY_CREDIT, lastMap);

    return { credited: dailySum };
  }

  const { data: userRow } = await supabase.from('users').select('*').eq('id', userId).single();
  if (!userRow) return { credited: 0 };

  const { data: products } = await supabase
    .from('user_products')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (!products || products.length === 0) return { credited: 0 };

  const dailySum = products.reduce((s: number, p: any) => s + Number(p.daily_income || 0), 0);
  if (!dailySum) return { credited: 0 };

  const lastMap = readLocal<Record<string, number>>(KEYS.LAST_DAILY_CREDIT, {});
  const last = lastMap[userId] || 0;
  const now = Date.now();
  const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();

  if (last >= startOfToday) return { credited: 0 };

  await updateUser(userId, {
    balance: Number(userRow.balance || 0) + dailySum,
    cumulativeIncome: Number(userRow.cumulative_income || 0) + dailySum
  } as any);

  await addTransaction({
    userId,
    type: 'daily-income',
    amount: dailySum,
    status: 'completed',
    description: 'Daily product income'
  } as any);

  lastMap[userId] = now;
  writeLocal(KEYS.LAST_DAILY_CREDIT, lastMap);

  return { credited: dailySum };
}

export function getNextPayoutMs(userId?: string): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, next.getTime() - now.getTime());
}

export async function performCheckIn(userId: string): Promise<{ success: boolean; reward?: number; message?: string }> {
  if (!HAS_SUPABASE) {
    const user = getLocalUsers().find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };

    const today = new Date().toDateString();
    if (user.lastCheckIn === today) return { success: false, message: 'Already checked in today' };

    const reward = CHECKIN_REWARD || 300;
    const newCheckInDays = (user.checkInDays || 0) + 1;

    await updateUser(userId, {
      balance: (user.balance || 0) + reward,
      cumulativeIncome: (user.cumulativeIncome || 0) + reward,
      lastCheckIn: today,
      checkInDays: newCheckInDays
    } as any);

    await addTransaction({
      userId,
      type: 'checkin',
      amount: reward,
      status: 'completed',
      description: 'Daily check-in reward'
    } as any);

    return { success: true, reward };
  }

  const { data: userRow } = await supabase.from('users').select('*').eq('id', userId).single();
  if (!userRow) return { success: false, message: 'User not found' };

  const today = new Date().toDateString();
  if (userRow.last_check_in === today) return { success: false, message: 'Already checked in today' };

  const reward = CHECKIN_REWARD || 300;
  const newCheckInDays = (userRow.check_in_days || 0) + 1;

  await updateUser(userId, {
    balance: Number(userRow.balance || 0) + reward,
    cumulativeIncome: Number(userRow.cumulative_income || 0) + reward,
    lastCheckIn: today,
    checkInDays: newCheckInDays
  } as any);

  await addTransaction({
    userId,
    type: 'checkin',
    amount: reward,
    status: 'completed',
    description: 'Daily check-in reward'
  } as any);

  return { success: true, reward };
}

export async function purchaseProduct(
  userId: string,
  productId: number,
  price: number,
  dailyIncome: number,
  term: number
): Promise<{ success: boolean; message: string }> {
  if (!HAS_SUPABASE) {
    const user = getLocalUsers().find(u => u.id === userId) || getCurrentUser();
    if (!user) return { success: false, message: 'User not found' };
    if (user.balance < price) return { success: false, message: 'Insufficient balance' };

    await updateUser(user.id, { balance: user.balance - price } as any);

    const products = getLocalUserProducts();
    const userProduct: UserProduct = {
      id: generateId(),
      userId,
      productId,
      price,
      dailyIncome,
      term,
      purchasedAt: new Date().toISOString(),
      status: 'active',
      purchaseDate: new Date().toISOString(),
      endDate: new Date(Date.now() + term * 86400000).toISOString()
    } as any;

    writeLocal(KEYS.USER_PRODUCTS, [userProduct, ...products]);

    await addTransaction({
      userId,
      type: 'purchase',
      amount: price,
      status: 'completed',
      description: `Purchased product ${productId}`
    } as any);

    return { success: true, message: 'Product purchased successfully' };
  }

  const { data: userRow } = await supabase.from('users').select('*').eq('id', userId).single();
  if (!userRow) return { success: false, message: 'User not found' };
  if (Number(userRow.balance || 0) < price) return { success: false, message: 'Insufficient balance' };

  await updateUser(userId, { balance: Number(userRow.balance || 0) - price } as any);

  const payload = {
    id: generateId(),
    user_id: userId,
    product_id: productId,
    price,
    daily_income: dailyIncome,
    term,
    purchased_at: new Date().toISOString(),
    status: 'active'
  };

  const { error: productError } = await supabase.from('user_products').insert(payload);
  if (productError) throw productError;

  await addTransaction({
    userId,
    type: 'purchase',
    amount: price,
    status: 'completed',
    description: `Purchased product ${productId}`
  } as any);

  return { success: true, message: 'Product purchased successfully' };
}

export async function getGiftCodes(): Promise<GiftCode[]> {
  if (!HAS_SUPABASE) {
    return getLocalGiftCodes();
  }

  const { data, error } = await supabase.from('gift_codes').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toCamelGiftCode);
}

export async function createGiftCode(amount: number, note?: string, expiresAt?: string): Promise<GiftCode> {
  if (!HAS_SUPABASE) {
    const codes = getLocalGiftCodes();
    const codeObj: GiftCode = {
      id: generateId(),
      code: generateReferralCode(),
      amount,
      createdAt: new Date().toISOString(),
      note: note || '',
      expiresAt
    } as any;

    writeLocal(KEYS.GIFT_CODES, [codeObj, ...codes]);
    return codeObj;
  }

  const payload = {
    id: generateId(),
    code: generateReferralCode(),
    amount: Number(amount || 0),
    created_at: new Date().toISOString(),
    note: note || '',
    expires_at: expiresAt || null
  };

  const { data, error } = await supabase.from('gift_codes').insert(payload).select('*').single();
  if (error) throw error;

  return toCamelGiftCode(data);
}

export async function deleteGiftCode(id: string): Promise<boolean> {
  if (!HAS_SUPABASE) {
    const codes = getLocalGiftCodes();
    const idx = codes.findIndex(c => c.id === id);
    if (idx === -1) return false;
    codes.splice(idx, 1);
    writeLocal(KEYS.GIFT_CODES, codes);
    return true;
  }

  const { error } = await supabase.from('gift_codes').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function getPasswordResets(): Promise<PasswordResetRequest[]> {
  if (!HAS_SUPABASE) {
    return getLocalPasswordResets();
  }

  const { data, error } = await supabase.from('password_resets').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toCamelPasswordReset);
}

export async function createPasswordResetRequest(phone: string, newPassword: string, note?: string): Promise<PasswordResetRequest> {
  if (!HAS_SUPABASE) {
    const reqs = getLocalPasswordResets();
    const req: PasswordResetRequest = {
      id: generateId(),
      phone,
      newPassword,
      status: 'pending',
      createdAt: new Date().toISOString(),
      note
    };

    writeLocal(KEYS.PASSWORD_RESETS, [req, ...reqs]);
    return req;
  }

  const payload = {
    id: generateId(),
    phone,
    new_password: newPassword,
    status: 'pending',
    created_at: new Date().toISOString(),
    note: note || null
  };

  const { data, error } = await supabase.from('password_resets').insert(payload).select('*').single();
  if (error) throw error;

  return toCamelPasswordReset(data);
}

export async function approvePasswordReset(id: string): Promise<boolean> {
  if (!HAS_SUPABASE) {
    const reqs = getLocalPasswordResets();
    const idx = reqs.findIndex(r => r.id === id);
    if (idx === -1) return false;

    reqs[idx].status = 'approved';
    reqs[idx].resolvedAt = new Date().toISOString();
    writeLocal(KEYS.PASSWORD_RESETS, reqs);

    const req = reqs[idx];
    const users = getLocalUsers();
    const uidx = users.findIndex(u => u.phone === req.phone);
    if (uidx !== -1) {
      users[uidx].password = req.newPassword;
      saveLocalUsers(users);
    }

    return true;
  }

  const { data: req, error: reqError } = await supabase
    .from('password_resets')
    .select('*')
    .eq('id', id)
    .single();

  if (reqError) throw reqError;

  const { error } = await supabase
    .from('password_resets')
    .update({
      status: 'approved',
      resolved_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw error;

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('phone', req.phone);

  if (users && users.length) {
    const user = users[0];
    await supabase.from('users').update({ password: req.new_password }).eq('id', user.id);
  }

  return true;
}

export async function rejectPasswordReset(id: string, note?: string): Promise<boolean> {
  if (!HAS_SUPABASE) {
    const reqs = getLocalPasswordResets();
    const idx = reqs.findIndex(r => r.id === id);
    if (idx === -1) return false;

    reqs[idx].status = 'rejected';
    reqs[idx].resolvedAt = new Date().toISOString();
    reqs[idx].note = note || reqs[idx].note;
    writeLocal(KEYS.PASSWORD_RESETS, reqs);

    return true;
  }

  const { error } = await supabase
    .from('password_resets')
    .update({
      status: 'rejected',
      resolved_at: new Date().toISOString(),
      note: note || null
    })
    .eq('id', id);

  if (error) throw error;

  return true;
}

export async function getTeamMembers(userId: string) {
  const users = await getUsers();

  const level1 = users.filter(u => u.referredBy === userId || (u as any).referred_by === userId);
  const level1Ids = level1.map(u => u.id);

  const level2 = users.filter(u =>
    level1Ids.includes(u.referredBy as any) || level1Ids.includes((u as any).referred_by)
  );

  const level2Ids = level2.map(u => u.id);

  const level3 = users.filter(u =>
    level2Ids.includes(u.referredBy as any) || level2Ids.includes((u as any).referred_by)
  );

  return { level1, level2, level3 };
}

export async function getTeamCommissions(userId: string) {
  const { level1, level2, level3 } = await getTeamMembers(userId);

  const sum = (arr: User[]) => arr.reduce((s, u) => s + (u.balance || 0), 0);

  const c1 = sum(level1) * (LEVEL1_RATE || 0.27);
  const c2 = sum(level2) * (LEVEL2_RATE || 0.02);
  const c3 = sum(level3) * (LEVEL3_RATE || 0.01);

  return {
    level1: Math.floor(c1),
    level2: Math.floor(c2),
    level3: Math.floor(c3)
  };
}

export async function createPasswordReset(phone: string, newPassword: string) {
  if (!HAS_SUPABASE) {
    const users = getLocalUsers();
    if (!users.find(u => u.phone === phone)) {
      return { success: false, message: 'Phone not registered' };
    }

    await createPasswordResetRequest(phone, newPassword);
    return { success: true, message: 'Request submitted' };
  }

  const { data: users } = await supabase.from('users').select('*').eq('phone', phone);
  if (!users || !users.length) {
    return { success: false, message: 'Phone not registered' };
  }

  await createPasswordResetRequest(phone, newPassword);
  return { success: true, message: 'Request submitted' };
}

export async function getPasswordResetStatus(phone: string) {
  const all = await getPasswordResets();
  const found = all
    .filter(r => r.phone === phone)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return found || null;
}

export async function redeemGiftCode(userId: string, code: string): Promise<{ success: boolean; message: string; amount?: number }> {
  if (!HAS_SUPABASE) {
    const codes = getLocalGiftCodes();
    const idx = codes.findIndex(c => c.code.toUpperCase() === code.trim().toUpperCase());

    if (idx === -1) return { success: false, message: 'Invalid gift code' };

    const gift = codes[idx];
    if (gift.usedBy) return { success: false, message: 'Gift code already used' };
    if (gift.expiresAt && new Date(gift.expiresAt).getTime() < Date.now()) {
      return { success: false, message: 'Gift code expired' };
    }

    gift.usedBy = userId;
    gift.usedAt = new Date().toISOString();

    writeLocal(KEYS.GIFT_CODES, codes);

    const user = getLocalUsers().find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };

    await updateUser(userId, {
      balance: (user.balance || 0) + gift.amount,
      cumulativeIncome: (user.cumulativeIncome || 0) + gift.amount
    } as any);

    await addTransaction({
      userId,
      type: 'gift',
      amount: gift.amount,
      status: 'completed',
      description: `Redeemed gift code ${gift.code}`
    } as any);

    return {
      success: true,
      message: `Successfully redeemed ${formatUGX(gift.amount)}`,
      amount: gift.amount
    };
  }

  const { data: codes } = await supabase.from('gift_codes').select('*');
  if (!codes) return { success: false, message: 'Invalid gift code' };

  const gift = codes.find((c: any) => c.code.toUpperCase() === code.trim().toUpperCase());
  if (!gift) return { success: false, message: 'Invalid gift code' };
  if (gift.used_by) return { success: false, message: 'Gift code already used' };
  if (gift.expires_at && new Date(gift.expires_at).getTime() < Date.now()) {
    return { success: false, message: 'Gift code expired' };
  }

  const { error: updateGiftError } = await supabase
    .from('gift_codes')
    .update({
      used_by: userId,
      used_at: new Date().toISOString()
    })
    .eq('id', gift.id);

  if (updateGiftError) throw updateGiftError;

  const { data: userRow } = await supabase.from('users').select('*').eq('id', userId).single();
  if (!userRow) return { success: false, message: 'User not found' };

  await updateUser(userId, {
    balance: Number(userRow.balance || 0) + Number(gift.amount || 0),
    cumulativeIncome: Number(userRow.cumulative_income || 0) + Number(gift.amount || 0)
  } as any);

  await addTransaction({
    userId,
    type: 'gift',
    amount: Number(gift.amount || 0),
    status: 'completed',
    description: `Redeemed gift code ${gift.code}`
  } as any);

  return {
    success: true,
    message: `Successfully redeemed ${formatUGX(gift.amount)}`,
    amount: Number(gift.amount || 0)
  };
}

export const redeemGift = redeemGiftCode;
export const redeemCode = redeemGiftCode;
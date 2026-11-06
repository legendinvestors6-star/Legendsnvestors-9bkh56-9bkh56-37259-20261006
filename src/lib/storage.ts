import type {
  User,
  Transaction,
  RechargeOrder,
  WithdrawOrder,
  UserProduct,
} from '@/types';
import {
  REGISTRATION_BONUS,
  LEVEL1_RATE,
  LEVEL2_RATE,
  LEVEL3_RATE,
  CHECKIN_REWARD,
} from '@/constants/products';
import { supabase } from './supabase';

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

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function initAdmin(): void {
  const users = getUsers();

  if (!users.some((user: any) => user?.isAdmin)) {
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
    } as any;

    saveUsers([...users, admin]);
  }
}

export function getUsers(): User[] {
  const users = safeParse<User[]>(localStorage.getItem(KEYS.USERS), []);

  if (users.length === 0) {
    try {
      const raw = localStorage.getItem('legend_user');

      if (raw) {
        const user = JSON.parse(raw) as any;

        if (user?.id) {
          return [
            {
              id: user.id,
              phone: user.phone,
              password: user.password || '',
              balance: Number(user.balance || 0),
              cumulativeIncome: Number(user.cumulativeIncome || 0),
              level: user.level || 1,
              referralCode: user.referral_code || user.referralCode || '',
              referredBy: user.referred_by || user.referredBy || undefined,
              checkInDays: user.checkInDays || 0,
              lastCheckIn: user.lastCheckIn || undefined,
              createdAt: user.created_at || new Date().toISOString(),
              isAdmin:
                user.phone === ADMIN_PHONE ||
                user.is_admin ||
                user.isAdmin ||
                false,
              bankCard: user.bankCard || null,
            } as User,
          ];
        }
      }
    } catch {}
  }

  return users;
}

export function saveUsers(users: User[]): void {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem('legend_user');

    if (raw) {
      const user: any = JSON.parse(raw);
      if (!user?.id) return null;

      return {
        id: user.id,
        phone: user.phone,
        password: user.password || '',
        balance: Number(user.balance || 0),
        cumulativeIncome: Number(user.cumulativeIncome || 0),
        level: user.level || 1,
        referralCode: user.referral_code || user.referralCode || '',
        referredBy: user.referred_by || user.referredBy || undefined,
        checkInDays: user.checkInDays || 0,
        lastCheckIn: user.lastCheckIn || undefined,
        createdAt: user.created_at || new Date().toISOString(),
        isAdmin:
          user.phone === ADMIN_PHONE || user.is_admin || user.isAdmin || false,
        bankCard: user.bankCard || null,
      } as User;
    }

    const id = localStorage.getItem(KEYS.CURRENT_USER);
    if (!id) return null;

    return getUsers().find((user) => user.id === id) || null;
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

export function updateUser(
  userId: string,
  updates: Partial<User>
): User | null {
  try {
    const raw = localStorage.getItem('legend_user');

    if (raw) {
      const current = JSON.parse(raw) as any;

      if (current.id === userId) {
        const updated = {
          ...current,
          ...updates,
          balance: updates.balance ?? current.balance,
          checkInDays: updates.checkInDays ?? current.checkInDays,
          cumulativeIncome:
            updates.cumulativeIncome ?? current.cumulativeIncome,
          lastCheckIn: updates.lastCheckIn ?? current.lastCheckIn,
        } as any;

        if (updates.referralCode) {
          updated.referral_code = updates.referralCode;
        }

        localStorage.setItem('legend_user', JSON.stringify(updated));

        const users = safeParse<User[]>(
          localStorage.getItem(KEYS.USERS),
          []
        );
        const index = users.findIndex((user) => user.id === userId);

        if (index < 0) {
          users.push(updated as any);
        } else {
          users[index] = { ...users[index], ...updates } as any;
        }

        saveUsers(users);
        return updated as User;
      }
    }
  } catch {}

  const users = getUsers();
  const index = users.findIndex((user) => user.id === userId);

  if (index < 0) {
    const current = getCurrentUser();

    if (current?.id === userId) {
      const merged = { ...current, ...updates } as User;
      saveUsers([...users, merged]);
      return merged;
    }

    return null;
  }

  users[index] = { ...users[index], ...updates };
  saveUsers(users);
  return users[index];
}

export function formatUGX(amount: number): string {
  try {
    return `UGX ${(Number(amount) || 0).toLocaleString()}`;
  } catch {
    return `UGX ${amount}`;
  }
}

/**
 * Reads the balance from the `users` table.
 * Returns null if the database lookup fails; it does not guess a balance.
 */
export async function getFreshBalanceFromSupabase(
  userId: string,
  _phone: string
): Promise<number | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Balance lookup failed:', error);
      return null;
    }

    if (!data) return null;

    const balance = Number(data.balance ?? 0);
    return Number.isFinite(balance) && balance >= 0 ? balance : null;
  } catch (error) {
    console.error('Balance lookup failed:', error);
    return null;
  }
}

export function registerUser(
  phone: string,
  password: string,
  referralCode?: string
): { success: boolean; message: string; user?: User } {
  initAdmin();

  const users = getUsers();

  if (users.some((user) => user.phone === phone)) {
    return { success: false, message: 'Phone number already registered' };
  }

  let referredBy: string | undefined;

  if (referralCode) {
    const referrer = users.find(
      (user) => user.referralCode === referralCode.toUpperCase()
    );
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
    isAdmin: false,
  } as any;

  saveUsers([...users, newUser]);
  setCurrentUser(newUser);

  addTransaction({
    userId: newUser.id,
    type: 'bonus',
    amount: REGISTRATION_BONUS,
    status: 'completed',
    description: `Registration bonus - ${formatUGX(REGISTRATION_BONUS)}`,
  } as any);

  // Only the `users` table is used for user accounts and balances.
  void supabase
    .from('users')
    .insert({
      id: newUser.id,
      phone: newUser.phone,
      password: newUser.password,
      balance: REGISTRATION_BONUS,
      referral_code: newUser.referralCode,
      referred_by: referredBy,
      created_at: newUser.createdAt,
    })
    .then(({ error }) => {
      if (error) console.error('User registration insert failed:', error);
    });

  return {
    success: true,
    message: `Registration successful - ${formatUGX(REGISTRATION_BONUS)} credited!`,
    user: newUser,
  };
}

export async function loginUser(
  phone: string,
  password: string
): Promise<{ success: boolean; message: string; user?: User }> {
  initAdmin();

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      console.error('Supabase login lookup failed:', error);
    }

    // Require the password to match; do not allow phone matching to bypass it.
    if (data && data.password === password) {
      const freshUser: any = {
        id: data.id,
        phone: data.phone,
        password: data.password,
        balance: Number(data.balance || 0),
        cumulativeIncome: Number(data.cumulative_income || 0),
        level: data.level || 1,
        referralCode: data.referral_code || 'N/A',
        referredBy: data.referred_by,
        createdAt: data.created_at,
        isAdmin: data.phone === ADMIN_PHONE || data.is_admin || false,
        bankCard: data.bank_card || null,
      };

      setCurrentUser(freshUser);

      const users = getUsers();
      const index = users.findIndex(
        (user) => user.id === freshUser.id || user.phone === freshUser.phone
      );

      if (index < 0) {
        users.push(freshUser);
      } else {
        users[index] = freshUser;
      }

      saveUsers(users);

      return {
        success: true,
        message: `Login successful - Synced ${formatUGX(freshUser.balance)}!`,
        user: freshUser,
      };
    }
  } catch (error) {
    console.error('Supabase login failed:', error);
  }

  const user = getUsers().find(
    (entry) => entry.phone === phone && entry.password === password
  );

  if (!user) {
    return { success: false, message: 'Incorrect phone number or password' };
  }

  setCurrentUser(user as any);
  return { success: true, message: 'Login successful', user };
}

export function getTransactions(userId?: string): Transaction[] {
  const transactions = safeParse<Transaction[]>(
    localStorage.getItem(KEYS.TRANSACTIONS),
    []
  );

  if (!userId) return transactions;
  return transactions.filter((transaction) => (transaction as any).userId === userId);
}

export function addTransaction(
  tx: Omit<Transaction, 'id' | 'createdAt'>
): Transaction {
  const transactions = getTransactions();
  const newTransaction: Transaction = {
    ...tx,
    id: generateId(),
    createdAt: new Date().toISOString(),
  } as any;

  localStorage.setItem(
    KEYS.TRANSACTIONS,
    JSON.stringify([newTransaction, ...transactions])
  );

  void supabase
    .from('transactions')
    .insert({
      id: newTransaction.id,
      user_id: (tx as any).userId,
      type: (tx as any).type,
      amount: (tx as any).amount,
      status: (tx as any).status,
      description: (tx as any).description,
      created_at: newTransaction.createdAt,
    })
    .then(({ error }) => {
      if (error) console.error('Transaction insert failed:', error);
    });

  return newTransaction;
}

export function getRechargeOrders(userId?: string): RechargeOrder[] {
  const orders = safeParse<RechargeOrder[]>(
    localStorage.getItem(KEYS.RECHARGE_ORDERS),
    []
  );

  if (!userId) return orders;
  return orders.filter((order) => (order as any).userId === userId);
}

export function createRechargeOrder(
  userId: string,
  amount: number,
  paymentMethod: string,
  phoneNumber: string
): RechargeOrder {
  const orders = getRechargeOrders();
  const orderId = generateId();

  const order: RechargeOrder = {
    id: orderId,
    userId,
    amount,
    paymentMethod,
    phoneNumber,
    status: 'pending',
    createdAt: new Date().toISOString(),
  } as any;

  localStorage.setItem(
    KEYS.RECHARGE_ORDERS,
    JSON.stringify([order, ...orders])
  );

  void supabase
    .from('investment_packages')
    .insert({
      id: orderId,
      user_id: userId,
      amount: Number(amount),
      product_name: 'RECHARGE',
      status: 'pending',
      payment_method: paymentMethod,
      phone_number: phoneNumber,
      submitted_at: order.createdAt,
    })
    .then(({ error }) => {
      if (error) console.error('Recharge order insert failed:', error);
    });

  return order;
}

export function approveRechargeOrder(orderId: string): boolean {
  const orders = getRechargeOrders();
  const index = orders.findIndex((order) => order.id === orderId);

  if (index < 0) {
    void supabase
      .from('investment_packages')
      .update({ status: 'completed' })
      .eq('id', orderId)
      .then(({ error }) => {
        if (error) console.error('Recharge status update failed:', error);
      });

    return true;
  }

  const order = orders[index];
  if (order.status === 'completed') return true;

  const users = getUsers();
  const userIndex = users.findIndex((user) => user.id === order.userId);

  if (userIndex < 0) {
    console.error('Cannot approve recharge: user not found locally');
    return false;
  }

  const newBalance =
    Number(users[userIndex].balance || 0) + Number(order.amount || 0);

  users[userIndex] = {
    ...users[userIndex],
    balance: newBalance,
    cumulativeIncome:
      Number((users[userIndex] as any).cumulativeIncome || 0) +
      Number(order.amount || 0),
  } as any;

  saveUsers(users);

  const current = getCurrentUser();
  if (current?.id === order.userId) {
    setCurrentUser({
      ...current,
      balance: newBalance,
      cumulativeIncome:
        Number(current.cumulativeIncome || 0) + Number(order.amount || 0),
    });
  }

  orders[index] = { ...order, status: 'completed' } as any;
  localStorage.setItem(KEYS.RECHARGE_ORDERS, JSON.stringify(orders));

  void supabase
    .from('users')
    .update({ balance: newBalance })
    .eq('id', order.userId)
    .then(({ error }) => {
      if (error) console.error('Recharge balance update failed:', error);
    });

  void supabase
    .from('investment_packages')
    .update({ status: 'completed' })
    .eq('id', orderId)
    .then(({ error }) => {
      if (error) console.error('Recharge status update failed:', error);
    });

  addTransaction({
    userId: order.userId,
    type: 'recharge',
    amount: order.amount,
    status: 'completed',
    description: `Recharge approved - ${formatUGX(order.amount)}`,
  } as any);

  return true;
}

export function rejectRechargeOrder(orderId: string): boolean {
  const orders = getRechargeOrders();
  const index = orders.findIndex((order) => order.id === orderId);

  if (index >= 0) {
    orders[index] = { ...orders[index], status: 'rejected' } as any;
    localStorage.setItem(KEYS.RECHARGE_ORDERS, JSON.stringify(orders));
  }

  void supabase
    .from('investment_packages')
    .update({ status: 'rejected' })
    .eq('id', orderId)
    .then(({ error }) => {
      if (error) console.error('Recharge rejection update failed:', error);
    });

  return true;
}

export function getWithdrawOrders(userId?: string): WithdrawOrder[] {
  return safeParse<WithdrawOrder[]>(
    localStorage.getItem(KEYS.WITHDRAW_ORDERS),
    []
  ).filter((order) => !userId || (order as any).userId === userId);
}

export function createWithdrawOrder(
  userId: string,
  amount: number
): { success: boolean; message: string; order?: WithdrawOrder } {
  const user = getUsers().find((entry) => entry.id === userId) || getCurrentUser();

  if (!user) return { success: false, message: 'User not found' };
  if (!(user as any).bankCard) {
    return { success: false, message: 'No bank card linked' };
  }
  if (amount < 9000) {
    return { success: false, message: 'Minimum withdrawal is UGX 9,000' };
  }
  if (amount > user.balance) {
    return { success: false, message: 'Insufficient balance' };
  }

  const newBalance = Number(user.balance || 0) - amount;
  const fee = Math.floor(amount * 0.16);
  const order: WithdrawOrder = {
    id: generateId(),
    userId,
    amount,
    receivedAmount: amount - fee,
    fee,
    bankCard: (user as any).bankCard,
    status: 'pending',
    createdAt: new Date().toISOString(),
  } as any;

  localStorage.setItem(
    KEYS.WITHDRAW_ORDERS,
    JSON.stringify([order, ...getWithdrawOrders()])
  );

  updateUser(userId, { balance: newBalance } as any);

  void supabase
    .from('withdraw_orders')
    .insert({
      id: order.id,
      user_id: userId,
      amount,
      phone_number: (user as any).phone,
      status: 'pending',
      created_at: order.createdAt,
    })
    .then(({ error }) => {
      if (error) console.error('Withdrawal insert failed:', error);
    });

  void supabase
    .from('users')
    .update({ balance: newBalance })
    .eq('id', userId)
    .then(({ error }) => {
      if (error) console.error('Withdrawal balance update failed:', error);
    });

  return { success: true, message: 'Withdrawal submitted', order };
}

export function approveWithdrawOrder(orderId: string): boolean {
  const orders = getWithdrawOrders();
  const index = orders.findIndex((order) => order.id === orderId);

  if (index >= 0) {
    orders[index] = { ...orders[index], status: 'completed' } as any;
    localStorage.setItem(KEYS.WITHDRAW_ORDERS, JSON.stringify(orders));
  }

  void supabase
    .from('withdraw_orders')
    .update({ status: 'completed' })
    .eq('id', orderId)
    .then(({ error }) => {
      if (error) console.error('Withdrawal status update failed:', error);
    });

  return true;
}

export function rejectWithdrawOrder(orderId: string): boolean {
  const orders = getWithdrawOrders();
  const index = orders.findIndex((order) => order.id === orderId);

  if (index < 0) {
    void supabase
      .from('withdraw_orders')
      .update({ status: 'rejected' })
      .eq('id', orderId)
      .then(({ error }) => {
        if (error) console.error('Withdrawal status update failed:', error);
      });

    return true;
  }

  const order = orders[index];
  orders.splice(index, 1);
  localStorage.setItem(KEYS.WITHDRAW_ORDERS, JSON.stringify(orders));

  const user = getUsers().find((entry) => entry.id === order.userId);
  if (user) {
    const newBalance = Number(user.balance || 0) + Number(order.amount || 0);
    updateUser(order.userId, { balance: newBalance } as any);

    void supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', order.userId)
      .then(({ error }) => {
        if (error) console.error('Withdrawal refund update failed:', error);
      });
  }

  void supabase
    .from('withdraw_orders')
    .update({ status: 'rejected' })
    .eq('id', orderId)
    .then(({ error }) => {
      if (error) console.error('Withdrawal status update failed:', error);
    });

  return true;
}

export function getUserProducts(userId?: string): UserProduct[] {
  if (userId) creditDailyIncome(userId);

  return safeParse<UserProduct[]>(
    localStorage.getItem(KEYS.USER_PRODUCTS),
    []
  ).filter((product) => !userId || (product as any).userId === userId);
}

export function saveUserProducts(products: UserProduct[]): void {
  localStorage.setItem(KEYS.USER_PRODUCTS, JSON.stringify(products));
}

export function creditDailyIncome(userId: string): { credited: number } {
  try {
    const user = getUsers().find((entry) => entry.id === userId) || getCurrentUser();
    if (!user || user.id !== userId) return { credited: 0 };

    const allProducts = safeParse<any[]>(
      localStorage.getItem(KEYS.USER_PRODUCTS),
      []
    );
    const products = allProducts.filter(
      (product) => product.userId === userId && product.status === 'active'
    );

    if (!products.length) return { credited: 0 };

    const now = Date.now();
    let totalToCredit = 0;
    let productsUpdated = false;

    for (const product of products) {
      const purchaseTime = new Date(
        product.purchasedAt || product.purchaseDate || product.createdAt
      ).getTime();

      const lastCreditTime = product.lastIncomeAt
        ? new Date(product.lastIncomeAt).getTime()
        : purchaseTime;

      const endTime = new Date(
        product.endDate ||
          purchaseTime + (product.term || 30) * 24 * 60 * 60 * 1000
      ).getTime();

      if (now > endTime) {
        product.status = 'expired';
        productsUpdated = true;
        continue;
      }

      const daysMissed = Math.floor(
        (now - lastCreditTime) / (24 * 60 * 60 * 1000)
      );

      if (daysMissed <= 0) continue;

      let incomeForProduct = 0;

      for (let day = 1; day <= daysMissed; day++) {
        const creditTime = lastCreditTime + day * 24 * 60 * 60 * 1000;

        if (creditTime <= now && creditTime <= endTime) {
          incomeForProduct += Number(product.dailyIncome || 0);
          product.daysPaid = (product.daysPaid || 0) + 1;
          product.totalEarned =
            (product.totalEarned || 0) + Number(product.dailyIncome || 0);
        }
      }

      if (incomeForProduct > 0) {
        totalToCredit += incomeForProduct;
        product.lastIncomeAt = new Date(
          lastCreditTime + daysMissed * 24 * 60 * 60 * 1000
        ).toISOString();
        product.nextIncomeAt = new Date(
          new Date(product.lastIncomeAt).getTime() + 24 * 60 * 60 * 1000
        ).toISOString();
        productsUpdated = true;
      }
    }

    if (productsUpdated) {
      const otherUsersProducts = allProducts.filter(
        (product) => product.userId !== userId
      );
      localStorage.setItem(
        KEYS.USER_PRODUCTS,
        JSON.stringify([...products, ...otherUsersProducts])
      );
    }

    if (totalToCredit <= 0) return { credited: 0 };

    const newBalance = Number(user.balance || 0) + totalToCredit;

    updateUser(userId, {
      balance: newBalance,
      cumulativeIncome:
        Number(user.cumulativeIncome || 0) + totalToCredit,
    } as any);

    void supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId)
      .then(({ error }) => {
        if (error) console.error('Daily income balance update failed:', error);
      });

    addTransaction({
      userId,
      type: 'daily-income',
      amount: totalToCredit,
      status: 'completed',
      description: `Daily income - ${products.length} products`,
    } as any);

    return { credited: totalToCredit };
  } catch (error) {
    console.error('Daily income processing failed:', error);
    return { credited: 0 };
  }
}

export function getNextPayoutMs(userId?: string): number {
  if (!userId) return 0;

  const products = safeParse<any[]>(
    localStorage.getItem(KEYS.USER_PRODUCTS),
    []
  ).filter(
    (product) => product.userId === userId && product.status === 'active'
  );

  if (!products.length) return 0;

  const now = Date.now();
  let nextMs = Infinity;

  for (const product of products) {
    const last = product.lastIncomeAt
      ? new Date(product.lastIncomeAt).getTime()
      : new Date(product.purchasedAt || product.purchaseDate).getTime();

    const remaining = last + 24 * 60 * 60 * 1000 - now;
    if (remaining > 0 && remaining < nextMs) nextMs = remaining;
  }

  return nextMs === Infinity ? 0 : nextMs;
}

export function performCheckIn(
  userId: string
): { success: boolean; reward?: number; message?: string } {
  try {
    const user = getUsers().find((entry) => entry.id === userId) || getCurrentUser();

    if (!user) return { success: false, message: 'User not found' };

    const today = new Date().toDateString();

    if ((user as any).lastCheckIn === today) {
      return { success: false, message: 'Already checked in today' };
    }

    const reward = CHECKIN_REWARD || 300;
    const newBalance = Number(user.balance || 0) + reward;

    updateUser(userId, {
      balance: newBalance,
      cumulativeIncome: Number(user.cumulativeIncome || 0) + reward,
      lastCheckIn: today,
      checkInDays: ((user as any).checkInDays || 0) + 1,
    } as any);

    void supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId)
      .then(({ error }) => {
        if (error) console.error('Check-in balance update failed:', error);
      });

    addTransaction({
      userId,
      type: 'checkin',
      amount: reward,
      status: 'completed',
      description: 'Daily check-in reward',
    } as any);

    return { success: true, reward };
  } catch {
    return { success: false, message: 'Check-in failed' };
  }
}

/**
 * Requires a Supabase `purchase_product` RPC that uses `users.balance` and
 * creates the product in `user_products` atomically.
 */
export async function purchaseProduct(
  userId: string,
  productId: number,
  price: number,
  dailyIncome: number,
  term: number
): Promise<{ success: boolean; message: string }> {
  try {
    const user = getCurrentUser();

    if (!user || user.id !== userId) {
      return { success: false, message: 'Not logged in as this user' };
    }

    if (
      !Number.isFinite(productId) ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(dailyIncome) ||
      !Number.isFinite(term) ||
      term <= 0
    ) {
      return { success: false, message: 'Invalid product details' };
    }

    const { data, error } = await supabase.rpc('purchase_product', {
      p_user_id: userId,
      p_product_id: productId,
      p_price: price,
      p_daily_income: dailyIncome,
      p_term: term,
    });

    if (error) {
      console.error('Purchase RPC failed:', error);
      return { success: false, message: `Purchase failed: ${error.message}` };
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result?.success) {
      return {
        success: false,
        message: result?.message || 'Purchase failed',
      };
    }

    const newBalance = Number(result.new_balance);

    if (!Number.isFinite(newBalance) || newBalance < 0) {
      console.error('Invalid purchase RPC response:', result);
      return {
        success: false,
        message: 'Purchase failed: invalid balance returned',
      };
    }

    // Update browser storage only after Supabase confirms the purchase.
    const updatedUser = { ...user, balance: newBalance };
    setCurrentUser(updatedUser);

    const users = getUsers();
    const userIndex = users.findIndex((entry) => entry.id === userId);

    if (userIndex >= 0) {
      users[userIndex] = { ...users[userIndex], balance: newBalance };
      saveUsers(users);
    }

    // Retain a local product record for existing UI code that reads local data.
    const now = new Date();
    const endDate = new Date(now.getTime() + term * 24 * 60 * 60 * 1000);
    const localProduct: any = {
      id: generateId(),
      userId,
      productId,
      price,
      dailyIncome,
      term,
      purchasedAt: now.toISOString(),
      purchaseDate: now.toISOString(),
      endDate: endDate.toISOString(),
      nextIncomeAt: new Date(
        now.getTime() + 24 * 60 * 60 * 1000
      ).toISOString(),
      lastIncomeAt: null,
      totalEarned: 0,
      daysPaid: 0,
      status: 'active',
    };

    const products = safeParse<UserProduct[]>(
      localStorage.getItem(KEYS.USER_PRODUCTS),
      []
    );
    saveUserProducts([localProduct, ...products]);

    sessionStorage.setItem(
      'legend_no_sync_until',
      String(Date.now() + 30000)
    );

    addTransaction({
      userId,
      type: 'purchase',
      amount: price,
      status: 'completed',
      description: `Purchased VIP${productId} - ${formatUGX(price)} - New ${formatUGX(newBalance)}`,
    } as any);

    return {
      success: true,
      message: `VIP${productId} purchased! New balance ${formatUGX(newBalance)}`,
    };
  } catch (error: any) {
    console.error('purchaseProduct error:', error);
    return {
      success: false,
      message: error?.message || 'Purchase failed',
    };
  }
}

export function getPasswordResets(): PasswordResetRequest[] {
  return safeParse<PasswordResetRequest[]>(
    localStorage.getItem(KEYS.PASSWORD_RESETS),
    []
  );
}

export function createPasswordResetRequest(
  phone: string,
  newPassword: string,
  note?: string
): PasswordResetRequest {
  const requests = getPasswordResets();
  const request: PasswordResetRequest = {
    id: generateId(),
    phone,
    newPassword,
    status: 'pending',
    createdAt: new Date().toISOString(),
    note,
  };

  localStorage.setItem(
    KEYS.PASSWORD_RESETS,
    JSON.stringify([request, ...requests])
  );

  return request;
}

export function approvePasswordReset(id: string): boolean {
  const requests = getPasswordResets();
  const index = requests.findIndex((request) => request.id === id);

  if (index < 0) return false;

  requests[index].status = 'approved';
  requests[index].resolvedAt = new Date().toISOString();
  localStorage.setItem(KEYS.PASSWORD_RESETS, JSON.stringify(requests));

  const request = requests[index];
  const users = getUsers();
  const userIndex = users.findIndex((user) => user.phone === request.phone);

  if (userIndex >= 0) {
    users[userIndex].password = request.newPassword;
    saveUsers(users);
  }

  return true;
}

export function rejectPasswordReset(
  id: string,
  note?: string
): boolean {
  const requests = getPasswordResets();
  const index = requests.findIndex((request) => request.id === id);

  if (index < 0) return false;

  requests[index].status = 'rejected';
  requests[index].resolvedAt = new Date().toISOString();
  requests[index].note = note || requests[index].note;

  localStorage.setItem(KEYS.PASSWORD_RESETS, JSON.stringify(requests));
  return true;
}

export function getTeamMembers(userId: string) {
  const users = getUsers();

  const level1 = users.filter(
    (user) =>
      user.referredBy === userId ||
      (user as any).referred_by === userId
  );
  const level1Ids = level1.map((user) => user.id);

  const level2 = users.filter(
    (user) =>
      level1Ids.includes(user.referredBy as any) ||
      level1Ids.includes((user as any).referred_by)
  );
  const level2Ids = level2.map((user) => user.id);

  const level3 = users.filter(
    (user) =>
      level2Ids.includes(user.referredBy as any) ||
      level2Ids.includes((user as any).referred_by)
  );

  return { level1, level2, level3 };
}

export function getTeamCommissions(userId: string) {
  const { level1, level2, level3 } = getTeamMembers(userId);
  const sumBalances = (users: User[]) =>
    users.reduce((sum, user) => sum + (user.balance || 0), 0);

  return {
    level1: Math.floor(sumBalances(level1) * (LEVEL1_RATE || 0.27)),
    level2: Math.floor(sumBalances(level2) * (LEVEL2_RATE || 0.02)),
    level3: Math.floor(sumBalances(level3) * (LEVEL3_RATE || 0.01)),
  };
}

export function getGiftCodes(): GiftCode[] {
  const raw = localStorage.getItem(KEYS.GIFT_CODES);
  if (!raw) return [];

  try {
    const codes = JSON.parse(raw) as GiftCode[];
    const now = Date.now();

    const validCodes = codes.filter((code) => {
      if (code.usedBy || !code.expiresAt) return true;
      return new Date(code.expiresAt).getTime() > now;
    });

    if (validCodes.length !== codes.length) {
      localStorage.setItem(KEYS.GIFT_CODES, JSON.stringify(validCodes));
    }

    return validCodes;
  } catch {
    return [];
  }
}

export function createGiftCode(
  amount: number,
  note?: string,
  expiresAt?: string,
  customCode?: string
): GiftCode {
  const codes = getGiftCodes();
  const code = customCode?.trim().toUpperCase() || generateReferralCode();

  if (codes.some((entry) => entry.code === code && !entry.usedBy)) {
    throw new Error('Code exists');
  }

  const giftCode: GiftCode = {
    id: generateId(),
    code,
    amount: Number(amount),
    createdAt: new Date().toISOString(),
    note: note || '',
    expiresAt:
      expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };

  localStorage.setItem(
    KEYS.GIFT_CODES,
    JSON.stringify([giftCode, ...codes])
  );

  return giftCode;
}

export function deleteGiftCode(id: string): boolean {
  const codes = getGiftCodes();
  const index = codes.findIndex((code) => code.id === id);

  if (index < 0) return false;

  codes.splice(index, 1);
  localStorage.setItem(KEYS.GIFT_CODES, JSON.stringify(codes));
  return true;
}

export function useGiftCode(
  code: string,
  userId: string
): { success: boolean; amount?: number; message?: string } {
  const codes = getGiftCodes();
  const giftCode = codes.find(
    (entry) => entry.code.toUpperCase() === code.toUpperCase()
  );

  if (!giftCode) return { success: false, message: 'Invalid code' };
  if (giftCode.usedBy) return { success: false, message: 'Already used' };

  if (
    giftCode.expiresAt &&
    new Date(giftCode.expiresAt).getTime() < Date.now()
  ) {
    return { success: false, message: 'Expired' };
  }

  giftCode.usedBy = userId;
  giftCode.usedAt = new Date().toISOString();
  localStorage.setItem(KEYS.GIFT_CODES, JSON.stringify(codes));

  return { success: true, amount: giftCode.amount };
}

export async function redeemGiftCode(
  userId: string,
  enteredCode: string
): Promise<{ success: boolean; amount?: number; message?: string }> {
  try {
    const code = enteredCode.trim().toUpperCase();
    if (!code) return { success: false, message: 'Enter code' };

    const codes = getGiftCodes();
    const giftCode = codes.find((entry) => entry.code.toUpperCase() === code);

    if (!giftCode) return { success: false, message: 'Invalid gift code' };
    if (giftCode.usedBy) {
      return { success: false, message: 'Code already used!' };
    }

    if (
      giftCode.expiresAt &&
      new Date(giftCode.expiresAt).getTime() < Date.now()
    ) {
      return { success: false, message: 'Code expired!' };
    }

    const user = getUsers().find((entry) => entry.id === userId);
    if (!user) return { success: false, message: 'User not found' };

    const newBalance =
      Number(user.balance || 0) + Number(giftCode.amount || 0);

    const { error } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (error) {
      console.error('Gift balance update failed:', error);
      return { success: false, message: `Redeem failed: ${error.message}` };
    }

    giftCode.usedBy = userId;
    giftCode.usedAt = new Date().toISOString();
    localStorage.setItem(KEYS.GIFT_CODES, JSON.stringify(codes));

    updateUser(userId, { balance: newBalance } as any);

    return {
      success: true,
      amount: giftCode.amount,
      message: `Success! +UGX ${Number(giftCode.amount).toLocaleString()} added!`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Redeem failed',
    };
  }
}

export const createPasswordReset = createPasswordResetRequest;

export function getPasswordResetStatus(phone: string) {
  return getPasswordResets().find((request) => request.phone === phone) || null;
}

export { supabase };

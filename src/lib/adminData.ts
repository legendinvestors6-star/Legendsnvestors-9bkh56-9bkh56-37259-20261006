import { supabase } from '@/lib/supabase';
import type { AdminStats } from '@/types/admin';

export interface RedeemCode {
  id: string;
  code: string;
  amount: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

type RechargeStatus = 'pending' | 'completed' | 'failed';

const RECHARGE_PRODUCT_NAME = 'RECHARGE';

function throwIfError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

// Auth - existing client-side session marker.
// IMPORTANT: this is only a UI convenience, not secure authorization.
// Protect database access with Supabase Auth and appropriate RLS policies.
export function isAdminLoggedIn() {
  return typeof localStorage !== 'undefined' &&
    localStorage.getItem('admin_session') === 'true';
}

export function adminLogin(phone: string, password?: string) {
  // Replace this hard-coded client-side check with server-side authentication.
  // Credentials embedded in frontend code can be discovered by users.
  if (phone === '0746085840' && password === '0746085840@stanley') {
    localStorage.setItem('admin_session', 'true');
    return true;
  }

  return false;
}

export function adminLogout() {
  localStorage.removeItem('admin_session');
  localStorage.removeItem('admin_logged');
}

// ===== ADMIN STATS =====
export async function getAdminStats(): Promise<AdminStats> {
  try {
    const [
      usersResult,
      packagesResult,
      completedDepositsResult,
      pendingRechargesResult,
      withdrawalsResult,
      referralsResult,
    ] = await Promise.all([
      supabase
        .from('platform_users')
        .select(
          'id, wallet_balance, total_earnings, referral_earnings, cumulative_income',
          { count: 'exact' }
        ),

      supabase
        .from('investment_packages')
        .select('status, amount, product_name, total_earned, daily_income'),

      // Automatic recharge flow marks successful payments "completed".
      supabase
        .from('investment_packages')
        .select('amount')
        .eq('product_name', RECHARGE_PRODUCT_NAME)
        .eq('status', 'completed'),

      supabase
        .from('investment_packages')
        .select('amount')
        .eq('product_name', RECHARGE_PRODUCT_NAME)
        .eq('status', 'pending'),

      supabase
        .from('withdrawal_requests')
        .select('amount, status'),

      supabase
        .from('platform_users')
        .select('referral_earnings'),
    ]);

    throwIfError(usersResult.error, 'Could not load users');
    throwIfError(packagesResult.error, 'Could not load packages');
    throwIfError(completedDepositsResult.error, 'Could not load completed recharges');
    throwIfError(pendingRechargesResult.error, 'Could not load pending recharges');
    throwIfError(withdrawalsResult.error, 'Could not load withdrawals');
    throwIfError(referralsResult.error, 'Could not load referral earnings');

    const users = usersResult.data || [];
    const allPackages = packagesResult.data || [];
    const deposits = completedDepositsResult.data || [];
    const pendingRecharges = pendingRechargesResult.data || [];
    const withdrawals = withdrawalsResult.data || [];
    const referralData = referralsResult.data || [];

    const activePackages = allPackages.filter(
      (pkg: any) =>
        pkg.status === 'active' &&
        pkg.product_name !== RECHARGE_PRODUCT_NAME
    ).length;

    const pendingPackages = allPackages.filter(
      (pkg: any) => pkg.status === 'pending'
    ).length;

    const totalDeposits = deposits.reduce(
      (sum: number, row: any) => sum + Number(row.amount || 0),
      0
    );

    const totalWithdrawals = withdrawals
      .filter((row: any) => row.status === 'approved')
      .reduce(
        (sum: number, row: any) => sum + Number(row.amount || 0),
        0
      );

    const pendingWithdrawals = withdrawals.filter(
      (row: any) => row.status === 'pending'
    ).length;

    const earningsFromPackages = allPackages.reduce(
      (sum: number, row: any) =>
        sum + Number(row.total_earned || 0) + Number(row.daily_income || 0),
      0
    );

    const earningsFromUsers = users.reduce(
      (sum: number, user: any) =>
        sum +
        Number(user.total_earnings || 0) +
        Number(user.cumulative_income || 0),
      0
    );

    const totalReferralEarnings = referralData.reduce(
      (sum: number, user: any) => sum + Number(user.referral_earnings || 0),
      0
    );

    return {
      totalUsers: usersResult.count ?? users.length,
      totalActivePackages: activePackages,
      totalPendingPackages: pendingPackages,
      totalEarningsDistributed: earningsFromPackages + earningsFromUsers,
      totalDeposits,
      totalWithdrawals,
      pendingWithdrawals,
      totalReferralEarnings,
      pendingPesaJetAmount: pendingRecharges.reduce(
        (sum: number, row: any) => sum + Number(row.amount || 0),
        0
      ),
    } as AdminStats;
  } catch (error) {
    console.error('getAdminStats error:', error);

    return {
      totalUsers: 0,
      totalActivePackages: 0,
      totalPendingPackages: 0,
      totalEarningsDistributed: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      pendingWithdrawals: 0,
      totalReferralEarnings: 0,
    } as AdminStats;
  }
}

export async function processDailyIncome() {
  try {
    const { error } = await supabase.rpc('process_daily_income');

    if (error) {
      return { error: error.message, message: '' };
    }

    return {
      message: 'Daily income processed - Earnings distributed!',
      error: '',
    };
  } catch (error: any) {
    return { error: error?.message || 'Could not process daily income', message: '' };
  }
}

async function attachUsers(list: any[]) {
  if (!list?.length) return [];

  const ids = [...new Set(list.map((row: any) => row.user_id).filter(Boolean))];
  if (!ids.length) return list;

  const { data: users, error } = await supabase
    .from('platform_users')
    .select('*')
    .in('id', ids);

  if (error) {
    console.error('Could not attach users to admin records:', error.message);
    return list;
  }

  const userMap = new Map((users || []).map((user: any) => [user.id, user]));

  return list.map((row: any) => {
    const user: any = userMap.get(row.user_id) || {};
    const phoneNumber =
      row.phone_number ||
      row.phone ||
      user.phone ||
      user.phone_number ||
      '';

    return {
      ...row,
      user_email: row.user_email || user.email,
      user_phone:
        row.user_phone ||
        user.phone ||
        user.mobile ||
        user.whatsapp ||
        user.phone_number,
      user_name:
        row.user_name ||
        user.full_name ||
        user.username ||
        user.name ||
        user.email,
      user_joined: user.created_at,
      user_wallet: user.wallet_balance,
      user_referral_code: user.referral_code || user.own_referral_code,
      referred_by: user.referred_by,
      user_obj: user,
      payment_method:
        row.payment_method ||
        row.network ||
        (phoneNumber ? 'Mobile Money' : 'PesaJet'),
      phone_number: phoneNumber,
    };
  });
}

// ===== INVESTMENT PACKAGES =====
export async function getPackages(status?: string) {
  let query = supabase
    .from('investment_packages')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Could not load packages:', error.message);
    return [];
  }

  return attachUsers(data || []);
}

export const getAllPackages = getPackages;
export const getPayments = getPackages;

/**
 * Updates only non-recharge package statuses.
 * Recharge statuses are controlled by the verified server-side payment flow.
 */
export async function updatePackageStatus(id: string, status: string) {
  const { data: packageRow, error: lookupError } = await supabase
    .from('investment_packages')
    .select('product_name')
    .eq('id', id)
    .maybeSingle();

  throwIfError(lookupError, 'Could not check package');

  if (!packageRow) {
    throw new Error('Package not found');
  }

  if (packageRow.product_name === RECHARGE_PRODUCT_NAME) {
    throw new Error(
      'Recharge status is controlled by the verified payment webhook.'
    );
  }

  const { error } = await supabase
    .from('investment_packages')
    .update({ status })
    .eq('id', id);

  throwIfError(error, 'Could not update package status');
}

export async function approvePackage(id: string) {
  return updatePackageStatus(id, 'active');
}

export async function rejectPackage(id: string) {
  return updatePackageStatus(id, 'rejected');
}

export async function deletePackage(id: string) {
  const { data: packageRow, error: lookupError } = await supabase
    .from('investment_packages')
    .select('product_name')
    .eq('id', id)
    .maybeSingle();

  throwIfError(lookupError, 'Could not check package');

  if (!packageRow) {
    throw new Error('Package not found');
  }

  if (packageRow.product_name === RECHARGE_PRODUCT_NAME) {
    throw new Error(
      'Recharge records cannot be deleted from the admin client.'
    );
  }

  const { error } = await supabase
    .from('investment_packages')
    .delete()
    .eq('id', id);

  throwIfError(error, 'Could not delete package');
}

export async function extendPackage(id: string, days = 30) {
  const { data: packageRow, error: lookupError } = await supabase
    .from('investment_packages')
    .select('product_name, expires_at, end_date')
    .eq('id', id)
    .maybeSingle();

  throwIfError(lookupError, 'Could not load package');

  if (!packageRow) {
    throw new Error('Package not found');
  }

  if (packageRow.product_name === RECHARGE_PRODUCT_NAME) {
    throw new Error('Recharge records cannot be extended.');
  }

  const baseDate =
    packageRow.expires_at ||
    packageRow.end_date ||
    new Date().toISOString();

  const newDate = new Date(baseDate);
  newDate.setDate(newDate.getDate() + days);

  const { error } = await supabase
    .from('investment_packages')
    .update({
      expires_at: newDate.toISOString(),
      end_date: newDate.toISOString(),
    })
    .eq('id', id);

  throwIfError(error, 'Could not extend package');
}

// ===== USERS =====
export async function getUsers() {
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Could not load users:', error.message);
    return [];
  }

  return data || [];
}

export const getAllUsers = getUsers;

export async function deleteUser(id: string) {
  const { error } = await supabase
    .from('platform_users')
    .delete()
    .eq('id', id);

  throwIfError(error, 'Could not delete user');
}

export async function banUser(id: string, isCurrentlyBanned?: boolean) {
  const blocked = !isCurrentlyBanned;
  const { error } = await supabase
    .from('platform_users')
    .update({ is_blocked: blocked, is_banned: blocked })
    .eq('id', id);

  if (error) {
    console.error('Could not update user block status:', error.message);
    throw error;
  }
}

export async function unbanUser(id: string) {
  const { error } = await supabase
    .from('platform_users')
    .update({ is_blocked: false, is_banned: false })
    .eq('id', id);

  throwIfError(error, 'Could not unblock user');
}

export async function blockUser(id: string) {
  return banUser(id, false);
}

export async function unblockUser(id: string) {
  return unbanUser(id);
}

export async function adjustUserBalance(
  userId: string,
  amount: number,
  type?: 'add' | 'deduct'
) {
  try {
    const { data: user, error: readError } = await supabase
      .from('platform_users')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (readError) return { error: readError.message };
    if (!user) return { error: 'User not found' };

    const currentBalance = Number(user.wallet_balance || 0);
    const absAmount = Math.abs(Number(amount));
    let newBalance =
      type === 'deduct'
        ? currentBalance - absAmount
        : type === 'add'
          ? currentBalance + absAmount
          : currentBalance + Number(amount);

    newBalance = Math.max(0, newBalance);

    const { error: updateError } = await supabase
      .from('platform_users')
      .update({ wallet_balance: newBalance })
      .eq('id', userId);

    if (updateError) return { error: updateError.message };

    return { error: '' };
  } catch (error: any) {
    return { error: error?.message || 'Failed to adjust balance' };
  }
}

export async function addUserBalance(id: string, amount: number) {
  return adjustUserBalance(id, Math.abs(amount), 'add');
}

export async function deductUserBalance(id: string, amount: number) {
  return adjustUserBalance(id, Math.abs(amount), 'deduct');
}

// ===== PESAJET RECHARGES — READ-ONLY IN ADMIN =====
export async function getRecharges(status?: string) {
  let query = supabase
    .from('investment_packages')
    .select('*')
    .eq('product_name', RECHARGE_PRODUCT_NAME)
    .order('submitted_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Could not load recharge records:', error.message);
    return [];
  }

  return attachUsers(data || []);
}

export const getRechargeRequests = getRecharges;

export async function getPesaJetPendings() {
  return getRecharges('pending');
}

/**
 * Kept as a compatibility export for existing imports.
 * It deliberately refuses client-side status changes and wallet credits.
 */
export async function updateRechargeStatus(
  _id: string,
  _status: RechargeStatus | string
): Promise<never> {
  throw new Error(
    'Recharge status is updated only by the verified server-side payment flow.'
  );
}

export async function approveRecharge(_id: string): Promise<never> {
  throw new Error(
    'Manual recharge approval is disabled. The verified payment webhook handles completion and wallet credit.'
  );
}

export async function rejectRecharge(_id: string): Promise<never> {
  throw new Error(
    'Manual recharge rejection is disabled. Recharge outcomes must come from the payment provider callback.'
  );
}

export async function deleteRecharge(_id: string): Promise<never> {
  throw new Error(
    'Recharge deletion is disabled so payment records remain available for reconciliation.'
  );
}

// ===== WITHDRAWALS =====
export async function getWithdrawals() {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Could not load withdrawals:', error.message);
    return [];
  }

  return attachUsers(data || []);
}

export const getWithdrawalRequests = getWithdrawals;

export async function updateWithdrawalStatus(id: string, status: string) {
  const { error } = await supabase
    .from('withdrawal_requests')
    .update({ status })
    .eq('id', id);

  throwIfError(error, 'Could not update withdrawal status');
}

export async function approveWithdrawal(id: string) {
  const { data: request, error: requestError } = await supabase
    .from('withdrawal_requests')
    .select('id, user_id, amount, status')
    .eq('id', id)
    .single();

  throwIfError(requestError, 'Could not load withdrawal request');

  if (request.status === 'approved') return;

  if (request.user_id && Number(request.amount) > 0) {
    const { data: user, error: userError } = await supabase
      .from('platform_users')
      .select('wallet_balance')
      .eq('id', request.user_id)
      .single();

    throwIfError(userError, 'Could not load user wallet');

    const newBalance = Math.max(
      0,
      Number(user.wallet_balance || 0) - Number(request.amount)
    );

    const { error: balanceError } = await supabase
      .from('platform_users')
      .update({ wallet_balance: newBalance })
      .eq('id', request.user_id);

    throwIfError(balanceError, 'Could not update user wallet');
  }

  const { error } = await supabase
    .from('withdrawal_requests')
    .update({ status: 'approved' })
    .eq('id', id)
    .eq('status', 'pending');

  throwIfError(error, 'Could not approve withdrawal');
}

export async function rejectWithdrawal(id: string) {
  return updateWithdrawalStatus(id, 'rejected');
}

export async function deleteWithdrawal(id: string) {
  const { error } = await supabase
    .from('withdrawal_requests')
    .delete()
    .eq('id', id);

  throwIfError(error, 'Could not delete withdrawal');
}

export const deleteWithdrawals = deleteWithdrawal;
export const deleteRecharges = deleteRecharge;

// ===== MISSIONS =====
export async function getMissions() {
  const { data, error } = await supabase.from('missions').select('*');

  if (error) {
    console.error('Could not load missions:', error.message);
    return [];
  }

  return data || [];
}

export async function createMission(data: any) {
  const { data: mission, error } = await supabase
    .from('missions')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Could not create mission:', error.message);
    return null;
  }

  return mission;
}

export async function deleteMission(id: string) {
  const { error } = await supabase.from('missions').delete().eq('id', id);
  throwIfError(error, 'Could not delete mission');
}

export async function sendBroadcast(_message: string) {
  // Not implemented.
}

export async function getBroadcasts() {
  return [];
}

// ===== REDEEM CODES =====
export async function getRedeems(): Promise<RedeemCode[]> {
  const { data, error } = await supabase
    .from('redeem_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Could not load redeem codes:', error.message);
    return [];
  }

  return (data || []) as RedeemCode[];
}

export async function createRedeemCode(
  amount: number,
  maxUses: number,
  customCode?: string
): Promise<RedeemCode | null> {
  const code =
    customCode?.trim().toUpperCase() ||
    `SEP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  if (!/^[A-Z0-9-]{3,20}$/.test(code)) return null;

  const { data: existingCode, error: lookupError } = await supabase
    .from('redeem_codes')
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (lookupError || existingCode) return null;

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('redeem_codes')
    .insert({
      code,
      amount,
      max_uses: maxUses,
      used_count: 0,
      is_active: true,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error('Could not create redeem code:', error.message);
    return null;
  }

  return data as RedeemCode;
}

export async function deleteRedeemCode(id: string) {
  const { error } = await supabase
    .from('redeem_codes')
    .delete()
    .eq('id', id);

  throwIfError(error, 'Could not delete redeem code');
}

export async function toggleRedeemCode(id: string, currentValue: boolean) {
  const { error } = await supabase
    .from('redeem_codes')
    .update({ is_active: !currentValue })
    .eq('id', id);

  throwIfError(error, 'Could not update redeem code');
}

/**
 * Referral commissions must be handled in the same trusted database
 * transaction as the verified recharge completion—not from browser code.
 * Kept as a compatibility export for old imports, but intentionally disabled.
 */
export async function creditReferralCommission(
  _userId: string,
  _amount: number
): Promise<never> {
  throw new Error(
    'Client-side referral crediting is disabled. Handle commissions in the trusted recharge completion function.'
  );
}

// ===== TEAM =====
export async function getUserTeam(userId: string) {
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('referred_by', userId);

  if (error) {
    console.error('Could not load user team:', error.message);
    return [];
  }

  return data || [];
      }

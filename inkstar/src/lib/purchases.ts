import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isUserCancelledError,
  type Purchase,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
} from 'expo-iap';
import { Platform } from 'react-native';

/**
 * StoreKit directly, no intermediary. One entitlement ("Plus") sold three ways;
 * the product IDs match App Store Connect.
 */
export type PlanId = 'monthly' | 'yearly' | 'lifetime';

const SKU: Record<PlanId, string> = {
  yearly: 'inkstar_plus_yearly',
  monthly: 'inkstar_plus_monthly',
  lifetime: 'inkstar_plus_lifetime',
};
const ALL_SKUS = Object.values(SKU);
const PLAN_OF: Record<string, PlanId> = Object.fromEntries(Object.entries(SKU).map(([k, v]) => [v, k as PlanId]));

/** Higher first: lifetime outranks yearly outranks monthly (matches the subscription group levels). */
const RANK: PlanId[] = ['lifetime', 'yearly', 'monthly'];
export const bestPlan = (owned: PlanId[]): PlanId | null => RANK.find((p) => owned.includes(p)) ?? null;
/** Plans a holder of `plan` can still move up to. */
export const upgradesFrom = (plan: PlanId | null): PlanId[] => (plan ? RANK.slice(0, RANK.indexOf(plan)) : RANK);
export const isSubscription = (plan: PlanId | null) => plan === 'monthly' || plan === 'yearly';

/** Apple's own subscription management page (cancel, change plan). */
export const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

export interface Plan {
  id: PlanId;
  price: string;
  /** false until the store has returned this product */
  available: boolean;
}

/** Shown until the store returns localized prices. */
export const FALLBACK_PLANS: Plan[] = [
  { id: 'yearly', price: '$39.99', available: false },
  { id: 'monthly', price: '$6.99', available: false },
  { id: 'lifetime', price: '$79.99', available: false },
];

export const purchasesSupported = Platform.OS === 'ios';

/** Diagnostics for purchase problems; warnings survive into release builds' device console. */
function trace(step: string, detail?: unknown) {
  console.warn(`[iap] ${step}`, detail === undefined ? '' : JSON.stringify(detail));
}

const describe = (p: Purchase) => ({ productId: p.productId, state: p.purchaseState, autoRenew: p.isAutoRenewing });
const isOurs = (p: Purchase) => ALL_SKUS.includes(p.productId) && p.purchaseState !== 'pending';

let onEntitled: ((plan: PlanId) => void) | null = null;
/** Called whenever StoreKit delivers a completed purchase of one of our products, at any time. */
export function onPlusGranted(fn: (plan: PlanId) => void) {
  onEntitled = fn;
}

let connecting: Promise<unknown> | null = null;
function connect() {
  connecting ??= initConnection()
    .then(() => {
      // One long-lived listener: purchases can complete outside the paywall (renewals,
      // Ask to Buy, interrupted purchases replayed at launch), and every one must be finished.
      purchaseUpdatedListener(async (purchase: Purchase) => {
        trace('update', describe(purchase));
        if (!isOurs(purchase)) return;
        onEntitled?.(PLAN_OF[purchase.productId]);
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch (e) {
          trace('finish failed', String(e));
        }
      });
      purchaseErrorListener((error) => trace('error event', { code: error.code, message: error.message }));
    })
    .catch((e) => {
      connecting = null;
      trace('connect failed', String(e));
      throw e;
    });
  return connecting;
}

/** Every plan StoreKit currently reports as active: subscriptions in force and the lifetime purchase. */
export async function ownedPlans(): Promise<PlanId[]> {
  if (!purchasesSupported) return [];
  await connect();
  const owned = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
  trace('owned', owned.map(describe));
  return [...new Set(owned.filter(isOurs).map((p) => PLAN_OF[p.productId]))];
}

export async function loadPlans(): Promise<Plan[]> {
  if (!purchasesSupported) return FALLBACK_PLANS;
  await connect();
  const products = (await fetchProducts({ skus: ALL_SKUS, type: 'all' })) ?? [];
  trace('products', products.map((p) => p.id));
  return FALLBACK_PLANS.map((plan) => {
    const found = products.find((p) => p.id === SKU[plan.id]);
    return found ? { id: plan.id, price: found.displayPrice, available: true } : plan;
  });
}

/** Resolves true once the purchase completes; false if the user cancelled or it is pending approval. */
export async function buy(plan: Plan): Promise<boolean> {
  if (!purchasesSupported || !plan.available) throw new Error('unavailable');
  await connect();
  const request = { apple: { sku: SKU[plan.id] } };
  let result;
  try {
    // On iOS this resolves with the purchase itself once the payment sheet completes.
    result = await (plan.id === 'lifetime' ? requestPurchase({ request, type: 'in-app' }) : requestPurchase({ request, type: 'subs' }));
  } catch (e) {
    trace('request failed', String(e));
    if (isUserCancelledError(e as never)) return false;
    throw e;
  }
  const purchases = (Array.isArray(result) ? result : result ? [result] : []) as Purchase[];
  trace('request result', purchases.map(describe));
  if (purchases.some((p) => isOurs(p) && p.productId === SKU[plan.id])) return true;
  // Nothing returned directly (deferred or delivered only as an event): ask StoreKit what is owned.
  return (await ownedPlans()).includes(plan.id);
}

export async function restore(): Promise<PlanId[]> {
  if (!purchasesSupported) throw new Error('unavailable');
  await connect();
  await restorePurchases();
  return ownedPlans();
}

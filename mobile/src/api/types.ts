export type BusinessType = 'FOOD_TRUCK' | 'CAFE' | 'BAKERY' | 'RESTAURANT' | 'CATERER' | 'OTHER';

export type ItemCategory =
  | 'PRODUCE'
  | 'PROTEIN'
  | 'DAIRY'
  | 'BAKED'
  | 'PREPARED'
  | 'BEVERAGE'
  | 'OTHER';

export type ItemUnit =
  | 'LB'
  | 'OZ'
  | 'KG'
  | 'G'
  | 'EACH'
  | 'DOZEN'
  | 'BATCH'
  | 'TRAY'
  | 'GALLON'
  | 'LITER';

export type WasteReason =
  | 'OVER_PREPPED'
  | 'EXPIRED_SPOILED'
  | 'BURNED_DAMAGED'
  | 'CUSTOMER_RETURN'
  | 'TRIM_PREP'
  | 'OTHER';

export interface MeResponse {
  userId: string;
  email: string;
  hasBusiness: boolean;
  businessId?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: MeResponse;
}

export interface Business {
  id: string;
  name: string;
  businessType: BusinessType;
  city?: string;
  currency: string;
  timezone: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  unit: ItemUnit;
  costPerUnit: number;
  active: boolean;
}

export interface WasteEntry {
  id: string;
  inventoryItemId: string;
  itemName: string;
  category: ItemCategory;
  quantity: number;
  unit: ItemUnit;
  costPerUnit: number;
  totalCostLost: number;
  reason: WasteReason;
  reasonLabel: string;
  wasteDate: string;
  note?: string;
  createdAt: string;
}

/** Spring Data's VIA_DTO page shape. */
export interface Page<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

export interface DashboardSummary {
  weekStart: string;
  weekEnd: string;
  isCurrentWeek: boolean;
  currency: string;
  totalWasted: number;
  entryCount: number;
  previousWeekTotal: number;
  changePercent?: number;
  projectedMonthly: number;
  topItem?: { itemId: string; name: string; cost: number; quantity: number; unit: ItemUnit };
  worstDay?: { date: string; label: string; cost: number };
  topReason?: { reason: WasteReason; label: string; cost: number; share: number };
  recentEntries: WasteEntry[];
}

export interface ItemCostPoint {
  itemId: string;
  name: string;
  cost: number;
  quantity: number;
  unit: ItemUnit;
  entryCount: number;
}

export interface ReasonSlice {
  reason: WasteReason;
  label: string;
  cost: number;
  share: number;
  entryCount: number;
}

export interface DayPoint {
  date: string;
  label: string;
  cost: number;
  entryCount: number;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  currency: string;
  totalCost: number;
  previousTotalCost: number;
  changePercent?: number;
  entryCount: number;
  topItemName?: string;
  topItemCost?: number;
  topReasonLabel?: string;
  worstDay?: string;
  recommendation: { ruleId: string; text: string };
  fromSnapshot: boolean;
  topItems: ItemCostPoint[];
  byReason: ReasonSlice[];
  byDay: DayPoint[];
}

export const WASTE_REASONS: { value: WasteReason; label: string }[] = [
  { value: 'OVER_PREPPED', label: 'Over-prepped' },
  { value: 'EXPIRED_SPOILED', label: 'Expired / spoiled' },
  { value: 'BURNED_DAMAGED', label: 'Burned / damaged' },
  { value: 'CUSTOMER_RETURN', label: 'Customer return' },
  { value: 'TRIM_PREP', label: 'Trim / prep' },
  { value: 'OTHER', label: 'Other' },
];

export const ITEM_CATEGORIES: ItemCategory[] = [
  'PRODUCE',
  'PROTEIN',
  'DAIRY',
  'BAKED',
  'PREPARED',
  'BEVERAGE',
  'OTHER',
];

export const ITEM_UNITS: ItemUnit[] = [
  'LB',
  'OZ',
  'KG',
  'G',
  'EACH',
  'DOZEN',
  'BATCH',
  'TRAY',
  'GALLON',
  'LITER',
];

export const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'FOOD_TRUCK', label: 'Food truck' },
  { value: 'CAFE', label: 'Cafe' },
  { value: 'BAKERY', label: 'Bakery' },
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'CATERER', label: 'Caterer' },
  { value: 'OTHER', label: 'Other' },
];

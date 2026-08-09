import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/AuthContext';
import { cacheInventory, readCachedInventory, scopeFor } from '@/offline/inventoryCache';
import { enqueue } from '@/offline/queue';

import { api, isUnreachable } from './client';
import { WASTE_REASONS } from './types';
import type {
  Business,
  DashboardSummary,
  InventoryItem,
  ItemCategory,
  ItemUnit,
  Page,
  WasteEntry,
  WasteReason,
  WeeklyReport,
} from './types';

export const queryKeys = {
  business: ['business'] as const,
  // The user id is part of the key so a second account on the same phone cannot read the
  // first one's cached list, and so the query refetches once the session finishes restoring.
  inventory: (includeInactive: boolean, userId?: string) =>
    ['inventory', includeInactive, userId] as const,
  dashboard: (weeksAgo: number) => ['dashboard', weeksAgo] as const,
  history: (filter: HistoryFilter) => ['history', filter] as const,
  report: (weeksAgo: number) => ['report', weeksAgo] as const,
};

export interface HistoryFilter {
  from?: string;
  to?: string;
  itemId?: string;
  reason?: WasteReason;
}

/** Everything derived from waste entries has to refetch after a write. */
function invalidateWasteViews(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['history'] }),
    queryClient.invalidateQueries({ queryKey: ['report'] }),
  ]);
}

export function useBusiness() {
  return useQuery({
    queryKey: queryKeys.business,
    queryFn: () => api<Business>('/businesses/me'),
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      businessType: string;
      city?: string;
      currency: string;
      timezone: string;
      seedStarterItems: boolean;
    }) =>
      api<Business>(`/businesses?seedStarterItems=${input.seedStarterItems}`, {
        method: 'POST',
        body: {
          name: input.name,
          businessType: input.businessType,
          city: input.city,
          currency: input.currency,
          timezone: input.timezone,
        },
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useInventory(includeInactive = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.inventory(includeInactive, user?.userId),
    // Without this the query races session restore, fails with no user to key the cache by,
    // and stays errored — which offline reads as "you have no items".
    enabled: !!user?.userId,
    queryFn: async () => {
      const scope = scopeFor(includeInactive);
      try {
        const items = await api<InventoryItem[]>('/inventory', { query: { includeInactive } });
        if (user) void cacheInventory(user.userId, scope, items);
        return items;
      } catch (error) {
        if (!isUnreachable(error)) throw error;
        // Offline: fall back to the last known list so Log Waste still has something to offer.
        const cached = await readCachedInventory(user?.userId, scope);
        if (!cached) throw error;
        return cached;
      }
    },
  });
}

export interface ItemInput {
  name: string;
  category: ItemCategory;
  unit: ItemUnit;
  costPerUnit: string;
}

export function useSaveItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ItemInput & { id?: string }) =>
      api<InventoryItem>(id ? `/inventory/${id}` : '/inventory', {
        method: id ? 'PUT' : 'POST',
        body: { ...input, costPerUnit: Number(input.costPerUnit) },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      await invalidateWasteViews(queryClient);
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/inventory/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useDashboard(weeksAgo: number) {
  return useQuery({
    queryKey: queryKeys.dashboard(weeksAgo),
    queryFn: () => api<DashboardSummary>('/dashboard/summary', { query: { weeksAgo } }),
  });
}

export function useHistory(filter: HistoryFilter) {
  return useQuery({
    queryKey: queryKeys.history(filter),
    queryFn: () => api<Page<WasteEntry>>('/waste-entries', { query: { ...filter, size: 50 } }),
  });
}

export function useWeeklyReport(weeksAgo: number) {
  return useQuery({
    queryKey: queryKeys.report(weeksAgo),
    queryFn: () => api<WeeklyReport>('/reports/weekly', { query: { weeksAgo } }),
  });
}

export interface LogWasteInput {
  /** The whole item, not just its id: the offline queue snapshots name, unit, and cost for display. */
  item: InventoryItem;
  quantity: string;
  reason: WasteReason;
  wasteDate: string;
  note?: string;
  clientUuid: string;
}

export interface LogWasteResult {
  entry: WasteEntry;
  /** True when the network was unreachable and the entry was queued instead of saved. */
  queuedOffline: boolean;
}

export function useLogWaste() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: LogWasteInput): Promise<LogWasteResult> => {
      const quantity = Number(input.quantity);
      const payload = {
        inventoryItemId: input.item.id,
        quantity,
        reason: input.reason,
        wasteDate: input.wasteDate,
        note: input.note,
        clientUuid: input.clientUuid,
      };

      try {
        return { entry: await api<WasteEntry>('/waste-entries', { method: 'POST', body: payload }), queuedOffline: false };
      } catch (error) {
        if (!isUnreachable(error) || !user) throw error;

        const reasonLabel =
          WASTE_REASONS.find((option) => option.value === input.reason)?.label ?? input.reason;

        await enqueue({
          clientUuid: input.clientUuid,
          userId: user.userId,
          inventoryItemId: input.item.id,
          itemName: input.item.name,
          category: input.item.category,
          unit: input.item.unit,
          costPerUnit: input.item.costPerUnit,
          quantity,
          reason: input.reason,
          reasonLabel,
          wasteDate: input.wasteDate,
          note: input.note,
          queuedAt: new Date().toISOString(),
          attempts: 0,
          status: 'pending',
        });

        // The cost the user sees now is computed the same way the server will compute it, so the
        // number does not change under them when the entry finally syncs.
        return {
          entry: {
            id: input.clientUuid,
            inventoryItemId: input.item.id,
            itemName: input.item.name,
            category: input.item.category,
            quantity,
            unit: input.item.unit,
            costPerUnit: input.item.costPerUnit,
            totalCostLost: Math.round(quantity * input.item.costPerUnit * 100) / 100,
            reason: input.reason,
            reasonLabel,
            wasteDate: input.wasteDate,
            note: input.note,
            createdAt: new Date().toISOString(),
          },
          queuedOffline: true,
        };
      }
    },
    onSuccess: (result) => {
      // Nothing on the server changed for a queued entry, so there is nothing to refetch.
      if (!result.queuedOffline) return invalidateWasteViews(queryClient);
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/waste-entries/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateWasteViews(queryClient),
  });
}

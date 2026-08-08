import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
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
  inventory: (includeInactive: boolean) => ['inventory', includeInactive] as const,
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
  return useQuery({
    queryKey: queryKeys.inventory(includeInactive),
    queryFn: () => api<InventoryItem[]>('/inventory', { query: { includeInactive } }),
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
  inventoryItemId: string;
  quantity: string;
  reason: WasteReason;
  wasteDate?: string;
  note?: string;
  clientUuid: string;
}

export function useLogWaste() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogWasteInput) =>
      api<WasteEntry>('/waste-entries', {
        method: 'POST',
        body: { ...input, quantity: Number(input.quantity) },
      }),
    onSuccess: () => invalidateWasteViews(queryClient),
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/waste-entries/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateWasteViews(queryClient),
  });
}

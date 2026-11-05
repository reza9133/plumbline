import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { POLL_MS } from '../config';
import { currentSource, fetchAllCovenants, isDemo, subscribeDemo } from './client';

export const useDemo = () => useSyncExternalStore(subscribeDemo, isDemo, isDemo);

/** Query keys carry the data source, so switching demo on or off never mixes the two. */
function useKey() {
  return useDemo() ? 'demo' : 'live';
}

export function useStats() {
  const k = useKey();
  return useQuery({
    queryKey: [k, 'stats'],
    queryFn: () => currentSource().stats(),
    refetchInterval: POLL_MS,
  });
}
export function useSolvency() {
  const k = useKey();
  return useQuery({
    queryKey: [k, 'solvency'],
    queryFn: () => currentSource().solvency(),
    refetchInterval: POLL_MS,
  });
}
export function useAllCovenants() {
  const k = useKey();
  return useQuery({
    queryKey: [k, 'all'],
    queryFn: () => fetchAllCovenants(currentSource()),
    refetchInterval: POLL_MS,
  });
}
export function useCovenant(id: number | null) {
  const k = useKey();
  return useQuery({
    queryKey: [k, 'covenant', id],
    queryFn: () => currentSource().covenant(id as number),
    enabled: id !== null && Number.isInteger(id) && id >= 0,
    refetchInterval: POLL_MS,
    retry: 1,
  });
}
export function useReadings(id: number | null) {
  const k = useKey();
  return useQuery({
    queryKey: [k, 'readings', id],
    queryFn: () => currentSource().readings(id as number),
    enabled: id !== null && Number.isInteger(id) && id >= 0,
    refetchInterval: POLL_MS,
  });
}
export function useCovenantsOf(who: string | null) {
  const k = useKey();
  return useQuery({
    queryKey: [k, 'of', who?.toLowerCase()],
    queryFn: () => currentSource().covenantsOf(who as string, 0, 50),
    enabled: !!who,
    refetchInterval: POLL_MS,
  });
}
export function useCredit(who: string | null) {
  const k = useKey();
  return useQuery({
    queryKey: [k, 'credit', who?.toLowerCase()],
    queryFn: () => currentSource().credit(who as string),
    enabled: !!who,
    refetchInterval: POLL_MS,
  });
}
export function useRecord(who: string | null) {
  const k = useKey();
  return useQuery({
    queryKey: [k, 'record', who?.toLowerCase()],
    queryFn: () => currentSource().record(who as string),
    enabled: !!who,
    refetchInterval: POLL_MS,
  });
}

export function useRefreshAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

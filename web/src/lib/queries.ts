import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export const KEYS = {
  projects: ['projects'] as const,
  tasks:    ['tasks']    as const,
  entries:  (date: string) => ['entries', date] as const,
  calendar: (year: number, month: number) => ['calendar', year, month] as const,
};

export function useProjects() {
  return useQuery({ queryKey: KEYS.projects, queryFn: api.getProjects, staleTime: 5 * 60 * 1000 });
}

export function useTasks() {
  return useQuery({ queryKey: KEYS.tasks, queryFn: api.getTasks, staleTime: 5 * 60 * 1000 });
}

export function useEntries(date: string) {
  return useQuery({ queryKey: KEYS.entries(date), queryFn: () => api.getEntries({ date }) });
}

/** All entries in an optional date range (omit both for all-time). Used for project reporting. */
export function useEntriesRange(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['entries-range', startDate ?? 'all', endDate ?? 'all'],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;
      return api.getEntries(params);
    },
    staleTime: 60 * 1000,
  });
}

export function useCalendar(year: number, month: number) {
  return useQuery({ queryKey: KEYS.calendar(year, month), queryFn: () => api.getCalendar(year, month) });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return {
    invalidateProjects: () => qc.invalidateQueries({ queryKey: KEYS.projects }),
    invalidateTasks:    () => qc.invalidateQueries({ queryKey: KEYS.tasks }),
    invalidateEntries:  (date: string) => qc.invalidateQueries({ queryKey: KEYS.entries(date) }),
    invalidateCalendar: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  };
}

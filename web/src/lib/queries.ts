import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export const KEYS = {
  projects: ['projects'] as const,
  tasks:    ['tasks']    as const,
  entries:  (date: string) => ['entries', date] as const,
  calendar: (year: number, month: number) => ['calendar', year, month] as const,
};

export function useProjects() {
  return useQuery({ queryKey: KEYS.projects, queryFn: api.getProjects });
}

export function useTasks() {
  return useQuery({ queryKey: KEYS.tasks, queryFn: api.getTasks });
}

export function useEntries(date: string) {
  return useQuery({ queryKey: KEYS.entries(date), queryFn: () => api.getEntries({ date }) });
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

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  me:     ()            => req<import('./types').User | null>('/auth/me'),
  logout: ()            => req<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  // Projects
  getProjects:    ()                                     => req<import('./types').Project[]>('/api/projects'),
  createProject:  (data: { name: string; color: string }) =>
    req<import('./types').Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  archiveProject: (id: string, archived: boolean) =>
    req<import('./types').Project>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ archived }) }),
  deleteProject:  (id: string)                           =>
    req<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),

  // Entries
  getEntries: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return req<import('./types').Entry[]>(`/api/entries${q ? `?${q}` : ''}`);
  },
  getCalendar: (year: number, month: number) =>
    req<import('./types').CalendarData>(`/api/entries/calendar?year=${year}&month=${month}`),
  createEntry: (data: { projectId: string; date: string; description: string; taskId?: string; hours?: number | null }) =>
    req<import('./types').Entry>('/api/entries', { method: 'POST', body: JSON.stringify(data) }),
  getTaskEntries: (taskId: string) =>
    req<import('./types').Entry[]>(`/api/entries?taskId=${taskId}`),
  updateEntry: (id: string, data: Partial<{ description: string; projectId: string; date: string; hours: number | null }>) =>
    req<import('./types').Entry>(`/api/entries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEntry: (id: string) =>
    req<{ ok: boolean }>(`/api/entries/${id}`, { method: 'DELETE' }),

  // Summary
  getSummary: (query: string) =>
    req<{ summary: string; startDate: string; endDate: string; entryCount: number; taskCount?: number; type?: 'entries' | 'tasks' }>(
      '/api/summary', { method: 'POST', body: JSON.stringify({ query }) }
    ),

  // Tasks
  getTasks: () => req<import('./types').Task[]>('/api/tasks'),
  createTask: (data: { title: string; description?: string; dueDate?: string; priority?: string; projectId?: string }) =>
    req<import('./types').Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: Partial<{ title: string; description: string; dueDate: string; priority: string; completed: boolean; projectId: string | null }>) =>
    req<import('./types').Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    req<{ ok: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),

  // User
  updateName: (name: string) =>
    req<{ name: string }>('/api/user/name', { method: 'PATCH', body: JSON.stringify({ name }) }),

};

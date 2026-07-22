'use client';
import { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Loader from '@/components/Loader';
import { useUser } from '@/lib/useUser';
import { api } from '@/lib/api';
import { useTasks, useProjects, useInvalidate } from '@/lib/queries';
import type { Task, Project, Entry } from '@/lib/types';

const PRIORITY_META = {
  high:   { label: 'High',   color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'  },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
  low:    { label: 'Low',    color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)'  },
};

function isOverdue(dueDate?: string) {
  if (!dueDate) return false;
  return new Date(dueDate + 'T23:59:59') < new Date();
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(d: string) {
  const diff = Math.ceil((new Date(d + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0)  return `${Math.abs(diff)}d overdue`;
  return `${diff}d left`;
}

const STATUS_TABS = [
  { val: 'pending' as const, label: 'Pending' },
  { val: 'done'    as const, label: 'Done'    },
  { val: 'all'     as const, label: 'All'     },
];

function ProjectPicker({ projects, value, onChange }: { projects: Project[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      <button onClick={() => onChange('')} style={{
        padding: '4px 11px', borderRadius: 8,
        background: !value ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${!value ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
        color: !value ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
        fontSize: '0.73rem', cursor: 'pointer', transition: 'all 0.15s',
      }}>None</button>
      {projects.map((p) => (
        <button key={p._id} onClick={() => onChange(p._id)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 11px', borderRadius: 8,
          background: value === p._id ? `${p.color}18` : 'rgba(255,255,255,0.02)',
          border: `1px solid ${value === p._id ? `${p.color}50` : 'rgba(255,255,255,0.06)'}`,
          color: value === p._id ? p.color : 'rgba(255,255,255,0.3)',
          fontSize: '0.73rem', cursor: 'pointer', transition: 'all 0.15s',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          {p.name}
        </button>
      ))}
    </div>
  );
}

/** Compact dropdown to filter tasks by project (All, or one). */
function ProjectFilterDropdown({ projects, value, onChange, counts, total }: {
  projects: Project[]; value: string; onChange: (v: string) => void;
  counts: Record<string, number>; total: number;
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const sel = projects.find((p) => p._id === value);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects;
  const showSearch = projects.length > 7;

  const Row = ({ id, name, color, count }: { id: string; name: string; color?: string; count: number }) => {
    const active = value === id;
    return (
      <button type="button" onClick={() => { onChange(id); setOpen(false); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '7px 10px', borderRadius: 8, cursor: 'pointer', border: 'none',
          background: active ? (color ? color + '18' : 'rgba(255,255,255,0.06)') : 'transparent',
          textAlign: 'left', fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: color ?? 'rgba(255,255,255,0.3)' }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: '0.8rem', fontWeight: active ? 700 : 500, color: active ? (color ?? '#f1f5f9') : '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{count}</span>
        {active && <span style={{ fontSize: '0.7rem', color: color ?? '#f1f5f9', flexShrink: 0 }}>✓</span>}
      </button>
    );
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, minWidth: 190,
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? 'rgba(245,158,11,0.35)' : sel ? sel.color + '50' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 9, padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: sel?.color ?? 'rgba(255,255,255,0.3)' }} />
        <span style={{ flex: 1, textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: sel ? sel.color : 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sel ? sel.name : 'All projects'}
        </span>
        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{sel ? counts[sel._id] ?? 0 : total}</span>
        <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, width: 240,
          background: 'rgba(13,15,28,0.98)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11,
          boxShadow: '0 16px 40px rgba(0,0,0,0.55)', overflow: 'hidden',
        }}>
          {showSearch && (
            <div style={{ padding: 7, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects…"
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '6px 10px', color: '#f1f5f9', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
          )}
          <div style={{ maxHeight: 260, overflowY: 'auto', padding: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!q && <Row id="" name="All projects" count={total} />}
            {filtered.map((p) => <Row key={p._id} id={p._id} name={p.name} color={p.color} count={counts[p._id] ?? 0} />)}
            {q && filtered.length === 0 && (
              <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>No match</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const { user, loading } = useUser();
  const { data: tasks = [],    isLoading: tasksLoading }    = useTasks();
  const { data: projects = [], isLoading: projectsLoading }                           = useProjects();
  const { invalidateTasks } = useInvalidate();

  // Create form
  const [title,      setTitle]      = useState('');
  const [desc,       setDesc]       = useState('');
  const [dueDate,    setDueDate]    = useState('');
  const [priority,   setPriority]   = useState<'low'|'medium'|'high'>('medium');
  const [projectId,  setProjectId]  = useState<string>('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [showForm,   setShowForm]   = useState(false);

  // Detail modal
  const [detailTask,    setDetailTask]    = useState<Task | null>(null);
  const [detailEntries, setDetailEntries] = useState<Entry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Task entries section
  const [entriesTask,        setEntriesTask]        = useState<Task | null>(null);
  const [entriesTaskEntries, setEntriesTaskEntries] = useState<Entry[]>([]);
  const [entriesTaskLoading, setEntriesTaskLoading] = useState(false);

  // Edit state
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editTitle,    setEditTitle]    = useState('');
  const [editDesc,     setEditDesc]     = useState('');
  const [editDue,      setEditDue]      = useState('');
  const [editPriority, setEditPriority] = useState<'low'|'medium'|'high'>('medium');
  const [editProjId,   setEditProjId]   = useState('');
  const [editSaving,   setEditSaving]   = useState(false);
  const [togglingId,   setTogglingId]   = useState<string | null>(null);

  // Filters
  const [filter,     setFilter]     = useState<'all'|'pending'|'done'>('pending');
  const [projFilter, setProjFilter] = useState<string>('');

  const create = async () => {
    if (!title.trim()) return;
    setSaving(true); setError('');
    try {
      await api.createTask({ title: title.trim(), description: desc.trim() || undefined, dueDate: dueDate || undefined, priority, projectId: projectId || undefined });
      invalidateTasks();
      setTitle(''); setDesc(''); setDueDate(''); setPriority('medium'); setProjectId(''); setShowForm(false);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const toggle = async (task: Task) => {
    setTogglingId(task._id);
    try {
      await api.updateTask(task._id, { completed: !task.completed });
      invalidateTasks();
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async (id: string) => {
    await api.deleteTask(id);
    invalidateTasks();
    if (editingId === id) setEditingId(null);
    if (entriesTask?._id === id) {
      setEntriesTask(null);
      setEntriesTaskEntries([]);
    }
  };

  const openDetail = async (task: Task) => {
    setDetailTask(task);
    setDetailEntries([]);
    setDetailLoading(true);
    try {
      const entries = await api.getTaskEntries(task._id);
      setDetailEntries(entries);
    } finally { setDetailLoading(false); }
  };

  const showEntriesSection = async (task: Task) => {
    setEntriesTask(task);
    setEntriesTaskEntries([]);
    setEntriesTaskLoading(true);
    try {
      const entries = await api.getTaskEntries(task._id);
      setEntriesTaskEntries(entries);
    } finally { setEntriesTaskLoading(false); }
  };

  const openEdit = (task: Task) => {
    setEditingId(task._id);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditDue(task.dueDate || '');
    setEditPriority(task.priority);
    setEditProjId(task.projectId?._id || '');
  };

  const saveEdit = async () => {
    if (!editTitle.trim() || !editingId) return;
    setEditSaving(true);
    try {
      const updated = await api.updateTask(editingId, {
        title:       editTitle.trim(),
        description: editDesc.trim() || undefined,
        dueDate:     editDue || undefined,
        priority:    editPriority,
        projectId:   editProjId || null,
      });
      invalidateTasks();
      setEditingId(null);
    } catch { /* silent */ }
    finally { setEditSaving(false); }
  };

  if (loading || !user) return <Loader />;

  const dataLoading = tasksLoading || projectsLoading;
  const pending  = tasks.filter((t) => !t.completed);
  const done     = tasks.filter((t) => t.completed);
  const overdue  = pending.filter((t) => isOverdue(t.dueDate));
  const statusScoped = filter === 'all' ? tasks : filter === 'pending' ? pending : done;
  let displayed  = statusScoped;
  if (projFilter) displayed = displayed.filter((t) => t.projectId?._id === projFilter);
  const today    = new Date().toLocaleDateString('sv');

  // Task count per project within the current status tab (drives the filter dropdown badges)
  const projTaskCounts = statusScoped.reduce<Record<string, number>>((acc, t) => {
    const id = t.projectId?._id;
    if (id) acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AppLayout user={user}>
      <div style={{ padding: '36px 32px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', marginBottom: 6, textTransform: 'uppercase' }}>To-Do</div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f1f5f9', margin: 0 }}>Tasks</h1>
            <div style={{ marginTop: 5, fontSize: '0.78rem', color: 'rgba(255,255,255,0.28)' }}>
              {pending.length} pending
              {overdue.length > 0 && <span style={{ color: '#f87171', marginLeft: 8 }}>· {overdue.length} overdue</span>}
            </div>
          </div>
          <button className="btn-accent" onClick={() => { setShowForm((v) => !v); setEditingId(null); }} style={{ flexShrink: 0, marginTop: 4 }}>
            {showForm ? '✕ Cancel' : '+ New Task'}
          </button>
        </div>

        {/* ── Add form ── */}
        {showForm && (
          <div className="fade-up" style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 18, padding: '20px', marginBottom: 22,
            backdropFilter: 'blur(12px)',
          }}>
            <input
              className="field" autoFocus
              style={{ marginBottom: 10, borderRadius: 12 }}
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) create(); }}
            />
            <textarea
              rows={2} className="field"
              style={{ resize: 'none', borderRadius: 12, marginBottom: 14, fontFamily: 'inherit' }}
              placeholder="Description (optional)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            {projects.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.63rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                  Project <span style={{ color: 'rgba(255,255,255,0.12)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>optional</span>
                </div>
                <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: '0.63rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Deadline</div>
                <input type="date" className="field" style={{ borderRadius: 10, colorScheme: 'dark' }} min={today} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: '0.63rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Priority</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {(['low','medium','high'] as const).map((p) => {
                    const m = PRIORITY_META[p];
                    return (
                      <button key={p} onClick={() => setPriority(p)} style={{
                        flex: 1, padding: '6px 0', borderRadius: 8,
                        background: priority === p ? m.bg : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${priority === p ? m.border : 'rgba(255,255,255,0.06)'}`,
                        color: priority === p ? m.color : 'rgba(255,255,255,0.25)',
                        fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      }}>{m.label}</button>
                    );
                  })}
                </div>
              </div>
            </div>
            {error && <p style={{ color: '#f87171', fontSize: '0.78rem', marginBottom: 10 }}>{error}</p>}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.15)' }}>⌘↵ to save</span>
              <button className="btn-accent" onClick={create} disabled={saving || !title.trim()}>{saving ? 'Adding…' : '+ Add Task'}</button>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: 3, gap: 2,
          }}>
            {STATUS_TABS.map(({ val, label }) => {
              const count = val === 'pending' ? pending.length : val === 'done' ? done.length : tasks.length;
              const active = filter === val;
              return (
                <button key={val} onClick={() => setFilter(val)} style={{
                  padding: '5px 14px', borderRadius: 9,
                  background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(245,158,11,0.22)' : 'transparent'}`,
                  color: active ? '#f59e0b' : 'rgba(255,255,255,0.35)',
                  fontSize: '0.75rem', fontWeight: active ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {label}
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    background: active ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)',
                    color: active ? '#f59e0b' : 'rgba(255,255,255,0.3)',
                    borderRadius: 99, padding: '1px 6px', minWidth: 18, textAlign: 'center',
                  }}>{count}</span>
                </button>
              );
            })}
          </div>
          {projects.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Project</span>
              <ProjectFilterDropdown
                projects={projects}
                value={projFilter}
                onChange={setProjFilter}
                counts={projTaskCounts}
                total={statusScoped.length}
              />
              {projFilter && (
                <button onClick={() => setProjFilter('')} style={{
                  padding: '6px 10px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', cursor: 'pointer',
                }}>Clear ✕</button>
              )}
            </div>
          )}
        </div>

        {/* ── Task list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dataLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                height: 64, borderRadius: 14,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                animation: 'pulse 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }} />
            ))
          ) : displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.15)', fontSize: '0.85rem' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>✓</div>
              {filter === 'done' ? 'No completed tasks yet.' : 'No tasks. Add one above!'}
            </div>
          ) : displayed.map((task) => {
            const pm     = PRIORITY_META[task.priority];
            const od     = !task.completed && isOverdue(task.dueDate);
            const proj   = task.projectId;
            const stripe = task.completed ? 'rgba(255,255,255,0.08)' : (proj?.color ?? pm.color);
            const isEditing = editingId === task._id;

            return (
              <div key={task._id} className="fade-up" style={{
                background: isEditing ? 'rgba(245,158,11,0.04)' : task.completed ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${isEditing ? 'rgba(245,158,11,0.2)' : od ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 14, overflow: 'hidden',
                transition: 'all 0.15s', opacity: (!isEditing && task.completed) ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div style={{ width: 3, flexShrink: 0, alignSelf: 'stretch', background: stripe, opacity: 0.75 }} />

                  <button onClick={() => togglingId ? undefined : toggle(task)} style={{
                    flexShrink: 0, margin: '14px 12px 0 12px',
                    width: 18, height: 18, borderRadius: 5,
                    background: task.completed ? 'rgba(34,197,94,0.15)' : 'transparent',
                    border: `2px solid ${task.completed ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
                    cursor: togglingId === task._id ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', color: '#22c55e', transition: 'all 0.15s', padding: 0,
                    opacity: togglingId === task._id ? 0.6 : 1,
                  }}>
                    {togglingId === task._id ? (
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        border: '1.5px solid rgba(34,197,94,0.3)',
                        borderTopColor: '#22c55e',
                        display: 'inline-block',
                        animation: 'spin 0.6s linear infinite',
                      }} />
                    ) : task.completed ? '✓' : ''}
                  </button>

                  <div style={{ flex: 1, padding: '12px 10px 12px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.875rem', fontWeight: 600, flex: 1,
                        color: task.completed ? 'rgba(255,255,255,0.3)' : '#e2e8f0',
                        textDecoration: task.completed ? 'line-through' : 'none',
                      }}>{task.title}</span>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em',
                        padding: '2px 7px', borderRadius: 99,
                        background: pm.bg, border: `1px solid ${pm.border}`, color: pm.color,
                      }}>{pm.label}</span>
                    </div>
                    {proj && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: proj.color, boxShadow: `0 0 4px ${proj.color}88` }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: proj.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{proj.name}</span>
                      </div>
                    )}
                    {task.description && (
                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.28)', marginTop: 3, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{task.description}</div>
                    )}
                    {task.dueDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                        <span style={{ fontSize: '0.65rem', color: od ? '#f87171' : 'rgba(255,255,255,0.22)' }}>
                          {od ? '⚠' : '◷'} {formatDate(task.dueDate)}
                        </span>
                        {!task.completed && (
                          <span style={{
                            fontSize: '0.62rem', fontWeight: 600, padding: '1px 6px', borderRadius: 99,
                            background: od ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${od ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}`,
                            color: od ? '#f87171' : 'rgba(255,255,255,0.28)',
                          }}>{daysUntil(task.dueDate)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 10px 0 0', flexShrink: 0 }}>
                    <button
                      onClick={() => openDetail(task)}
                      title="View details & progress"
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
                        fontSize: '0.82rem', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#93c5fd'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(96,165,250,0.2)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    >⊙</button>
                    <button
                      onClick={() => showEntriesSection(task)}
                      title="Show all entries for this task"
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: entriesTask?._id === task._id ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${entriesTask?._id === task._id ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.08)'}`,
                        cursor: 'pointer',
                        color: entriesTask?._id === task._id ? '#93c5fd' : 'rgba(255,255,255,0.3)',
                        fontSize: '0.76rem', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { if (entriesTask?._id !== task._id) { (e.currentTarget as HTMLElement).style.color = '#93c5fd'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(96,165,250,0.2)'; } }}
                      onMouseLeave={(e) => { if (entriesTask?._id !== task._id) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; } }}
                    >≣</button>
                    <button
                      onClick={() => isEditing ? setEditingId(null) : openEdit(task)}
                      title={isEditing ? 'Cancel edit' : 'Edit task'}
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: isEditing ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isEditing ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}`,
                        cursor: 'pointer',
                        color: isEditing ? '#f59e0b' : 'rgba(255,255,255,0.3)',
                        fontSize: '0.8rem', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { if (!isEditing) { (e.currentTarget as HTMLElement).style.color = '#f59e0b'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.2)'; } }}
                      onMouseLeave={(e) => { if (!isEditing) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; } }}
                    >✎</button>
                    <button onClick={() => remove(task._id)} style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.25)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    >✕</button>
                  </div>
                </div>

                {/* ── Inline edit form ── */}
                {isEditing && (
                  <div style={{
                    padding: '0 16px 16px 16px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    marginTop: 4,
                  }}>
                    <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input
                        className="field" autoFocus
                        style={{ borderRadius: 10, fontSize: '0.875rem' }}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                        placeholder="Task title"
                      />
                      <textarea
                        rows={2} className="field"
                        style={{ resize: 'none', borderRadius: 10, fontFamily: 'inherit', fontSize: '0.82rem' }}
                        placeholder="Description (optional)"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                      />

                      {projects.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Project</div>
                          <ProjectPicker projects={projects} value={editProjId} onChange={setEditProjId} />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 130 }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Deadline</div>
                          <input type="date" className="field" style={{ borderRadius: 10, colorScheme: 'dark', fontSize: '0.82rem' }} value={editDue} onChange={(e) => setEditDue(e.target.value)} />
                        </div>
                        <div style={{ flex: 1, minWidth: 130 }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Priority</div>
                          <div style={{ display: 'flex', gap: 5 }}>
                            {(['low','medium','high'] as const).map((p) => {
                              const m = PRIORITY_META[p];
                              return (
                                <button key={p} onClick={() => setEditPriority(p)} style={{
                                  flex: 1, padding: '5px 0', borderRadius: 8,
                                  background: editPriority === p ? m.bg : 'rgba(255,255,255,0.02)',
                                  border: `1px solid ${editPriority === p ? m.border : 'rgba(255,255,255,0.06)'}`,
                                  color: editPriority === p ? m.color : 'rgba(255,255,255,0.25)',
                                  fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                }}>{m.label}</button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
                        <button onClick={() => setEditingId(null)} style={{
                          padding: '6px 14px', borderRadius: 9,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', cursor: 'pointer',
                        }}>Cancel</button>
                        <button className="btn-accent" onClick={saveEdit} disabled={editSaving || !editTitle.trim()} style={{ padding: '6px 18px' }}>
                          {editSaving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Task Entries Section ── */}
        {entriesTask && (
          <div style={{
            marginTop: 22,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '14px 14px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase' }}>
                  Task Entries
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2e8f0', marginTop: 3 }}>
                  {entriesTask.title}
                </div>
              </div>
              <button
                onClick={() => { setEntriesTask(null); setEntriesTaskEntries([]); }}
                style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.32)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.78rem', padding: 0,
                }}
                title="Close entries section"
              >✕</button>
            </div>

            {entriesTaskLoading ? (
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', textAlign: 'center', padding: '16px 0 12px' }}>Loading entries…</div>
            ) : entriesTaskEntries.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', textAlign: 'center', padding: '16px 0 12px' }}>No entries yet for this task.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
                {entriesTaskEntries.map((e) => (
                  <div key={e._id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>{formatDate(e.date)}</span>
                      {e.projectId && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: e.projectId.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{e.projectId.name}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{e.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Task Detail Modal ── */}
      {detailTask && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setDetailTask(null)}
        >
          <div
            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, maxWidth: 500, width: '100%', maxHeight: '82vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase' }}>Task Details</div>
              <button onClick={() => setDetailTask(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '1rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
            </div>
            <h3 style={{ color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 700, margin: '4px 0 14px', lineHeight: 1.4 }}>{detailTask.title}</h3>

            {detailTask.description && (
              <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.85rem', margin: '0 0 16px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detailTask.description}</p>
            )}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
              {detailTask.projectId && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: detailTask.projectId.color, padding: '3px 9px', borderRadius: 99, background: detailTask.projectId.color + '18', border: `1px solid ${detailTask.projectId.color}30` }}>
                  {detailTask.projectId.name}
                </span>
              )}
              <span style={{
                fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                background: PRIORITY_META[detailTask.priority].bg,
                border: `1px solid ${PRIORITY_META[detailTask.priority].border}`,
                color: PRIORITY_META[detailTask.priority].color,
              }}>
                {PRIORITY_META[detailTask.priority].label} priority
              </span>
              {detailTask.dueDate && (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', color: '#93c5fd' }}>
                  Deadline: {formatDate(detailTask.dueDate)}
                </span>
              )}
              {detailTask.completed && (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
                  ✓ Completed
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 10 }}>
              Progress Log
            </div>
            {detailLoading ? (
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>Loading…</div>
            ) : detailEntries.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>
                No progress logged yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {detailEntries.map((e) => (
                  <div key={e._id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>{formatDate(e.date)}</span>
                      {e.projectId && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: e.projectId.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{e.projectId.name}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{e.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

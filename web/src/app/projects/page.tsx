'use client';
import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import Loader from '@/components/Loader';
import Portal from '@/components/Portal';
import { useUser } from '@/lib/useUser';
import { api } from '@/lib/api';
import { useProjects, useEntriesRange, useInvalidate } from '@/lib/queries';
import type { Project, Entry } from '@/lib/types';

const PALETTE = ['#3b82f6','#22c55e','#a855f7','#f97316','#ef4444','#eab308','#ec4899','#14b8a6'];

function fmtHours(h: number) {
  return Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}
function renderRichText(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>
      : <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>
  );
}

type RangeKey = 'all' | '7d' | '30d' | 'month' | 'custom';
const RANGES: { key: Exclude<RangeKey, 'custom'>; label: string }[] = [
  { key: 'all',   label: 'All time' },
  { key: 'month', label: 'This month' },
  { key: '30d',   label: 'Last 30 days' },
  { key: '7d',    label: 'Last 7 days' },
];
function rangeLabelOf(key: RangeKey, customDays: number): string {
  if (key === 'custom') return `Last ${customDays} day${customDays === 1 ? '' : 's'}`;
  return RANGES.find((r) => r.key === key)!.label;
}
/** Returns [startDate, endDate] as YYYY-MM-DD (or undefined for all-time). */
function rangeDates(key: RangeKey, customDays: number): [string?, string?] {
  if (key === 'all') return [undefined, undefined];
  const today = new Date();
  const end = today.toLocaleDateString('sv');
  if (key === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('sv');
    return [start, end];
  }
  // '7d' → 7 days incl. today, '30d' → 30, 'custom' → N
  const span = key === '7d' ? 7 : key === '30d' ? 30 : Math.max(1, customDays);
  const start = new Date(today.getTime() - (span - 1) * 86400000).toLocaleDateString('sv');
  return [start, end];
}

/** Date-range picker: preset list + a custom "last N days" field. */
function RangeDropdown({ range, customDays, onPick, onCustom }: {
  range: RangeKey; customDays: number;
  onPick: (k: Exclude<RangeKey, 'custom'>) => void;
  onCustom: (days: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const Row = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%',
        padding: '8px 11px', borderRadius: 8, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
        background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
        color: active ? '#f59e0b' : '#cbd5e1', fontSize: '0.8rem', fontWeight: active ? 700 : 500, textAlign: 'left',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
      {active && <span style={{ fontSize: '0.72rem' }}>✓</span>}
    </button>
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, minWidth: 150,
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: '0.8rem', color: 'rgba(245,158,11,0.7)' }}>◷</span>
        <span style={{ flex: 1, textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap' }}>
          {rangeLabelOf(range, customDays)}
        </span>
        <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 60, width: 220,
          background: 'rgba(13,15,28,0.98)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11,
          boxShadow: '0 16px 40px rgba(0,0,0,0.55)', padding: 5,
        }}>
          {RANGES.map((r) => (
            <Row key={r.key} active={range === r.key} onClick={() => { onPick(r.key); setOpen(false); }}>
              {r.label}
            </Row>
          ))}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '5px 4px' }} />
          {/* Custom last-N-days */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', borderRadius: 8,
            background: range === 'custom' ? 'rgba(245,158,11,0.1)' : 'transparent',
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: range === 'custom' ? 700 : 500, color: range === 'custom' ? '#f59e0b' : '#cbd5e1', whiteSpace: 'nowrap' }}>Last</span>
            <input
              type="number" min={1} max={365}
              value={customDays}
              onChange={(e) => onCustom(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                width: 52, textAlign: 'center', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '5px 6px',
                color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 700, outline: 'none', fontFamily: 'inherit',
              }}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: range === 'custom' ? 700 : 500, color: range === 'custom' ? '#f59e0b' : '#cbd5e1' }}>
              {customDays === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const { user, loading } = useUser();
  const { data: projects = [], isLoading: projLoading } = useProjects();
  const { invalidateProjects } = useInvalidate();
  const [tab,            setTab]            = useState<'active' | 'completed' | 'archived'>('active');
  const [range,          setRange]          = useState<RangeKey>('all');
  const [customDays,     setCustomDays]     = useState(3);
  const [detailProject,  setDetailProject]  = useState<Project | null>(null);

  const [startDate, endDate] = rangeDates(range, customDays);
  const { data: rangeEntries = [], isLoading: entriesLoading } = useEntriesRange(startDate, endDate);
  const [showModal,      setShowModal]      = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState<Project | null>(null);
  const [deleteError,    setDeleteError]    = useState('');
  const [deleting,       setDeleting]       = useState(false);
  const [name,           setName]           = useState('');
  const [color,          setColor]          = useState(PALETTE[0]);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Inline rename inside detail modal
  const [renaming,     setRenaming]     = useState(false);
  const [renameValue,  setRenameValue]  = useState('');
  const [renameColor,  setRenameColor]  = useState(PALETTE[0]);
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError,  setRenameError]  = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showModal) setTimeout(() => inputRef.current?.focus(), 50);
    else { setName(''); setColor(PALETTE[0]); setError(''); }
  }, [showModal]);

  // Reset inline rename whenever the detail modal changes/closes
  useEffect(() => { setRenaming(false); setRenameError(''); }, [detailProject?._id]);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true); setError('');
    try {
      await api.createProject({ name: name.trim(), color });
      invalidateProjects();
      setShowModal(false);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const archive = async (id: string, archived: boolean) => {
    try {
      await api.archiveProject(id, archived);
      invalidateProjects();
    } catch (e) { setError((e as Error).message); }
  };

  const complete = async (id: string, done: boolean) => {
    try {
      await api.completeProject(id, done);
      invalidateProjects();
    } catch (e) { setError((e as Error).message); }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true); setDeleteError('');
    try {
      await api.deleteProject(confirmDelete._id);
      invalidateProjects();
      setConfirmDelete(null);
    } catch (e) { setDeleteError((e as Error).message); }
    finally { setDeleting(false); }
  };

  const startRename = () => {
    if (!detailProject) return;
    setRenameValue(detailProject.name);
    setRenameColor(detailProject.color);
    setRenameError('');
    setRenaming(true);
    setTimeout(() => renameRef.current?.focus(), 50);
  };

  const saveRename = async () => {
    if (!detailProject) return;
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenameError('Name cannot be empty'); return; }
    if (trimmed === detailProject.name && renameColor === detailProject.color) { setRenaming(false); return; }
    setRenameSaving(true); setRenameError('');
    try {
      const updated = await api.updateProject(detailProject._id, { name: trimmed, color: renameColor });
      setDetailProject(updated);
      invalidateProjects();
      setRenaming(false);
    } catch (e) { setRenameError((e as Error).message); }
    finally { setRenameSaving(false); }
  };

  if (loading || !user) return <Loader />;

  const active    = projects.filter((p) => !p.archived && !p.completed);
  const completed = projects.filter((p) =>  p.completed && !p.archived);
  const archived  = projects.filter((p) =>  p.archived);
  const displayed = tab === 'active' ? active : tab === 'completed' ? completed : archived;

  // Aggregate hours + entry count per project across the selected range
  type Stat = { hours: number; count: number; last?: string };
  const statsByProject = rangeEntries.reduce<Record<string, Stat>>((acc, e) => {
    const id = e.projectId?._id;
    if (!id) return acc;
    const s = (acc[id] ??= { hours: 0, count: 0 });
    s.hours += e.hours ?? 0;
    s.count += 1;
    if (!s.last || e.date > s.last) s.last = e.date;
    return acc;
  }, {});
  const statOf = (id: string): Stat => statsByProject[id] ?? { hours: 0, count: 0 };
  const totalHours   = rangeEntries.reduce((sum, e) => sum + (e.hours ?? 0), 0);
  const totalEntries = rangeEntries.length;
  const maxHours     = Math.max(...displayed.map((p) => statOf(p._id).hours), 1);
  const rangeLabel   = rangeLabelOf(range, customDays);

  const detailEntries = detailProject
    ? rangeEntries.filter((e) => e.projectId?._id === detailProject._id)
    : [];
  const detailHours = detailEntries.reduce((sum, e) => sum + (e.hours ?? 0), 0);

  const renderRow = (p: Project) => {
    const s   = statOf(p._id);
    const pct = maxHours > 0 ? (s.hours / maxHours) * 100 : 0;
    return (
    <div key={p._id} className="fade-up" style={{
      display: 'flex', alignItems: 'stretch', gap: 0,
      background: p.archived ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${p.completed && !p.archived ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 13, overflow: 'hidden',
      opacity: p.archived ? 0.55 : 1,
      transition: 'border-color 0.15s, opacity 0.15s',
    }}>
      <div style={{ width: 4, flexShrink: 0, background: p.color, opacity: p.archived ? 0.4 : 1, boxShadow: `2px 0 12px ${p.color}55` }} />

      {/* Clickable area → opens the project's entries */}
      <button
        onClick={() => setDetailProject(p)}
        title="View all log entries"
        style={{
          flex: 1, minWidth: 0, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12,
          background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, boxShadow: `0 0 8px ${p.color}88`, flexShrink: 0 }} />
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5, flex: '0 1 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: p.archived ? 'rgba(255,255,255,0.4)' : '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            {p.completed && !p.archived && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#4ade80', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', padding: '2px 7px', borderRadius: 6, flexShrink: 0 }}>
                ✓ Completed
              </span>
            )}
            {p.archived && (
              <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 6, flexShrink: 0 }}>
                Archived
              </span>
            )}
          </div>
          {/* Hours bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 200, maxWidth: '40vw' }}>
            <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: p.color, boxShadow: `0 0 6px ${p.color}66`, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Stat block: hours + entries in the selected range */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: s.hours > 0 ? p.color : 'rgba(255,255,255,0.25)' }}>
            {fmtHours(s.hours)}
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: s.hours > 0 ? p.color : 'rgba(255,255,255,0.2)', opacity: 0.75 }}>h</span>
        </div>
        <div style={{ width: 84, flexShrink: 0, textAlign: 'right' }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
            {s.count} {s.count === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>›</span>
      </button>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
        {!p.archived && (
          <button
            onClick={() => complete(p._id, !p.completed)}
            title={p.completed ? 'Reopen project' : 'Mark completed'}
            style={{
              background: p.completed ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${p.completed ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 8, cursor: 'pointer', color: p.completed ? '#4ade80' : 'rgba(255,255,255,0.35)',
              fontSize: '0.78rem', fontWeight: 600, padding: '5px 12px', transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { const el = e.currentTarget; el.style.color = p.completed ? '#f59e0b' : '#4ade80'; el.style.borderColor = p.completed ? '#f59e0b55' : 'rgba(34,197,94,0.4)'; el.style.background = p.completed ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)'; }}
            onMouseLeave={(e) => { const el = e.currentTarget; el.style.color = p.completed ? '#4ade80' : 'rgba(255,255,255,0.35)'; el.style.borderColor = p.completed ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'; el.style.background = p.completed ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)'; }}
          >{p.completed ? '↩' : '✓'}</button>
        )}
        <button
          onClick={() => archive(p._id, !p.archived)}
          title={p.archived ? 'Unarchive' : 'Archive'}
          style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.35)',
            fontSize: '0.78rem', fontWeight: 600, padding: '5px 12px', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { const el = e.currentTarget; el.style.color = p.archived ? '#22c55e' : '#f59e0b'; el.style.borderColor = p.archived ? '#22c55e55' : '#f59e0b55'; el.style.background = p.archived ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)'; }}
          onMouseLeave={(e) => { const el = e.currentTarget; el.style.color = 'rgba(255,255,255,0.35)'; el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.background = 'rgba(255,255,255,0.04)'; }}
        >{p.archived ? '↩' : '⊘'}</button>
        <button
          onClick={() => { setConfirmDelete(p); setDeleteError(''); }}
          title="Delete project"
          style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.35)',
            fontSize: '0.78rem', fontWeight: 600, padding: '5px 12px', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { const el = e.currentTarget; el.style.color = '#f87171'; el.style.borderColor = 'rgba(248,113,113,0.4)'; el.style.background = 'rgba(248,113,113,0.08)'; }}
          onMouseLeave={(e) => { const el = e.currentTarget; el.style.color = 'rgba(255,255,255,0.35)'; el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.background = 'rgba(255,255,255,0.04)'; }}
        >✕</button>
      </div>
    </div>
    );
  };

  return (
    <AppLayout user={user}>
      <div style={{ padding: '36px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', marginBottom: 6, textTransform: 'uppercase' }}>Manage</div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f1f5f9', margin: 0 }}>Projects</h1>
            <div style={{ marginTop: 5, fontSize: '0.78rem', color: 'rgba(255,255,255,0.28)' }}>
              {active.length} active
              {completed.length > 0 && <span style={{ marginLeft: 8 }}>· {completed.length} completed</span>}
              {archived.length > 0 && <span style={{ marginLeft: 8 }}>· {archived.length} archived</span>}
            </div>
          </div>
          <button className="btn-accent" onClick={() => setShowModal(true)} style={{ flexShrink: 0, marginTop: 4 }}>
            + New Project
          </button>
        </div>

        {/* Hours summary + range selector */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: '14px 18px', marginBottom: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: totalHours > 0 ? '#f59e0b' : 'rgba(255,255,255,0.3)' }}>
                  {entriesLoading ? '—' : fmtHours(totalHours)}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: totalHours > 0 ? '#f59e0b' : 'rgba(255,255,255,0.25)', opacity: 0.75 }}>h</span>
              </div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                Total · {rangeLabel}
              </div>
            </div>
            <div style={{ width: 1, height: 34, background: 'rgba(255,255,255,0.08)' }} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: totalEntries > 0 ? '#60a5fa' : 'rgba(255,255,255,0.3)' }}>
                {entriesLoading ? '—' : totalEntries}
              </div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                {totalEntries === 1 ? 'Entry' : 'Entries'}
              </div>
            </div>
          </div>

          {/* Range selector */}
          <RangeDropdown
            range={range}
            customDays={customDays}
            onPick={setRange}
            onCustom={(days) => { setCustomDays(days); setRange('custom'); }}
          />
        </div>

        {/* List toolbar: section label + Active/Archived tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
            {tab === 'active' ? 'Active Projects' : tab === 'completed' ? 'Completed Projects' : 'Archived Projects'}
          </span>
          <div style={{
            display: 'inline-flex', background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10,
            padding: 3, gap: 2,
          }}>
            {([['active', 'Active', active.length], ['completed', 'Completed', completed.length], ['archived', 'Archived', archived.length]] as const).map(([val, label, count]) => {
              const isActive = tab === val;
              return (
                <button key={val} onClick={() => setTab(val)} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '5px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                  color: isActive ? '#f1f5f9' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.15s',
                }}>
                  {label}
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, minWidth: 18, textAlign: 'center',
                    padding: '1px 6px', borderRadius: 99,
                    background: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                    color: isActive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.28)',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Project list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{
                height: 56, borderRadius: 13,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                animation: 'pulse 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.12}s`,
              }} />
            ))
          ) : displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.15)', fontSize: '0.85rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>⬡</div>
              {tab === 'active'
                ? <>No active projects — click <strong style={{ color: 'rgba(255,255,255,0.3)' }}>+ New Project</strong> to create one.</>
                : tab === 'completed'
                ? 'No completed projects yet — mark a project done with ✓.'
                : 'No archived projects.'}
            </div>
          ) : displayed.map(renderRow)}
        </div>

        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.15)', marginTop: 20 }}>
          Click a project to see all its log entries. Hours reflect the selected range. Projects with entries cannot be deleted; archived projects are hidden from the dashboard.
        </p>
      </div>

      {/* Project entries drill-down */}
      {detailProject && (
        <Portal>
        <div
          onClick={() => setDetailProject(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#0d0f1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 560, height: 'min(82vh, 680px)', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}
          >
            {/* Accent bar */}
            <div style={{ height: 4, flexShrink: 0, background: `linear-gradient(90deg, ${detailProject.color}, ${detailProject.color}22)` }} />

            {/* Modal header */}
            <div style={{ padding: '20px 22px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: `linear-gradient(180deg, ${detailProject.color}12, transparent)` }}>
              {renaming ? (
                /* ── Rename form ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Rename project</div>
                  <input
                    ref={renameRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(false); }}
                    placeholder="Project name"
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)',
                      borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 700,
                      outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {PALETTE.map((c) => (
                      <button key={c} type="button" onClick={() => setRenameColor(c)} style={{
                        width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: renameColor === c ? '2px solid #fff' : '2px solid transparent',
                        boxShadow: renameColor === c ? `0 0 8px ${c}` : 'none', padding: 0, transition: 'all 0.12s',
                      }} />
                    ))}
                  </div>
                  {renameError && <div style={{ color: '#f87171', fontSize: '0.78rem' }}>{renameError}</div>}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setRenaming(false)} style={{ padding: '7px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={saveRename} disabled={renameSaving} style={{ padding: '7px 18px', borderRadius: 9, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#f59e0b', fontSize: '0.82rem', fontWeight: 700, cursor: renameSaving ? 'not-allowed' : 'pointer', opacity: renameSaving ? 0.6 : 1, fontFamily: 'inherit' }}>{renameSaving ? 'Saving…' : 'Save'}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                      <span style={{ width: 13, height: 13, borderRadius: '50%', background: detailProject.color, boxShadow: `0 0 10px ${detailProject.color}99`, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h3 style={{ color: '#f1f5f9', fontSize: '1.15rem', fontWeight: 800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detailProject.name}</h3>
                          <button
                            onClick={startRename}
                            title="Rename project"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', flexShrink: 0, transition: 'all 0.15s', padding: 0 }}
                            onMouseEnter={(e) => { const el = e.currentTarget; el.style.color = '#f59e0b'; el.style.borderColor = 'rgba(245,158,11,0.35)'; el.style.background = 'rgba(245,158,11,0.08)'; }}
                            onMouseLeave={(e) => { const el = e.currentTarget; el.style.color = 'rgba(255,255,255,0.45)'; el.style.borderColor = 'rgba(255,255,255,0.1)'; el.style.background = 'rgba(255,255,255,0.05)'; }}
                          >✎</button>
                        </div>
                        <div style={{ fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>
                          Log entries · {rangeLabel}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setDetailProject(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 30, height: 30, color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>

                  {/* Totals */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, padding: '8px 14px', borderRadius: 11, background: `${detailProject.color}14`, border: `1px solid ${detailProject.color}2e` }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 800, color: detailProject.color }}>{fmtHours(detailHours)}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: detailProject.color, opacity: 0.75 }}>h logged</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, padding: '8px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#e2e8f0' }}>{detailEntries.length}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>{detailEntries.length === 1 ? 'entry' : 'entries'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Entries list */}
            <div style={{ padding: '14px 18px 18px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {entriesLoading ? (
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.82rem', textAlign: 'center', padding: '28px 0' }}>Loading entries…</div>
              ) : detailEntries.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.85rem', textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>✦</div>
                  No entries logged for this project in {rangeLabel.toLowerCase()}.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {detailEntries.map((e) => (
                    <div key={e._id} style={{ display: 'flex', alignItems: 'stretch', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 11, overflow: 'hidden' }}>
                      <div style={{ width: 3, flexShrink: 0, background: detailProject.color, opacity: 0.7 }} />
                      <div style={{ flex: 1, padding: '11px 14px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>{formatDate(e.date)}</span>
                          {e.hours != null && e.hours > 0 && (
                            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 5, padding: '1px 7px', flexShrink: 0 }}>
                              ⏱ {fmtHours(e.hours)}h
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.55, wordBreak: 'break-word' }}>{renderRichText(e.description)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <Portal>
        <div
          onClick={() => { setConfirmDelete(null); setDeleteError(''); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0d0f1c',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 20, padding: 28, width: '100%', maxWidth: 400,
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: '#f87171', textTransform: 'uppercase', marginBottom: 6 }}>
              Delete Project
            </div>
            <h3 style={{ color: '#f1f5f9', fontSize: '1.05rem', fontWeight: 800, margin: '0 0 10px' }}>
              Delete &ldquo;{confirmDelete.name}&rdquo;?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', margin: '0 0 20px', lineHeight: 1.5 }}>
              This action cannot be undone. Projects linked to tasks or log entries cannot be deleted.
            </p>
            {deleteError && (
              <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
                <p style={{ color: '#f87171', fontSize: '0.82rem', margin: 0 }}>{deleteError}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setConfirmDelete(null); setDeleteError(''); }}
                style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={remove}
                disabled={deleting}
                style={{ padding: '8px 18px', borderRadius: 10, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171', fontSize: '0.85rem', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}
              >{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Create modal */}
      {showModal && (
        <Portal>
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0d0f1c',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20, padding: 28, width: '100%', maxWidth: 440,
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 4 }}>
              New Project
            </div>
            <h3 style={{ color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 800, margin: '0 0 20px' }}>Create a project</h3>

            <input
              ref={inputRef}
              className="field"
              style={{ marginBottom: 18, borderRadius: 12 }}
              placeholder="Project name (e.g. TrueDialog, Side Project…)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setShowModal(false); }}
            />

            {/* Color picker */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: '0.63rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Color</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c,
                      border: `2.5px solid ${color === c ? '#fff' : 'transparent'}`,
                      cursor: 'pointer', transition: 'all 0.15s', padding: 0, outline: 'none',
                      transform: color === c ? 'scale(1.2)' : 'scale(1)',
                      boxShadow: color === c ? `0 0 12px ${c}99` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 20px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}88` }} />
              <span style={{ fontSize: '0.85rem', color: name ? '#f1f5f9' : 'rgba(255,255,255,0.2)', fontWeight: name ? 600 : 400 }}>
                {name || 'Project preview'}
              </span>
            </div>

            {error && <p style={{ color: '#f87171', fontSize: '0.78rem', marginBottom: 14 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', cursor: 'pointer' }}
              >Cancel</button>
              <button className="btn-accent" onClick={create} disabled={saving || !name.trim()}>
                {saving ? 'Creating…' : '+ Create Project'}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </AppLayout>
  );
}

'use client';
import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import Loader from '@/components/Loader';
import { useUser } from '@/lib/useUser';
import { api } from '@/lib/api';
import { useCalendar, useTasks, useInvalidate } from '@/lib/queries';
import type { Entry, Task } from '@/lib/types';

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };

function buildGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month - 1, 1).getDay();
  const days  = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isOverdue(dueDate: string) {
  return new Date(dueDate + 'T23:59:59') < new Date();
}

function daysUntil(d: string) {
  const diff = Math.ceil((new Date(d + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0)  return `${Math.abs(diff)}d overdue`;
  return `${diff}d left`;
}

export default function CalendarPage() {
  const { user, loading } = useUser();
  const now = new Date();
  const [year,     setYear]    = useState(now.getFullYear());
  const [month,    setMonth]   = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode,     setMode]    = useState<'entries'|'tasks'>('entries');

  const { data = {},   isLoading: calLoading }  = useCalendar(year, month);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { invalidateTasks } = useInvalidate();

  const prev = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const next = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  const pad      = (n: number) => String(n).padStart(2, '0');
  const grid     = buildGrid(year, month);
  const todayKey = now.toLocaleDateString('sv');

  // Tasks grouped by dueDate for current month
  const monthPrefix   = `${year}-${pad(month)}`;
  const tasksByDate   = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (t.dueDate?.startsWith(monthPrefix)) {
      (acc[t.dueDate] = acc[t.dueDate] || []).push(t);
    }
    return acc;
  }, {});

  const selEntries: Entry[] = selected ? (data[selected] || []) : [];
  const selTasks:   Task[]  = selected ? (tasksByDate[selected] || []) : [];

  async function toggleTask(id: string, completed: boolean) {
    await api.updateTask(id, { completed });
    invalidateTasks();
  }

  if (loading || !user || calLoading || tasksLoading) return <Loader />;

  return (
    <AppLayout user={user}>
      <div style={{ padding: '36px 32px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', marginBottom: 6, textTransform: 'uppercase' }}>Calendar</div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f1f5f9', margin: 0 }}>
              {MONTHS[month - 1]} <span style={{ color: 'rgba(255,255,255,0.3)' }}>{year}</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ fn: prev, icon: '‹' }, { fn: next, icon: '›' }].map(({ fn, icon }) => (
              <button key={icon} onClick={fn} style={{
                width: 36, height: 36, borderRadius: 9,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#f1f5f9'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}
              >{icon}</button>
            ))}
          </div>
        </div>

        {/* ── Mode tabs ── */}
        <div style={{
          display: 'inline-flex',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: 3, gap: 2, marginBottom: 18,
        }}>
          {([
            { val: 'entries' as const, icon: '◫', label: 'Entries' },
            { val: 'tasks'   as const, icon: '✓', label: 'Tasks'   },
          ]).map(({ val, icon, label }) => {
            const active = mode === val;
            return (
              <button key={val} onClick={() => { setMode(val); setSelected(null); }} style={{
                padding: '6px 18px', borderRadius: 9,
                background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
                border: `1px solid ${active ? 'rgba(245,158,11,0.22)' : 'transparent'}`,
                color: active ? '#f59e0b' : 'rgba(255,255,255,0.35)',
                fontSize: '0.78rem', fontWeight: active ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: '0.7rem' }}>{icon}</span> {label}
              </button>
            );
          })}
        </div>

        {/* ── Calendar grid ── */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20, overflow: 'hidden',
          backdropFilter: 'blur(12px)',
        }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {DAYS.map((d) => (
              <div key={d} style={{ textAlign: 'center', padding: '10px 0', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.06em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, background: 'rgba(255,255,255,0.03)', padding: 1 }}>
            {grid.map((day, i) => {
              if (!day) return <div key={i} style={{ background: 'rgba(7,8,16,0.6)', minHeight: 68 }} />;
              const key      = `${year}-${pad(month)}-${pad(day)}`;
              const entries  = data[key] || [];
              const dayTasks = tasksByDate[key] || [];
              const isToday  = key === todayKey;
              const isSel    = key === selected;
              const dots     = mode === 'entries' ? entries : dayTasks;
              const hasItems = dots.length > 0;

              return (
                <button key={key} onClick={() => setSelected(isSel ? null : key)} style={{
                  minHeight: 68,
                  background: isSel ? 'rgba(245,158,11,0.09)' : isToday ? 'rgba(96,165,250,0.06)' : 'rgba(7,8,16,0.7)',
                  border: `1px solid ${isSel ? 'rgba(245,158,11,0.25)' : isToday ? 'rgba(96,165,250,0.2)' : 'transparent'}`,
                  padding: '8px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5,
                  transition: 'all 0.15s', outline: 'none', borderRadius: 4,
                }}
                onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = isToday ? 'rgba(96,165,250,0.06)' : 'rgba(7,8,16,0.7)'; }}
                >
                  <span style={{
                    fontSize: '0.8rem', fontWeight: isToday ? 800 : 500, lineHeight: 1,
                    color: isToday ? '#60a5fa' : isSel ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                  }}>{day}</span>

                  {hasItems && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {mode === 'entries'
                        ? entries.slice(0, 5).map((e, idx) => (
                            <span key={idx} style={{
                              width: 7, height: 7, borderRadius: '50%',
                              background: e.projectId?.color || '#888',
                              boxShadow: `0 0 4px ${e.projectId?.color || '#888'}88`,
                            }} />
                          ))
                        : dayTasks.slice(0, 5).map((t, idx) => {
                            const c = t.projectId?.color ?? PRIORITY_COLOR[t.priority];
                            return (
                              <span key={idx} style={{
                                width: 7, height: 7, borderRadius: 2,
                                background: c,
                                boxShadow: `0 0 4px ${c}88`,
                                opacity: t.completed ? 0.35 : 1,
                              }} />
                            );
                          })
                      }
                      {dots.length > 5 && <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)' }}>+{dots.length - 5}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Selected day detail ── */}
        {selected && (
          <div className="fade-up" style={{
            marginTop: 14,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: '18px 20px',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: 12, letterSpacing: '0.04em' }}>
              {new Date(selected + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>

            {mode === 'entries' ? (
              selEntries.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.83rem', margin: 0 }}>Nothing logged.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selEntries.map((e) => (
                    <div key={e._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                        background: e.projectId?.color || '#888',
                        boxShadow: `0 0 6px ${e.projectId?.color || '#888'}88`,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: e.projectId?.color || '#888', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            {e.projectId?.name}
                          </div>
                          {e.hours != null && e.hours > 0 && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', whiteSpace: 'nowrap' }}>
                              ⏱ {e.hours}h
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{e.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              selTasks.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.83rem', margin: 0 }}>No tasks due this day.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selTasks.map((t) => {
                    const c  = t.projectId?.color ?? PRIORITY_COLOR[t.priority];
                    const od = !t.completed && isOverdue(t.dueDate!);
                    return (
                      <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          onClick={() => toggleTask(t._id, !t.completed)}
                          style={{
                            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                            background: t.completed ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1.5px solid ${t.completed ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.15)'}`,
                            cursor: 'pointer', padding: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#22c55e', fontSize: '0.65rem', fontWeight: 900,
                            transition: 'all 0.15s',
                          }}
                        >{t.completed ? '✓' : ''}</button>
                        <div style={{ flex: 1 }}>
                          {t.projectId && (
                            <span style={{ fontSize: '0.63rem', fontWeight: 800, color: t.projectId.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 6 }}>
                              {t.projectId.name}
                            </span>
                          )}
                          <span style={{
                            fontSize: '0.85rem', color: t.completed ? 'rgba(255,255,255,0.3)' : '#cbd5e1',
                            textDecoration: t.completed ? 'line-through' : 'none',
                          }}>{t.title}</span>
                        </div>
                        <span style={{
                          fontSize: '0.62rem', fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                          background: t.completed ? 'rgba(34,197,94,0.1)' : od ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${t.completed ? 'rgba(34,197,94,0.25)' : od ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}`,
                          color: t.completed ? '#22c55e' : od ? '#f87171' : 'rgba(255,255,255,0.3)',
                        }}>{t.completed ? 'Done' : daysUntil(t.dueDate!)}</span>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

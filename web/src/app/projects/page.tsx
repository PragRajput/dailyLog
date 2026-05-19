'use client';
import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import Loader from '@/components/Loader';
import { useUser } from '@/lib/useUser';
import { api } from '@/lib/api';
import { useProjects, useInvalidate } from '@/lib/queries';
import type { Project } from '@/lib/types';

const PALETTE = ['#3b82f6','#22c55e','#a855f7','#f97316','#ef4444','#eab308','#ec4899','#14b8a6'];

export default function ProjectsPage() {
  const { user, loading } = useUser();
  const { data: projects = [], isLoading: projLoading } = useProjects();
  const { invalidateProjects } = useInvalidate();
  const [tab,            setTab]            = useState<'active' | 'archived'>('active');
  const [showModal,      setShowModal]      = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState<Project | null>(null);
  const [deleteError,    setDeleteError]    = useState('');
  const [deleting,       setDeleting]       = useState(false);
  const [name,           setName]           = useState('');
  const [color,          setColor]          = useState(PALETTE[0]);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showModal) setTimeout(() => inputRef.current?.focus(), 50);
    else { setName(''); setColor(PALETTE[0]); setError(''); }
  }, [showModal]);

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

  if (loading || !user || projLoading) return <Loader />;

  const active   = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) =>  p.archived);
  const displayed = tab === 'active' ? active : archived;

  const renderRow = (p: Project) => (
    <div key={p._id} className="fade-up" style={{
      display: 'flex', alignItems: 'center', gap: 0,
      background: p.archived ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 13, overflow: 'hidden',
      opacity: p.archived ? 0.5 : 1,
      transition: 'border-color 0.15s, opacity 0.15s',
    }}>
      <div style={{ width: 4, flexShrink: 0, alignSelf: 'stretch', background: p.color, opacity: p.archived ? 0.4 : 1, boxShadow: `2px 0 12px ${p.color}55` }} />
      <div style={{ flex: 1, padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, boxShadow: `0 0 8px ${p.color}88`, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600, color: p.archived ? 'rgba(255,255,255,0.35)' : '#e2e8f0' }}>{p.name}</span>
        {p.archived && (
          <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 6 }}>
            Archived
          </span>
        )}
        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
          {new Date(p.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <button
          onClick={() => archive(p._id, !p.archived)}
          title={p.archived ? 'Unarchive' : 'Archive'}
          style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.35)',
            fontSize: '0.78rem', fontWeight: 600, padding: '5px 12px', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { const el = e.currentTarget; el.style.color = p.archived ? '#22c55e' : '#f59e0b'; el.style.borderColor = p.archived ? '#22c55e55' : '#f59e0b55'; el.style.background = p.archived ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)'; }}
          onMouseLeave={(e) => { const el = e.currentTarget; el.style.color = 'rgba(255,255,255,0.35)'; el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.background = 'rgba(255,255,255,0.04)'; }}
        >{p.archived ? '↩ Unarchive' : '⊘ Archive'}</button>
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
        >✕ Delete</button>
      </div>
    </div>
  );

  return (
    <AppLayout user={user}>
      <div style={{ padding: '36px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', marginBottom: 6, textTransform: 'uppercase' }}>Manage</div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f1f5f9', margin: 0 }}>Projects</h1>
            <div style={{ marginTop: 5, fontSize: '0.78rem', color: 'rgba(255,255,255,0.28)' }}>
              {active.length} active{archived.length > 0 && <span style={{ marginLeft: 8 }}>· {archived.length} archived</span>}
            </div>
          </div>
          <button className="btn-accent" onClick={() => setShowModal(true)} style={{ flexShrink: 0, marginTop: 4 }}>
            + New Project
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'inline-flex', background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
          padding: 3, gap: 2, marginBottom: 18,
        }}>
          {([['active', 'Active', active.length], ['archived', 'Archived', archived.length]] as const).map(([val, label, count]) => {
            const isActive = tab === val;
            return (
              <button key={val} onClick={() => setTab(val)} style={{
                padding: '6px 16px', borderRadius: 9, fontSize: '0.8rem', fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: isActive ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                color: isActive ? '#f1f5f9' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.15s',
              }}>
                {label}
                <span style={{ marginLeft: 6, fontSize: '0.72rem', color: isActive ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Project list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.15)', fontSize: '0.85rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>⬡</div>
              {tab === 'active'
                ? <>No active projects — click <strong style={{ color: 'rgba(255,255,255,0.3)' }}>+ New Project</strong> to create one.</>
                : 'No archived projects.'}
            </div>
          ) : displayed.map(renderRow)}
        </div>

        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.15)', marginTop: 20 }}>
          Projects with entries cannot be deleted. Archived projects are hidden from the dashboard.
        </p>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
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
      )}

      {/* Create modal */}
      {showModal && (
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
      )}
    </AppLayout>
  );
}

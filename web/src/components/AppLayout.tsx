'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { User } from '@/lib/types';
import { api } from '@/lib/api';
import ChatWidget from './ChatWidget';

const NAV = [
  { href: '/',         label: 'Today',    icon: '✦' },
  { href: '/calendar', label: 'Calendar', icon: '◫' },
  { href: '/tasks',    label: 'Tasks',    icon: '✓' },
  { href: '/projects', label: 'Projects', icon: '⬡' },
  { href: '/summary',  label: 'Summary',  icon: '✧' },
];

const PAGE_TITLES: Record<string, string> = {
  '/':          'Today',
  '/calendar':  'Calendar',
  '/tasks':     'Tasks',
  '/projects':  'Projects',
  '/summary':   'Summary',
};

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function Avatar({ src, name, size, dim }: { src?: string; name: string; size: number; dim?: boolean }) {
  const common: React.CSSProperties = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    border: '2px solid rgba(245,158,11,0.35)',
    boxShadow: '0 0 10px rgba(245,158,11,0.15)',
    opacity: dim ? 0.5 : 1,
    transition: 'opacity 0.2s',
  };
  if (src) return <img src={src} alt="" referrerPolicy="no-referrer" style={{ ...common, objectFit: 'cover' }} />;
  return (
    <div style={{
      ...common,
      background: 'linear-gradient(135deg,#f59e0b,#f97316)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${size * 0.38}px`, fontWeight: 800, color: '#0a0b14',
    }}>{name[0]}</div>
  );
}

export default function AppLayout({ user: initialUser, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [toast,     setToast]     = useState(false);
  const [user,      setUser]      = useState(initialUser);
  const [dropdown,  setDropdown]  = useState(false);
  const [editName,  setEditName]  = useState(false);
  const [nameVal,   setNameVal]   = useState(user.name);
  const [savingName, setSavingName] = useState(false);

  const dropdownRef  = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Show toast only once per session (right after login)
  useEffect(() => {
    if (!sessionStorage.getItem('greeted')) {
      sessionStorage.setItem('greeted', '1');
      setToast(true);
      const t = setTimeout(() => setToast(false), 3500);
      return () => clearTimeout(t);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdown(false);
        setEditName(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus name input when edit mode opens
  useEffect(() => {
    if (editName) setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [editName]);

  const logout = async () => { sessionStorage.removeItem('greeted'); await api.logout(); router.push('/login'); };

  const saveName = async () => {
    if (!nameVal.trim() || nameVal.trim() === user.name) { setEditName(false); return; }
    setSavingName(true);
    try {
      const { name } = await api.updateName(nameVal.trim());
      setUser((u) => ({ ...u, name }));
      setEditName(false);
    } catch { /* ignore */ }
    finally { setSavingName(false); }
  };

  const PAGE_SUBTITLES: Record<string, string> = {
    '/':          `${greet()}, ${user.name.split(' ')[0]}`,
    '/calendar':  'Work History',
    '/tasks':     'My Tasks',
    '/projects':  'My Projects',
    '/summary':   'AI Summary',
  };
  const pageTitle = PAGE_SUBTITLES[pathname] ?? PAGE_TITLES[pathname] ?? '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

      {/* ── Top Header ── */}
      <header style={{
        height: 56, flexShrink: 0,
        background: 'rgba(9,10,21,0.94)',
        borderBottom: '1px solid rgba(255,255,255,0.055)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px 0 0',
        zIndex: 20,
        boxShadow: '0 1px 0 rgba(255,255,255,0.03)',
      }}>
        {/* Logo — same width as sidebar */}
        <div style={{
          width: 220, flexShrink: 0, height: '100%',
          padding: '0 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderRight: '1px solid rgba(255,255,255,0.055)',
        }}>
          <div style={{
            fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg,#f59e0b,#f97316)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>DailyLog</div>
          <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.1em', marginTop: 1 }}>
            WORK TRACKER
          </div>
        </div>

        {/* Page title */}
        <div style={{ flex: 1, padding: '0 20px' }}>
          {pathname === '/' ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{
                fontSize: '0.9rem', fontWeight: 700,
                color: 'rgba(255,255,255,0.38)', letterSpacing: '0.01em',
              }}>
                {greet()},
              </span>
              <span style={{
                fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.01em',
                background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {user.name.split(' ')[0]}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.01em' }}>
              {pageTitle}
            </span>
          )}
        </div>

        {/* Profile trigger */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdown((d) => !d)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              background: dropdown ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${dropdown ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 30, padding: '5px 12px 5px 6px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { if (!dropdown) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; } }}
            onMouseLeave={(e) => { if (!dropdown) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; } }}
          >
            <Avatar src={user.avatar} name={user.name} size={28} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </span>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginLeft: 2 }}>
              {dropdown ? '▲' : '▼'}
            </span>
          </button>

          {/* ── Dropdown ── */}
          {dropdown && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 280,
              background: 'linear-gradient(160deg,#0e0f20,#0a0b18)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 16,
              boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.06)',
              overflow: 'hidden',
              animation: 'dropIn 0.15s ease',
              zIndex: 50,
            }}>

              {/* Profile header */}
              <div style={{
                padding: '18px 18px 14px',
                background: 'rgba(245,158,11,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}>
                <Avatar src={user.avatar} name={user.name} size={56} />

                {/* Name (editable) */}
                {editName ? (
                  <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                    <input
                      ref={nameInputRef}
                      value={nameVal}
                      onChange={(e) => setNameVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditName(false); setNameVal(user.name); } }}
                      style={{
                        flex: 1, background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: 8, padding: '6px 10px',
                        fontSize: '0.82rem', color: '#f1f5f9',
                        outline: 'none',
                      }}
                    />
                    <button onClick={saveName} disabled={savingName} style={{
                      background: 'linear-gradient(135deg,#f59e0b,#f97316)',
                      border: 'none', borderRadius: 8, padding: '0 12px',
                      fontSize: '0.75rem', fontWeight: 700, color: '#0a0b14',
                      cursor: savingName ? 'default' : 'pointer',
                      opacity: savingName ? 0.6 : 1,
                    }}>{savingName ? '…' : '✓'}</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>{user.name}</span>
                    <button onClick={() => { setNameVal(user.name); setEditName(true); }} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', padding: '2px 4px',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f59e0b')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)')}
                    >✎</button>
                  </div>
                )}
              </div>

              {/* Fields */}
              <div style={{ padding: '12px 18px' }}>
                {/* Email — disabled */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Email
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8, padding: '7px 10px',
                    fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
                    <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em', flexShrink: 0 }}>via Google</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  onClick={logout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    background: 'rgba(239,68,68,0.05)',
                    border: '1px solid rgba(239,68,68,0.12)',
                    borderRadius: 9, padding: '9px 12px',
                    color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem',
                    cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.25)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.12)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
                >
                  <span style={{ fontSize: '0.85rem' }}>→</span> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Body row ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: 220, flexShrink: 0,
          background: 'linear-gradient(180deg,#0d0e1c 0%,#090a15 100%)',
          borderRight: '1px solid rgba(255,255,255,0.055)',
          display: 'flex', flexDirection: 'column',
        }}>
          <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {NAV.map(({ href, label, icon }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 12px', borderRadius: 9,
                    background: active ? 'rgba(245,158,11,0.1)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(245,158,11,0.18)' : 'transparent'}`,
                    color: active ? '#f59e0b' : 'rgba(255,255,255,0.35)',
                    fontSize: '0.83rem', fontWeight: active ? 700 : 500,
                    transition: 'all 0.15s',
                    boxShadow: active ? '0 0 14px rgba(245,158,11,0.07)' : 'none',
                  }}>
                    <span style={{ fontSize: '0.78rem', width: 16, textAlign: 'center' }}>{icon}</span>
                    {label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
          {children}
        </main>
      </div>

      {/* ── Floating Chat Widget ── */}
      <ChatWidget />

      {/* ── Welcome toast ── */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%',
        transform: toast ? 'translate(-50%,0)' : 'translate(-50%,16px)',
        zIndex: 999,
        background: 'linear-gradient(135deg,rgba(15,17,30,0.97),rgba(20,22,38,0.97))',
        border: '1px solid rgba(245,158,11,0.25)',
        backdropFilter: 'blur(16px)',
        borderRadius: 14, padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.08)',
        transition: 'all 0.4s ease',
        opacity: toast ? 1 : 0,
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#f59e0b,#f97316)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', fontWeight: 800, color: '#0a0b14',
        }}>{user.name[0]}</div>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>
            {greet()}, {user.name.split(' ')[0]}!
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
            Ready to log your work today?
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

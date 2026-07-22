'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '@/components/AppLayout';
import Loader from '@/components/Loader';
import { useUser } from '@/lib/useUser';
import { api } from '@/lib/api';
import { useProjects, useTasks, useInvalidate } from '@/lib/queries';
import type { Entry, Task } from '@/lib/types';

function todayLocal() { return new Date().toLocaleDateString('sv'); }
function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}
function shortDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
/** Whole days from `from` to `to` (both YYYY-MM-DD). */
function dayDiff(from: string, to: string) {
  const a = new Date(from + 'T00:00:00').getTime();
  const b = new Date(to + 'T00:00:00').getTime();
  return Math.round((b - a) / 86400000);
}
/** 3 → "3", 3.5 → "3.5", 3.25 → "3.25" */
function fmtHours(h: number) {
  return Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

const PRIORITY_COLOR: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
const PRIORITY_RANK:  Record<string, number> = { high: 0, medium: 1, low: 2 };

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: 'Smileys', emojis: ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','😵‍💫','🤠','🥸','🥳','😷','🤒','🤕','🤢','🤮','🤧','😇','🥹','🫠','🤡','🤓'] },
  { label: 'People', emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁','👅','👄','🫦','💋','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷','👮','🕵️','💂','🥷','👷','🫅','🤴','👸','👳','👲','🧕','🤵','👰','🤰','🫃','🤱','👼','🎅','🤶','🧑‍🎄','🦸','🦹','🧙','🧝','🧛','🧟','🧞','🧜','🧚','🧑‍🤝‍🧑','👫','👬','👭','💏','💑','👨‍👩‍👦','🗣️','👤','💃','🕺'] },
  { label: 'Animals', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪲','🦟','🦗','🪳','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔','🐾','🐉','🐲','🌵','🎄','🌲','🌳','🌴','🪵','🌱','🌿','☘️','🍀','🎍','🪴','🎋','🍃','🍂','🍁','🪺','🪹','🍄','🌾','💐','🌷','🌹','🥀','🪷','🌺','🌸','🌼','🌻','🌞','🌝','🍋','🍊','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🫛','🫑','🌶️','🥦','🥬','🥒','🫒','🌰','🥜','🍞','🥐','🥖','🫓','🥨','🥯','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖'] },
  { label: 'Food', emojis: ['🍕','🌭','🍔','🍟','🌮','🌯','🫔','🥙','🧆','🥚','🍳','🥘','🍲','🫕','🥣','🥗','🍿','🧂','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🧁','🍡','🍧','🍨','🍦','🥧','🧊','🍬','🍭','🍮','🍯','🍩','🍪','🎂','🍰','🥮','🍫','☕','🫖','🍵','🧋','🥛','🍺','🍻','🥂','🍷','🫗','🥃','🍸','🍹','🧉','🍾','🧃','🥤','🧊','🥢','🍽️','🍴','🥄','🫙'] },
  { label: 'Travel', emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','⛽','🚨','🚥','🚦','🛑','🚧','⚓','🛟','⛵','🚤','🛥️','🛳️','⛴️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰️','🚀','🛸','🪐','🌍','🌎','🌏','🌐','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏗️','🏘️','🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋','⛲','🎠','🎡','🎢','💈','🎪','🛎️','🧳','⌛','⏰','🌡️','☂️','☔','🌂','🌬️','🌀','🌈','🌊','🌌'] },
  { label: 'Activities', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🛝','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🏇','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🪘','🥁','🪗','🎷','🎺','🪕','🎸','🎹','🎲','♟️','🎯','🎳','🎰','🎮','🕹️','🧩','🪅','🪆','🪄','🃏','🀄','🎴','🔮','🧿'] },
  { label: 'Objects', emojis: ['📱','💻','🖥️','🖨️','⌨️','🖱️','🖲️','💽','💾','💿','📀','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🧭','⏱️','⏲️','⏰','🕰️','⌛','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💰','💳','💎','⚖️','🔧','🪛','🔩','⚙️','🗜️','🔗','⛓️','🪝','🧲','🪜','🧰','🪤','🗑️','🛡️','⚔️','🪚','🔫','🪃','🏹','🪤','🔑','🗝️','🔐','🔒','🔓','🪪','🧲','🔬','🔭','📡','💉','🩸','💊','🩹','🩺','🩻','🩼','🧬','🦠','🧪','🧫','🧲','🪞','🪟','🛋️','🪑','🚿','🛁','🪠','🧴','🪥','🧷','🧹','🧺','🧻','🪣','🧼','🫧','🧽','🪒','🧻','🛒','🚪','🪞','🎁','🎀','🎊','🎉','🎈','🎋','🎍','🎎','🎐','🎏','🧧','🎆','🎇'] },
  { label: 'Symbols', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','📶','🛜','📳','📴','⚜️','🔱','📛','🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🛗','🈳','🈂️','🛂','🛃','🛄','🛅','🚹','🚺','🚼','⚧','🚻','🚮','🎦','📵','🔇','🔕','🔔','🔊','📢','📣','🔉','🔈','🃏','🀄','♠️','♣️','♥️','♦️','🎴','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔷','🔶','🔹','🔸','🔲','🔳','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫','🔈','🔉','🔊','📯','🔔','🔕','🎵','🎶','✔️','🔖','🏷️','💱','💲','➕','➖','➗','✖️','🟰','♾️','💲','⚡','🌟','✨','💫','⭐','🌠','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','🍃','💨','🌪️','🌈','☔','💧','💦','🌊'] },
];

function renderRichText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            style={{ color: '#60a5fa', textDecoration: 'underline', wordBreak: 'break-all' }}>
            {part}
          </a>
        ) : (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>
        )
      )}
    </>
  );
}

function needsExpand(text: string) {
  const lines = text.split('\n');
  return lines.length > 2 || text.length > 180;
}

// Motion variants
const listVariants = { show: { transition: { staggerChildren: 0.06 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  show:   { opacity: 1, scale: 1,    y: 0, transition: { type: 'spring' as const, stiffness: 350, damping: 30 } },
  exit:   { opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.15 } },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1 },
  exit:   { opacity: 0, transition: { duration: 0.2 } },
};

function Card({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.3)', ...style,
      }}
    >{children}</motion.div>
  );
}

function CardHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{
      padding: '12px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: 'rgba(255,255,255,0.01)', borderRadius: '16px 16px 0 0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    }}>
      <span style={{ fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase' }}>
        {title}
      </span>
      {right}
    </div>
  );
}

/** Compact stat tile for the day-at-a-glance strip. */
function Stat({ label, value, unit, color, muted }: { label: string; value: string | number; unit?: string; color: string; muted?: boolean }) {
  return (
    <div style={{
      background: muted ? 'rgba(255,255,255,0.02)' : `${color}0d`,
      border: `1px solid ${muted ? 'rgba(255,255,255,0.06)' : color + '2e'}`,
      borderRadius: 13, padding: '11px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em', color: muted ? 'rgba(255,255,255,0.28)' : color, lineHeight: 1.1 }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: muted ? 'rgba(255,255,255,0.2)' : color, opacity: 0.7 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

const DROPDOWN_MAX_H = 250;

/**
 * Single-line project picker with a search box — replaces the wall of project chips.
 * The list is portalled to <body> and fixed-positioned against the trigger, so it floats
 * above the `overflow: hidden` containers it sits inside (entry edit panel, modals).
 */
function ProjectSelect({ projects, value, onChange, placeholder = 'Select a project…' }: {
  projects: { _id: string; name: string; color: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const [pos,   setPos]   = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);

  const sel = projects.find((p) => p._id === value);
  const q   = query.trim().toLowerCase();
  const filtered = q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects;

  // Pin the panel to the trigger; flip above it when there isn't room below
  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const up    = below < DROPDOWN_MAX_H && r.top > below;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: r.left, width: r.width, up });
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();
    // `true` catches scrolls in any ancestor container, not just the window
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, measure]);

  // Close when clicking outside both the trigger and the portalled panel
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Focus the search box on open, reset the query on close
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40);
    else setQuery('');
  }, [open]);

  const pick = (id: string) => { onChange(id); setOpen(false); };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(245,158,11,0.4)' : sel ? sel.color + '55' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10, padding: '9px 12px', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left', transition: 'border-color 0.15s',
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: sel?.color ?? 'rgba(255,255,255,0.2)',
          boxShadow: sel ? `0 0 8px ${sel.color}` : 'none',
        }} />
        <span style={{
          flex: 1, minWidth: 0, fontSize: '0.82rem', fontWeight: 700,
          color: sel ? sel.color : 'rgba(255,255,255,0.4)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {sel ? sel.name : placeholder}
        </span>
        <span style={{ flexShrink: 0, fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
      </button>

      {open && pos && createPortal(
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: pos.up ? 4 : -4 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
            transform: pos.up ? 'translateY(-100%)' : undefined,
            zIndex: 2000,
            background: 'rgba(13,15,28,0.98)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ padding: 7, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
                if (e.key === 'Enter')  { e.preventDefault(); if (filtered[0]) pick(filtered[0]._id); }
              }}
              placeholder="Search projects…"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7,
                padding: '6px 10px', color: '#f1f5f9', fontSize: '0.78rem',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ maxHeight: DROPDOWN_MAX_H - 60, overflowY: 'auto', padding: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
                No projects match “{query.trim()}”
              </div>
            ) : filtered.map((p) => {
              const active = p._id === value;
              return (
                <motion.button
                  key={p._id} type="button" onClick={() => pick(p._id)}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '7px 9px', borderRadius: 7, cursor: 'pointer',
                    background: active ? p.color + '18' : 'transparent',
                    border: 'none', textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  <span style={{
                    flex: 1, minWidth: 0, fontSize: '0.8rem',
                    fontWeight: active ? 700 : 500,
                    color: active ? p.color : '#cbd5e1',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{p.name}</span>
                  {active && <span style={{ fontSize: '0.7rem', color: p.color, flexShrink: 0 }}>✓</span>}
                </motion.button>
              );
            })}
          </div>
        </motion.div>,
        document.body
      )}
    </>
  );
}

function TaskGroup({ label, count, color, children }: { label: string; count: number; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
        <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color }}>{label}</span>
        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.22)' }}>{count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

export default function TodayPage() {
  const { user, loading } = useUser();
  const { data: projects = [] } = useProjects();
  const { data: allTasks = [] } = useTasks();
  const { invalidateTasks } = useInvalidate();
  const [entries,     setEntries]     = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [description,   setDescription]   = useState('');
  const [hours,         setHours]         = useState('');
  const [selectedDate,  setSelectedDate]  = useState('');
  const [projectId,     setProjectId]     = useState('');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');

  // Entry edit state
  const [editEntryId,     setEditEntryId]     = useState<string | null>(null);
  const [editEntryDesc,   setEditEntryDesc]   = useState('');
  const [editEntryProj,   setEditEntryProj]   = useState('');
  const [editEntryHours,  setEditEntryHours]  = useState('');
  const [editEntrySaving, setEditEntrySaving] = useState(false);

  // Completion modal
  const [completingTask,    setCompletingTask]   = useState<Task | null>(null);
  const [completionNote,    setCompletionNote]   = useState('');
  const [completionHours,   setCompletionHours]  = useState('');
  const [completionProjId,  setCompletionProjId] = useState('');
  const [completionSaving,  setCompletionSaving] = useState(false);
  const [completionError,   setCompletionError]  = useState('');

  // Task detail modal
  const [detailTask,     setDetailTask]     = useState<Task | null>(null);
  const [taskEntries,    setTaskEntries]    = useState<Entry[]>([]);
  const [taskEntLoading, setTaskEntLoading] = useState(false);

  // Entry expand / emoji picker
  const [showUpcoming,    setShowUpcoming]    = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Quick notes (localStorage, date-scoped)
  type QuickNote = { id: string; text: string; done: boolean };
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [quickInput, setQuickInput] = useState('');

  const today = todayLocal();
  const activeDate = selectedDate || today;
  const dateWeekday = new Date(activeDate + 'T00:00:00').toLocaleDateString('en', { weekday: 'long' });
  const dateRest    = new Date(activeDate + 'T00:00:00').toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' });
  const isToday = activeDate === today;

  const goToPrevDay = () => {
    const d = new Date(activeDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toLocaleDateString('sv'));
  };
  // Clicking the date opens the browser's native calendar
  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    try { el.showPicker(); } catch { el.focus(); }
  };

  const goToNextDay = () => {
    if (isToday) return;
    const d = new Date(activeDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const next = d.toLocaleDateString('sv');
    setSelectedDate(next === today ? '' : next);
  };

  // Pending tasks bucketed against the day being viewed (dates are YYYY-MM-DD, so string compare is safe)
  const byDue      = (a: Task, b: Task) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
  const byPriority = (a: Task, b: Task) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDue(a, b);
  const pending    = allTasks.filter((tk) => !tk.completed);
  const overdueTasks  = pending.filter((tk) => tk.dueDate && tk.dueDate <  activeDate).sort(byDue);
  const dueTodayTasks = pending.filter((tk) => tk.dueDate === activeDate).sort(byPriority);
  const upcomingTasks = pending.filter((tk) => tk.dueDate && tk.dueDate >  activeDate).sort(byDue);

  const load = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const e = await api.getEntries({ date: activeDate });
      setEntries(e);
    } finally { setEntriesLoading(false); }
  }, [activeDate]);

  useEffect(() => { if (user) load(); }, [user, load]);

  useEffect(() => {
    if (projects.length) setProjectId((id) => id || projects[0]._id);
  }, [projects]);

  // Load quick notes for active date from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(`quicknotes-${activeDate}`);
    setQuickNotes(raw ? JSON.parse(raw) : []);
  }, [activeDate]);

  const saveQuickNotes = (notes: QuickNote[]) => {
    setQuickNotes(notes);
    localStorage.setItem(`quicknotes-${activeDate}`, JSON.stringify(notes));
  };

  const addQuickNote = () => {
    if (!quickInput.trim()) return;
    saveQuickNotes([...quickNotes, { id: Date.now().toString(), text: quickInput.trim(), done: false }]);
    setQuickInput('');
  };

  const toggleQuickNote = (id: string) =>
    saveQuickNotes(quickNotes.map((n) => n.id === id ? { ...n, done: !n.done } : n));

  const deleteQuickNote = (id: string) =>
    saveQuickNotes(quickNotes.filter((n) => n.id !== id));

  const addEntry = async () => {
    if (!projectId) { setError('Select a project first.'); return; }
    if (!description.trim()) { setError('Add a description before saving.'); return; }
    setSaving(true); setError('');
    try {
      const parsedHours = parseFloat(hours);
      const entry = await api.createEntry({
        projectId, date: activeDate, description: description.trim(),
        hours: !isNaN(parsedHours) && parsedHours > 0 ? parsedHours : null,
      });
      setEntries((prev) => [entry, ...prev]);
      setDescription('');
      setHours('');
    } catch (e) {
      setError((e as Error).message);
    }
    finally { setSaving(false); }
  };

  const deleteEntry = async (id: string) => {
    await api.deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e._id !== id));
    if (editEntryId === id) setEditEntryId(null);
  };

  const openEditEntry = (e: Entry) => {
    setEditEntryId(e._id);
    setEditEntryDesc(e.description);
    setEditEntryProj(e.projectId?._id || '');
    setEditEntryHours(e.hours != null ? String(e.hours) : '');
  };

  const saveEditEntry = async () => {
    if (!editEntryDesc.trim() || !editEntryId) return;
    setEditEntrySaving(true);
    try {
      const parsedHours = parseFloat(editEntryHours);
      const updated = await api.updateEntry(editEntryId, {
        description: editEntryDesc.trim(),
        projectId:   editEntryProj || undefined,
        hours:       !isNaN(parsedHours) && parsedHours > 0 ? parsedHours : null,
      });
      setEntries((prev) => prev.map((e) => e._id === editEntryId ? updated : e));
      setEditEntryId(null);
    } catch { /* silent */ }
    finally { setEditEntrySaving(false); }
  };

  const openCompletion = (task: Task) => {
    setCompletingTask(task);
    setCompletionNote('');
    setCompletionHours('');
    setCompletionError('');
    setCompletionProjId(task.projectId?._id || projectId || '');
  };

  const submitCompletion = async (partial: boolean) => {
    if (!completingTask || completionSaving) return;
    if (completionNote.trim() && !completionProjId) {
      setCompletionError('Select a project to save the entry.');
      return;
    }
    setCompletionSaving(true);
    setCompletionError('');
    try {
      if (completionNote.trim() && completionProjId) {
        const parsedHours = parseFloat(completionHours);
        const entry = await api.createEntry({
          projectId:   completionProjId,
          date:        activeDate,
          description: completionNote.trim(),
          taskId:      completingTask._id,
          hours:       !isNaN(parsedHours) && parsedHours > 0 ? parsedHours : null,
        });
        setEntries((prev) => [entry, ...prev]);
      }
      if (!partial) {
        await api.updateTask(completingTask._id, { completed: true });
        invalidateTasks();
      }
      setCompletingTask(null);
    } catch (e) {
      setCompletionError((e as Error).message);
    }
    finally { setCompletionSaving(false); }
  };

  const openDetail = async (task: Task) => {
    setDetailTask(task);
    setTaskEntries([]);
    setTaskEntLoading(true);
    try {
      const entries = await api.getTaskEntries(task._id);
      setTaskEntries(entries);
    } finally { setTaskEntLoading(false); }
  };

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) { setDescription((d) => d + emoji); return; }
    const start = ta.selectionStart ?? description.length;
    const end   = ta.selectionEnd   ?? description.length;
    const next  = description.slice(0, start) + emoji + description.slice(end);
    setDescription(next);
    setShowEmojiPicker(false);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
  };

  const toggleExpand = (id: string) =>
    setExpandedEntries((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  if (loading || !user) return <Loader />;
  // if (true) return <Loader />;

  const activeProjects = projects.filter((p) => !p.archived && !p.completed);
  const selProj = activeProjects.find((p) => p._id === projectId);

  const totalHours = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0);

  // Time / effort split across the projects touched on this day
  const projectBreakdown = Object.values(
    entries.reduce<Record<string, { name: string; color: string; hours: number; count: number }>>((acc, e) => {
      const id = e.projectId?._id ?? 'none';
      acc[id] ??= { name: e.projectId?.name ?? 'Uncategorised', color: e.projectId?.color ?? '#64748b', hours: 0, count: 0 };
      acc[id].hours += e.hours ?? 0;
      acc[id].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.hours - a.hours || b.count - a.count);
  // Bars scale by hours when any are logged, otherwise by entry count
  const breakdownMax = Math.max(...projectBreakdown.map((p) => (totalHours > 0 ? p.hours : p.count)), 1);

  const renderTask = (t: Task) => {
    const c    = t.projectId?.color ?? PRIORITY_COLOR[t.priority];
    const late = t.dueDate && t.dueDate < activeDate ? dayDiff(t.dueDate, activeDate) : 0;
    const away = t.dueDate && t.dueDate > activeDate ? dayDiff(activeDate, t.dueDate) : 0;
    return (
      <motion.div key={t._id} layout
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        whileHover={{ x: 2 }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, borderLeft: `3px solid ${c}`, background: `${c}08`, transition: 'background 0.2s' }}
      >
        <motion.button onClick={() => openCompletion(t)} title="Log progress / mark done"
          whileHover={{ scale: 1.15, borderColor: 'rgba(34,197,94,0.6)' }} whileTap={{ scale: 0.9 }}
          style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            {t.projectId && (
              <span style={{ fontSize: '0.6rem', fontWeight: 800, color: t.projectId.color, textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.projectId.name}
              </span>
            )}
            {late > 0 && (
              <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#f87171', flexShrink: 0 }}>
                ⚠ {late}d late
              </span>
            )}
            {away > 0 && (
              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>
                {away === 1 ? 'tomorrow' : `in ${away}d`}
              </span>
            )}
          </div>
          <motion.button onClick={() => openCompletion(t)} title="Log progress / mark done" whileHover={{ color: '#f1f5f9' }}
            style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, textAlign: 'left', fontSize: '0.83rem', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', minWidth: 0 }}
          >{t.title}</motion.button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {t.priority === 'high' && (
            <span style={{ fontSize: '0.58rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
              high
            </span>
          )}
          <motion.button onClick={() => openDetail(t)} title="View task details"
            whileHover={{ scale: 1.1, color: '#93c5fd' }} whileTap={{ scale: 0.9 }}
            style={{ width: 22, height: 22, borderRadius: 5, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >⊙</motion.button>
        </div>
      </motion.div>
    );
  };

  return (
    <AppLayout user={user}>
      <div className="page-pad">

        {/* ── Header: date navigation + primary action ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* One segmented control: ‹ | date (opens calendar) | › */}
            {/* Same surface tokens as the stat tiles below: 0.02 fill, 0.06 border, no shadow */}
            <div style={{
              display: 'flex', alignItems: 'stretch', height: 38,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, overflow: 'hidden',
            }}>
              <motion.button onClick={goToPrevDay} title="Previous day"
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#f1f5f9' }} whileTap={{ scale: 0.9 }}
                style={{ background: 'transparent', border: 'none', width: 30, cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >‹</motion.button>

              <motion.button
                onClick={openDatePicker} title="Jump to a date"
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                style={{
                  position: 'relative', display: 'flex', alignItems: 'center', gap: 7,
                  padding: '0 13px', cursor: 'pointer', background: 'transparent',
                  border: 'none', borderLeft: '1px solid rgba(255,255,255,0.06)',
                  borderRight: '1px solid rgba(255,255,255,0.06)', fontFamily: 'inherit',
                }}
              >
                <h1 style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '-0.01em', color: '#f1f5f9' }}>
                    {dateWeekday}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'rgba(255,255,255,0.32)' }}>
                    {dateRest}
                  </span>
                </h1>
                <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.28)', marginLeft: 1 }}>▼</span>
                {/* Hidden native input — the button above drives its picker */}
                <input
                  ref={dateInputRef}
                  type="date" value={activeDate} max={today}
                  onChange={(e) => setSelectedDate(e.target.value === today ? '' : e.target.value)}
                  tabIndex={-1} aria-hidden
                  style={{ position: 'absolute', bottom: 0, left: 16, width: 1, height: 1, opacity: 0, pointerEvents: 'none', colorScheme: 'dark' }}
                />
              </motion.button>

              <motion.button onClick={goToNextDay} disabled={isToday} title="Next day"
                whileHover={!isToday ? { backgroundColor: 'rgba(255,255,255,0.05)', color: '#f1f5f9' } : {}}
                whileTap={!isToday ? { scale: 0.9 } : {}}
                style={{ background: 'transparent', border: 'none', width: 30, cursor: isToday ? 'not-allowed' : 'pointer', color: isToday ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >›</motion.button>
            </div>

            {/* Status: a live badge on today, a reset button on any other day */}
            {isToday ? (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 12px',
                borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              }}>
                <motion.span
                  animate={{ opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#f59e0b' }}
                />
                <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b' }}>
                  Today
                </span>
              </span>
            ) : (
              <motion.button onClick={() => setSelectedDate('')}
                initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                title="Back to today"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 13px',
                  borderRadius: 10, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                  {dayDiff(activeDate, today)}d ago
                </span>
                <span style={{ width: 1, height: 13, background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap' }}>
                  Today
                </span>
              </motion.button>
            )}
          </div>

        </motion.div>

        {/* ── Day at a glance ── */}
        <motion.div
          className="stat-grid"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.06 }}
          style={{ marginBottom: 20 }}
        >
          <Stat label="Hours logged" value={fmtHours(totalHours)} unit="h" color="#f59e0b" muted={totalHours === 0} />
          <Stat label={entries.length === 1 ? 'Entry' : 'Entries'} value={entries.length} color="#60a5fa" muted={entries.length === 0} />
          <Stat label="Due today" value={dueTodayTasks.length} color="#a78bfa" muted={dueTodayTasks.length === 0} />
          <Stat label="Overdue" value={overdueTasks.length} color="#ef4444" muted={overdueTasks.length === 0} />
        </motion.div>

        {/* ── Two-column layout ── */}
        <div className="today-grid">

          {/* ── LEFT: Log Work + Entries ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Log Work card */}
            <Card delay={0.1} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 32px rgba(0,0,0,0.25)' }}>
              <div style={{ padding: '16px 18px' }}>
                {activeProjects.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: '0.85rem', margin: '8px 0' }}>
                    No projects yet — <a href="/projects" style={{ color: '#f59e0b', textDecoration: 'none' }}>create one first →</a>
                  </p>
                ) : (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <ProjectSelect projects={activeProjects} value={projectId} onChange={setProjectId} />
                    </div>
                    <textarea
                      ref={textareaRef} rows={6} className="field"
                      style={{ resize: 'none', borderRadius: 12, marginBottom: 8, fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: 1.6 }}
                      placeholder={selProj ? `What did you work on for ${selProj.name}?` : 'What did you work on?'}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addEntry(); }}
                    />
                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div key="emoji-picker" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }} style={{ overflow: 'hidden' }}
                        >
                          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '10px 10px 6px', marginBottom: 10, maxHeight: 220, overflowY: 'auto' }}>
                            {EMOJI_CATEGORIES.map((cat) => (
                              <div key={cat.label} style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{cat.label}</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                  {cat.emojis.map((em) => (
                                    <motion.button key={em} onClick={() => insertEmoji(em)}
                                      whileHover={{ scale: 1.25, background: 'rgba(255,255,255,0.1)' }} whileTap={{ scale: 0.9 }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.05rem', padding: '3px', borderRadius: 5, lineHeight: 1 }}
                                    >{em}</motion.button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {error && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{ color: '#f87171', fontSize: '0.78rem', marginBottom: 10 }}
                        >{error}</motion.p>
                      )}
                    </AnimatePresence>
                    {/* Toolbar: emoji + hours sit inline with the submit button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                      <motion.button onClick={() => setShowEmojiPicker((v) => !v)} title="Insert emoji"
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        style={{
                          background: showEmojiPicker ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${showEmojiPicker ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
                          fontSize: '0.75rem', fontWeight: 600, color: showEmojiPicker ? '#f59e0b' : 'rgba(255,255,255,0.45)',
                          lineHeight: 1, display: 'flex', alignItems: 'center', gap: 5,
                          transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                        }}
                      >
                        <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>☺</span> Emoji
                      </motion.button>

                      {/* Hours input */}
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
                        <span style={{ padding: '7px 9px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', borderRight: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap', lineHeight: 1 }}>⏱ hrs</span>
                        <input
                          type="number"
                          min="0.25" max="24" step="0.25"
                          placeholder="—"
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                          style={{
                            width: 54, background: 'transparent', border: 'none', outline: 'none',
                            color: hours ? '#f1f5f9' : 'rgba(255,255,255,0.25)',
                            fontSize: '0.78rem', fontWeight: 600, padding: '7px 8px',
                            fontFamily: 'inherit', textAlign: 'center',
                          }}
                        />
                      </div>

                      <div style={{ flex: 1 }} />

                      <motion.button className="btn-accent" onClick={addEntry} disabled={saving}
                        whileHover={!saving ? { scale: 1.04, y: -1 } : {}} whileTap={{ scale: 0.96 }}
                        style={{ minWidth: 100, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', opacity: (!description.trim() || !projectId) ? 0.45 : 1, transition: 'opacity 0.15s' }}
                      >
                        {saving ? <span style={{ opacity: 0.7 }}>Saving…</span> : <><span style={{ fontSize: '0.9rem' }}>+</span> Add Entry</>}
                      </motion.button>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Entries list */}
            <AnimatePresence mode="wait">
              {entriesLoading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{
                      height: 58, borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      animation: 'pulse 1.4s ease-in-out infinite',
                      animationDelay: `${i * 0.12}s`,
                    }} />
                  ))}
                </motion.div>
              ) : entries.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.12)' }}
                >
                  <motion.div animate={{ opacity: [0.2, 0.5, 0.2], rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ fontSize: '2rem', marginBottom: 10 }}
                  >✦</motion.div>
                  <div style={{ fontSize: '0.85rem' }}>Nothing logged yet — start your day above.</div>
                </motion.div>
              ) : (
                <motion.div key="entries-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
                      Logged Entr{entries.length === 1 ? 'y' : 'ies'}
                    </span>
                    {totalHours > 0 && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(245,158,11,0.7)' }}>
                        {fmtHours(totalHours)}h total
                      </span>
                    )}
                  </div>
                  <motion.div variants={listVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <AnimatePresence initial={false}>
                      {entries.map((e) => {
                        const isEditing = editEntryId === e._id;
                        return (
                          <motion.div key={e._id} variants={itemVariants} layout
                            exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                            whileHover={!isEditing ? { borderColor: e.projectId?.color ? `${e.projectId.color}40` : 'rgba(255,255,255,0.12)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' } : {}}
                            style={{
                              background: isEditing ? 'rgba(245,158,11,0.03)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${isEditing ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.055)'}`,
                              borderRadius: 13, overflow: 'hidden', transition: 'border-color 0.2s, background 0.2s',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'stretch' }}>
                              <div style={{ width: 3, flexShrink: 0, background: e.projectId?.color || '#555', boxShadow: `2px 0 8px ${e.projectId?.color || '#555'}44` }} />
                              <div style={{ flex: 1, padding: '12px 15px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: '0.63rem', fontWeight: 800, color: e.projectId?.color || '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                      {e.projectId?.name}
                                    </span>
                                    {e.hours != null && e.hours > 0 && (
                                      <span style={{
                                        fontSize: '0.62rem', fontWeight: 700,
                                        color: 'rgba(255,255,255,0.4)',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.09)',
                                        borderRadius: 5, padding: '1px 6px',
                                        display: 'flex', alignItems: 'center', gap: 3,
                                      }}>
                                        ⏱ {e.hours}h
                                      </span>
                                    )}
                                  </div>
                                  {(() => {
                                    const expanded = expandedEntries.has(e._id);
                                    const long = needsExpand(e.description);
                                    return (
                                      <>
                                        <div style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6, ...(!expanded && long ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' } : { whiteSpace: 'pre-wrap' }) }}>
                                          {renderRichText(e.description)}
                                        </div>
                                        {long && (
                                          <motion.button onClick={() => toggleExpand(e._id)} whileHover={{ color: '#93c5fd' }}
                                            style={{ background: 'none', border: 'none', padding: '2px 0', marginTop: 2, color: '#60a5fa', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                                          >{expanded ? 'show less' : 'read more'}</motion.button>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                                  <motion.button onClick={() => isEditing ? setEditEntryId(null) : openEditEntry(e)}
                                    whileHover={{ scale: 1.1, color: '#f59e0b' }} whileTap={{ scale: 0.9 }}
                                    style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${isEditing ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}`, background: isEditing ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', color: isEditing ? '#f59e0b' : 'rgba(255,255,255,0.3)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >✎</motion.button>
                                  <motion.button onClick={() => deleteEntry(e._id)}
                                    whileHover={{ scale: 1.1, color: '#f87171', borderColor: 'rgba(239,68,68,0.35)' }} whileTap={{ scale: 0.9 }}
                                    style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >✕</motion.button>
                                </div>
                              </div>
                            </div>
                            <AnimatePresence>
                              {isEditing && (
                                <motion.div key="edit-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} style={{ overflow: 'hidden' }}
                                >
                                  <div style={{ padding: '12px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ marginBottom: 10 }}>
                                      <ProjectSelect projects={activeProjects} value={editEntryProj} onChange={setEditEntryProj} />
                                    </div>
                                    <textarea rows={2} autoFocus className="field"
                                      style={{ resize: 'none', borderRadius: 10, fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 10 }}
                                      value={editEntryDesc}
                                      onChange={(ev) => setEditEntryDesc(ev.target.value)}
                                      onKeyDown={(ev) => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) saveEditEntry(); if (ev.key === 'Escape') setEditEntryId(null); }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, overflow: 'hidden' }}>
                                        <span style={{ padding: '4px 8px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', borderRight: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>⏱ hrs</span>
                                        <input
                                          type="number"
                                          min="0.25" max="24" step="0.25"
                                          placeholder="—"
                                          value={editEntryHours}
                                          onChange={(ev) => setEditEntryHours(ev.target.value)}
                                          style={{
                                            width: 52, background: 'transparent', border: 'none', outline: 'none',
                                            color: editEntryHours ? '#f1f5f9' : 'rgba(255,255,255,0.25)',
                                            fontSize: '0.78rem', fontWeight: 600, padding: '4px 8px',
                                            fontFamily: 'inherit', textAlign: 'center',
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                      <motion.button onClick={() => setEditEntryId(null)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                        style={{ padding: '5px 13px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', cursor: 'pointer' }}
                                      >Cancel</motion.button>
                                      <motion.button className="btn-accent" onClick={saveEditEntry} disabled={editEntrySaving || !editEntryDesc.trim()}
                                        whileHover={!editEntrySaving && editEntryDesc.trim() ? { scale: 1.04 } : {}} whileTap={{ scale: 0.96 }} style={{ padding: '5px 16px' }}
                                      >{editEntrySaving ? 'Saving…' : 'Save'}</motion.button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>{/* end LEFT col */}

          {/* ── RIGHT col ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tasks — bucketed against the day being viewed */}
          <Card delay={0.15}>
            <CardHead
              title="Tasks"
              right={
                <a href="/tasks" style={{ fontSize: '0.66rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
                  View all →
                </a>
              }
            />
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {overdueTasks.length === 0 && dueTodayTasks.length === 0 && upcomingTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.15)', fontSize: '0.8rem' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>✓</div>
                  Nothing on the schedule
                </div>
              ) : (
                <>
                  {overdueTasks.length > 0 && (
                    <TaskGroup label="Overdue" count={overdueTasks.length} color="#ef4444">
                      {overdueTasks.map((t) => renderTask(t))}
                    </TaskGroup>
                  )}
                  {dueTodayTasks.length > 0 ? (
                    <TaskGroup label={isToday ? 'Due today' : `Due ${shortDate(activeDate)}`} count={dueTodayTasks.length} color="#f59e0b">
                      {dueTodayTasks.map((t) => renderTask(t))}
                    </TaskGroup>
                  ) : overdueTasks.length > 0 ? null : (
                    <div style={{ textAlign: 'center', padding: '10px 0', color: 'rgba(255,255,255,0.18)', fontSize: '0.78rem' }}>
                      Nothing due {isToday ? 'today' : 'this day'}
                    </div>
                  )}
                  {upcomingTasks.length > 0 && (
                    <div>
                      <motion.button
                        onClick={() => setShowUpcoming((v) => !v)}
                        whileHover={{ color: 'rgba(255,255,255,0.5)' }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                          background: 'none', border: 'none', padding: '2px 0 8px', cursor: 'pointer',
                          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.28)',
                        }}
                      >
                        <span style={{ fontSize: '0.55rem', transition: 'transform 0.15s', transform: showUpcoming ? 'rotate(90deg)' : 'none' }}>▶</span>
                        Upcoming
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>{upcomingTasks.length}</span>
                      </motion.button>
                      <AnimatePresence initial={false}>
                        {showUpcoming && (
                          <motion.div
                            key="upcoming"
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {upcomingTasks.slice(0, 5).map((t) => renderTask(t))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* ── Time by project ── */}
          {projectBreakdown.length > 0 && (
            <Card delay={0.2}>
              <CardHead
                title={totalHours > 0 ? 'Time by project' : 'Entries by project'}
                right={totalHours > 0 ? (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(245,158,11,0.7)' }}>{fmtHours(totalHours)}h</span>
                ) : undefined}
              />
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {projectBreakdown.map((p) => {
                  const metric = totalHours > 0 ? p.hours : p.count;
                  return (
                    <div key={p.name}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.75rem', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                          {totalHours > 0
                            ? `${fmtHours(p.hours)}h`
                            : `${p.count} entr${p.count === 1 ? 'y' : 'ies'}`}
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${(metric / breakdownMax) * 100}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: 99, background: p.color, boxShadow: `0 0 8px ${p.color}66` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Quick Notes ── */}
          <Card delay={0.25}>
            <CardHead
              title="Quick Notes"
              right={quickNotes.length > 0 ? (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.28)' }}>
                  {quickNotes.filter((n) => n.done).length}/{quickNotes.length}
                </span>
              ) : undefined}
            />

            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Input row */}
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addQuickNote()}
                  placeholder="Add a quick note…"
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: '7px 10px', color: '#f1f5f9', fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
                <motion.button
                  onClick={addQuickNote}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  style={{
                    background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: 8, padding: '0 12px', color: '#f59e0b', fontSize: '1rem',
                    cursor: 'pointer', fontWeight: 700,
                  }}
                >+</motion.button>
              </div>

              {/* Notes list */}
              {quickNotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,0.13)', fontSize: '0.78rem' }}>
                  Nothing here yet
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {quickNotes.map((n) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 10 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}
                    >
                      <motion.button
                        onClick={() => toggleQuickNote(n.id)}
                        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                        style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                          background: n.done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)',
                          border: n.done ? '1.5px solid rgba(34,197,94,0.5)' : '1.5px solid rgba(255,255,255,0.18)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#22c55e', fontSize: '0.6rem', padding: 0,
                        }}
                      >{n.done ? '✓' : ''}</motion.button>
                      <span style={{
                        flex: 1, fontSize: '0.82rem', color: n.done ? 'rgba(255,255,255,0.25)' : '#cbd5e1',
                        textDecoration: n.done ? 'line-through' : 'none', wordBreak: 'break-word',
                      }}>{n.text}</span>
                      <motion.button
                        onClick={() => deleteQuickNote(n.id)}
                        whileHover={{ scale: 1.1, color: '#f87171' }} whileTap={{ scale: 0.9 }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', padding: '0 2px', flexShrink: 0 }}
                      >✕</motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </Card>{/* end Quick Notes */}

          </div>{/* end RIGHT col wrapper */}

        </div>{/* end grid */}
      </div>

      {/* ── Completion Modal ── */}
      <AnimatePresence>
        {completingTask && (
          <motion.div
            key="completion-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={() => { if (!completionSaving) setCompletingTask(null); }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
          >
            <motion.div
              key="completion-modal"
              variants={modalVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              onClick={(ev) => ev.stopPropagation()}
              style={{
                background: '#0d0f1c',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20, padding: 24, maxWidth: 440, width: '100%',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.05)',
              }}
            >
              <div style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 5,
              }}>
                Log Progress
              </div>
              <h3 style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 700, margin: '0 0 14px', lineHeight: 1.4 }}>
                {completingTask.title}
              </h3>

              {/* Project selector */}
              <div style={{ marginBottom: 14 }}>
                <ProjectSelect
                  projects={activeProjects}
                  value={completionProjId}
                  onChange={(id) => { setCompletionProjId(id); setCompletionError(''); }}
                />
              </div>

              <textarea
                rows={3} autoFocus
                className="field"
                style={{ resize: 'none', borderRadius: 10, fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 12 }}
                placeholder="What did you accomplish? (optional — skip to just mark done)"
                value={completionNote}
                onChange={(ev) => setCompletionNote(ev.target.value)}
                onKeyDown={(ev) => { if (ev.key === 'Escape' && !completionSaving) setCompletingTask(null); }}
              />

              {/* Hours */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
                  <span style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', borderRight: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>⏱ hrs spent</span>
                  <input
                    type="number"
                    min="0.25" max="24" step="0.25"
                    placeholder="—"
                    value={completionHours}
                    onChange={(ev) => setCompletionHours(ev.target.value)}
                    style={{
                      width: 60, background: 'transparent', border: 'none', outline: 'none',
                      color: completionHours ? '#f1f5f9' : 'rgba(255,255,255,0.25)',
                      fontSize: '0.82rem', fontWeight: 600, padding: '6px 10px',
                      fontFamily: 'inherit', textAlign: 'center',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>optional</span>
              </div>

              <AnimatePresence>
                {completionError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ color: '#f87171', fontSize: '0.78rem', marginBottom: 12 }}
                  >{completionError}</motion.p>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <motion.button
                  onClick={() => setCompletingTask(null)}
                  disabled={completionSaving}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    padding: '7px 14px', borderRadius: 9,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', cursor: 'pointer',
                  }}
                >Cancel</motion.button>
                <motion.button
                  onClick={() => submitCompletion(true)}
                  disabled={completionSaving || !completionNote.trim()}
                  whileHover={!completionNote.trim() ? {} : { scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    padding: '7px 16px', borderRadius: 9,
                    background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.22)',
                    color: '#93c5fd', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    opacity: !completionNote.trim() ? 0.35 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >Save entry</motion.button>
                <motion.button
                  onClick={() => submitCompletion(false)}
                  disabled={completionSaving}
                  whileHover={{ scale: 1.04, boxShadow: '0 0 16px rgba(34,197,94,0.2)' }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    padding: '7px 16px', borderRadius: 9,
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.22)',
                    color: '#4ade80', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >{completionSaving ? '…' : 'Mark done ✓'}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Task Detail Modal ── */}
      <AnimatePresence>
        {detailTask && (
          <motion.div
            key="detail-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={() => setDetailTask(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
          >
            <motion.div
              key="detail-modal"
              variants={modalVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              onClick={(ev) => ev.stopPropagation()}
              style={{
                background: '#0d0f1c',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20, padding: 24, maxWidth: 480, width: '100%',
                maxHeight: '80vh', overflow: 'auto',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(96,165,250,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{
                  fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
                  color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase',
                }}>Task Details</div>
                <motion.button
                  onClick={() => setDetailTask(null)}
                  whileHover={{ scale: 1.15, color: '#f87171' }}
                  whileTap={{ scale: 0.9 }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '1rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                >✕</motion.button>
              </div>
              <h3 style={{ color: '#f1f5f9', fontSize: '1.05rem', fontWeight: 700, margin: '4px 0 14px', lineHeight: 1.4 }}>
                {detailTask.title}
              </h3>

              {detailTask.description && (
                <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.85rem', margin: '0 0 16px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {detailTask.description}
                </p>
              )}

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
                {detailTask.projectId && (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, color: detailTask.projectId.color,
                    padding: '3px 9px', borderRadius: 99,
                    background: detailTask.projectId.color + '18',
                    border: `1px solid ${detailTask.projectId.color}30`,
                  }}>
                    {detailTask.projectId.name}
                  </span>
                )}
                <span style={{
                  fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: PRIORITY_COLOR[detailTask.priority],
                }}>
                  {detailTask.priority} priority
                </span>
                {detailTask.dueDate && (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                    background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', color: '#93c5fd',
                  }}>
                    Deadline: {formatDate(detailTask.dueDate)}
                  </span>
                )}
              </div>

              <div style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 10,
              }}>
                Progress Log
              </div>
              {taskEntLoading ? (
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>Loading…</div>
              ) : taskEntries.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>
                  No progress logged yet. Click the task or checkbox in Today to log your first entry.
                </div>
              ) : (
                <motion.div
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                  style={{ display: 'flex', flexDirection: 'column', gap: 7 }}
                >
                  {taskEntries.map((e) => (
                    <motion.div
                      key={e._id}
                      variants={itemVariants}
                      style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10, padding: '10px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>{formatDate(e.date)}</span>
                        {e.projectId && (
                          <span style={{
                            fontSize: '0.62rem', fontWeight: 700, color: e.projectId.color,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>{e.projectId.name}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{renderRichText(e.description)}</div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}

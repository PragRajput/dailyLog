'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into document.body so overlays (modals, dialogs) escape any
 * ancestor stacking context — otherwise a parent with position+z-index (e.g. the
 * app header/main) can trap a `position: fixed` modal behind it.
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

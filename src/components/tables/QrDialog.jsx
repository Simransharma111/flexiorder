import { useEffect, useRef } from 'react';

export default function QrDialog({ title, onClose, children, busy = false }) {
  const ref = useRef(null);
  const latest = useRef({ onClose, busy });
  useEffect(() => { latest.current = { onClose, busy }; }, [onClose, busy]);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    const back = event => {
      const open = [...document.querySelectorAll('dialog[open]')];
      if (open.at(-1) !== dialog) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!latest.current.busy) latest.current.onClose();
    };
    window.addEventListener('flexiorder:owner-menu-back', back);
    return () => {
      window.removeEventListener('flexiorder:owner-menu-back', back);
      dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return <dialog ref={ref} className="tqr-dialog" aria-label={title} onCancel={event => {
    event.preventDefault(); if (!busy) onClose();
  }}>
    <header><h2>{title}</h2><button type="button" aria-label={`Close ${title}`} disabled={busy} onClick={onClose}>Close</button></header>
    {children}
  </dialog>;
}

import { useEffect, useRef, type ReactNode } from 'react';

/** Right-side drawer: overlay fade, panel slides in, Esc closes, focus is trapped. */
export default function Drawer({ title, subtitle, onClose, children, footer }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    return () => prev?.focus?.();
  }, []);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>('input,select,textarea,button,a[href]')).filter((el) => !el.hasAttribute('disabled'));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  return (
    <div className="anim-fade fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} onKeyDown={onKeyDown} className="anim-drawer flex h-full w-full max-w-[560px] flex-col bg-canvas shadow-card">
        <div className="flex items-start gap-3 border-b border-hairline-soft px-6 py-4">
          <div className="flex-1">
            <h2 className="text-[18px] font-bold text-ink">{title}</h2>
            {subtitle && <p className="text-[12px] text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full px-2 text-[20px] leading-none text-muted hover:bg-surface-soft">
            ×
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-hairline-soft px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

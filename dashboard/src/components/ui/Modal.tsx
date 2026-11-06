import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  wide?: boolean;
}

/** Lightweight accessible modal: overlay, Esc closes, focus moves inside and Tab is trapped. */
export default function Modal({ title, onClose, children, primaryLabel, onPrimary, primaryDisabled, secondaryLabel = 'Cancelar', wide }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input,select,textarea,button');
    first?.focus();
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
    if (items.length === 0) return;
    const firstEl = items[0];
    const lastEl = items[items.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  };

  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={onKeyDown}
        className={`anim-pop flex max-h-[90vh] w-full flex-col rounded-[16px] bg-canvas shadow-card ${wide ? 'max-w-[720px]' : 'max-w-[520px]'}`}
      >
        <div className="flex items-center gap-3 border-b border-hairline-soft px-6 py-4">
          <h2 className="flex-1 text-[18px] font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full px-2 text-[20px] leading-none text-muted hover:bg-surface-soft">
            ×
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex justify-end gap-2.5 border-t border-hairline-soft px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-full border border-ink bg-canvas px-5 py-2.5 text-[14px] font-semibold text-ink">
            {secondaryLabel}
          </button>
          {primaryLabel && (
            <button
              type="button"
              onClick={onPrimary}
              disabled={primaryDisabled}
              className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {primaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const fieldCls = 'w-full rounded-[10px] border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink';
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink">
      {label}
      {children}
      {hint && <span className="text-[12px] font-normal text-muted">{hint}</span>}
    </label>
  );
}

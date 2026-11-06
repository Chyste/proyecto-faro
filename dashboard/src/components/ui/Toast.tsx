export default function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
      {message && <div className="rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-white shadow-card">{message}</div>}
    </div>
  );
}

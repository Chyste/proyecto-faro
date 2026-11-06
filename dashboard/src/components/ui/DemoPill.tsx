export default function DemoPill({ agregados }: { agregados?: boolean }) {
  return (
    <span className="shrink-0 rounded-full border border-hairline bg-surface-soft px-3 py-[5px] text-[12px] font-medium text-body whitespace-nowrap">
      {agregados ? 'Datos agregados de demostración' : 'Datos de demostración (sintéticos)'}
    </span>
  );
}

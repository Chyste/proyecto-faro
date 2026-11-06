// Inline SVG icons for the five risk dimensions (no icon dependency).
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function DimIcon({ code, size = 20 }: { code: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true } as const;
  switch (code) {
    case 'aislamiento': // two people
      return <svg {...common} {...P}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-3 2.7-5 5.5-5s5 2 5.5 5" /><circle cx="17" cy="9" r="2.3" /><path d="M16.5 14.2c2.3.2 3.7 1.9 4 4.3" /></svg>;
    case 'funcional': // walking figure
      return <svg {...common} {...P}><circle cx="13" cy="5" r="2" /><path d="M12 8.5 9.5 13l3 2 1 5M12 8.5l3 3 3 .5M9.5 13 7 16" /></svg>;
    case 'medicacion': // pill
      return <svg {...common} {...P}><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)" /><path d="m9.2 9.2 5.6 5.6" /></svg>;
    case 'emocional_cognitiva': // heart
      return <svg {...common} {...P}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>;
    default: // shield
      return <svg {...common} {...P}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.500 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
  }
}

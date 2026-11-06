import { Link } from 'react-router-dom';
import { OctagonAlert } from 'lucide-react';

export default function UrgentBanner({ cita }: { cita: string }) {
  return (
    <div role="alert" className="ev-urgent">
      <OctagonAlert className="size-6 shrink-0" aria-hidden />
      <div className="ev-urgent-text">
        <p className="ev-urgent-title">Situación de riesgo · Activación simulada del protocolo</p>
        <p className="ev-urgent-quote">«{cita}»</p>
      </div>
      <Link to="/alertas" className="ev-urgent-link">Revisar ahora</Link>
    </div>
  );
}

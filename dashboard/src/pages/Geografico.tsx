import { useMemo } from 'react';
import Header from '../components/layout/Header';
import DemoPill from '../components/ui/DemoPill';
import { getDatosComunales } from '../data/syntheticData';
import { MapPin, Users, AlertTriangle, CheckCircle } from 'lucide-react';

export default function GeograficoPage() {
  const comunales = useMemo(() => getDatosComunales(), []);

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      <Header
        title="Distribución Geográfica y Territorial"
        subtitle="Cobertura comarcal y alertas por comuna"
      />
      <div className="p-6 space-y-6">
        <DemoPill agregados />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {comunales.map((c) => (
            <div key={c.comuna} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary-600" />
                    {c.comuna}
                  </h3>
                  <p className="text-xs text-gray-500">{c.region}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700">
                  {c.porcentajeControles}% efectividad
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center text-gray-400 mb-1">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-base font-bold text-gray-900">{c.totalPersonas}</p>
                  <p className="text-[10px] text-gray-500">Inscritos</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center text-red-500 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-base font-bold text-red-600">{c.alertas}</p>
                  <p className="text-[10px] text-gray-500">Alertas</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center text-emerald-500 mb-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-base font-bold text-emerald-600">{c.controlesRealizados}</p>
                  <p className="text-[10px] text-gray-500">Llamadas</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <p className="text-[11px] font-medium text-gray-500">Distribución de Casos:</p>
                <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 gap-0.5">
                  <div style={{ width: `${(c.distribucionNiveles.estable / c.totalPersonas) * 100}%` }} className="bg-emerald-500" title="Estable" />
                  <div style={{ width: `${(c.distribucionNiveles.preventivo / c.totalPersonas) * 100}%` }} className="bg-amber-500" title="Preventivo" />
                  <div style={{ width: `${(c.distribucionNiveles.prioritario / c.totalPersonas) * 100}%` }} className="bg-orange-500" title="Prioritario" />
                  <div style={{ width: `${(c.distribucionNiveles.urgente / c.totalPersonas) * 100}%` }} className="bg-red-500" title="Urgente" />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Estable: {c.distribucionNiveles.estable}</span>
                  <span>Urgente: {c.distribucionNiveles.urgente}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


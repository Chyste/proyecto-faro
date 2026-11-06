import { useMemo } from 'react';
import Header from '../components/layout/Header';
import { getDatosDominio } from '../data/syntheticData';
import { Activity } from 'lucide-react';

export default function BienestarPage() {
  const dominios = useMemo(() => getDatosDominio(), []);

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      <Header
        title="Análisis de Bienestar por Dimensiones"
        subtitle="Evaluación de los 6 dominios de riesgo sociosanitario"
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {dominios.map((d) => (
            <div key={d.dominio} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-primary-50 text-primary-600">
                  <Activity className="w-5 h-5" />
                </span>
                <span className="text-xl font-bold text-gray-900">{d.total} casos</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{d.label}</h3>
                <p className="text-xs text-gray-500">Métricas acumuladas del período</p>
              </div>

              <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-red-600 font-medium">Severidad Alta</span>
                  <span className="font-bold">{d.alta}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-600 font-medium">Severidad Media</span>
                  <span className="font-bold">{d.media}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-600 font-medium">Severidad Baja</span>
                  <span className="font-bold">{d.baja}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


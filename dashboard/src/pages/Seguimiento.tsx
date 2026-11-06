import Header from '../components/layout/Header';
import { ClipboardList, Clock, CheckCircle2 } from 'lucide-react';

export default function SeguimientoPage() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      <Header
        title="Gestión de Seguimiento"
        subtitle="Monitoreo de tareas territoriales y equipos comunitarios"
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">4</p>
                <p className="text-xs text-gray-500">Acciones pendientes</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">2</p>
                <p className="text-xs text-gray-500">En revisión territorial</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">18</p>
                <p className="text-xs text-gray-500">Derivaciones resueltas este mes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-2">Protocolo de Derivación Activa</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Las alertas de nivel <strong>Urgente</strong> generan automáticamente derivación a los monitores comunitarios
            y CESFAM de la comuna correspondiente en un plazo objetivo menor a 2 horas. Las alertas <strong>Prioritarias</strong>
            se gestionan en la ronda de seguimiento telefónico de las 24 horas siguientes.
          </p>
        </div>
      </div>
    </div>
  );
}


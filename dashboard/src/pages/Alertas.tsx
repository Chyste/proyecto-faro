import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck } from 'lucide-react';
import Header from '../components/layout/Header';
import { NivelBadge } from '../components/ui/StatusBadge';
import { getAlertas } from '../data/syntheticData';
import type { NivelSeguimiento } from '../data/types';

export default function AlertasPage() {
  const navigate = useNavigate();
  const alertas = useMemo(() => getAlertas(), []);
  const [filterNivel, setFilterNivel] = useState<NivelSeguimiento | 'todos'>('todos');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return alertas.filter((a) => {
      const matchNivel = filterNivel === 'todos' || a.nivel === filterNivel;
      const matchSearch =
        search === '' ||
        `${a.nombre} ${a.apellido} ${a.comuna} ${a.senalDetectada}`
          .toLowerCase()
          .includes(search.toLowerCase());
      return matchNivel && matchSearch;
    });
  }, [alertas, filterNivel, search]);

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      <Header
        title="Centro de Alertas"
        subtitle="Monitoreo de señales críticas y preventivas"
        searchValue={search}
        onSearchChange={setSearch}
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {(['todos', 'urgente', 'prioritario', 'preventivo', 'estable'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterNivel(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filterNivel === lvl
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">Persona</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">Nivel</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">Señal Detectada</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">Comuna</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">Acción Sugerida</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filtered.map((alerta) => (
                <tr key={alerta.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {alerta.nombre} {alerta.apellido}
                  </td>
                  <td className="px-5 py-3">
                    <NivelBadge nivel={alerta.nivel} />
                  </td>
                  <td className="px-5 py-3 text-gray-700 max-w-xs">{alerta.senalDetectada}</td>
                  <td className="px-5 py-3 text-gray-600">{alerta.comuna}</td>
                  <td className="px-5 py-3 text-xs text-gray-500 max-w-sm">{alerta.accionSugerida}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => navigate(`/personas/${alerta.personaId}`)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

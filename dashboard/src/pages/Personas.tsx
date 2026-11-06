import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { NivelBadge } from '../components/ui/StatusBadge';
import { getPersonas } from '../data/syntheticData';
import { User, Phone, MapPin, ChevronRight } from 'lucide-react';

export default function PersonasPage() {
  const navigate = useNavigate();
  const personas = useMemo(() => getPersonas(), []);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return personas.filter((p) =>
      `${p.nombre} ${p.apellido} ${p.comuna} ${p.profesionalAsignado}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [personas, search]);

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      <Header
        title="Directorio de Personas"
        subtitle="Registro de adultos mayores incorporados al programa"
        searchValue={search}
        onSearchChange={setSearch}
      />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((persona) => (
            <div
              key={persona.id}
              onClick={() => navigate(`/personas/${persona.id}`)}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                      {persona.nombre[0]}
                      {persona.apellido[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {persona.nombre} {persona.apellido}
                      </h3>
                      <p className="text-xs text-gray-500">{persona.edad} años</p>
                    </div>
                  </div>
                  <NivelBadge nivel={persona.nivel} />
                </div>

                <div className="mt-4 space-y-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{persona.comuna}, {persona.region}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{persona.telefono}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>Asignado: {persona.profesionalAsignado}</span>
                  </div>
                </div>

                {persona.senales.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[11px] font-medium text-gray-500 uppercase">Señales activas ({persona.senales.length})</p>
                    <p className="text-xs text-gray-700 truncate mt-1">
                      {persona.senales[0].descripcion}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-primary-600 font-medium">
                <span>Ver ficha completa</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


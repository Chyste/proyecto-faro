import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, AlertCircle, Calendar, Shield, Activity } from 'lucide-react';
import { getPersonas } from '../data/syntheticData';
import { NivelBadge } from '../components/ui/StatusBadge';

export default function PersonaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const personas = useMemo(() => getPersonas(), []);

  const persona = personas.find((p) => p.id === id) || personas[0];

  if (!persona) {
    return (
      <div className="p-8">
        <p>Persona no encontrada.</p>
        <button onClick={() => navigate('/personas')} className="mt-4 text-primary-600">
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-xl font-bold">
              {persona.nombre[0]}
              {persona.apellido[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">
                  {persona.nombre} {persona.apellido}
                </h1>
                <NivelBadge nivel={persona.nivel} />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {persona.edad} años · Comuna de {persona.comuna} · Último control: {persona.fechaUltimoControl}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <p className="text-gray-400">Profesional a cargo</p>
              <p className="font-semibold text-gray-800">{persona.profesionalAsignado}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Info Personal */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ficha de Contacto</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{persona.telefono}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{persona.direccion || `${persona.comuna}, ${persona.region}`}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-xs">Emergencia: {persona.contactoEmergencia}</span>
              </div>
            </div>

            {persona.medicamentos && persona.medicamentos.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700">Tratamiento farmacológico:</p>
                <div className="mt-1 space-y-1">
                  {persona.medicamentos.map((m, i) => (
                    <div key={i} className="text-xs bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md flex justify-between">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-[10px] text-blue-600">{m.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {persona.intereses && persona.intereses.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700">Intereses declarados:</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {persona.intereses.map((tag, i) => (
                    <span key={i} className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full capitalize">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500">Autonomía y Red:</p>
              <p className="text-xs text-gray-600 mt-1">{persona.observaciones}</p>
            </div>
          </div>

          {/* Card Señales Detectadas */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3 md:col-span-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              Señales y Hallazgos Registrados ({persona.senales.length})
            </h3>
            {persona.senales.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No se registran señales activas de riesgo.</p>
            ) : (
              <div className="space-y-2">
                {persona.senales.map((s, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-gray-50 border border-gray-100 flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                        {s.dominio.replace('_', ' ')}
                      </span>
                      <p className="text-sm font-medium text-gray-800 mt-1">{s.descripcion}</p>
                    </div>
                    <span className="text-xs text-gray-400">{s.fecha}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Historial de Controles y Acciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-500" />
              Historial de Controles Telefónicos ({persona.historialControles.length})
            </h3>
            <div className="space-y-3">
              {[...persona.historialControles].reverse().map((c) => (
                <div key={c.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800">{c.fecha} · {c.duracion} min</span>
                    <NivelBadge nivel={c.nivelResultante} />
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{c.resumen}</p>
                  <div className="mt-2 space-y-1">
                    {c.respuestas.map((r, i) => (
                      <div key={i} className="text-[11px] bg-gray-50 p-2 rounded">
                        <p className="text-gray-500">{r.pregunta}</p>
                        <p className="font-medium text-gray-800 italic">"{r.respuesta}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Acciones de Intervención y Red Territorial
            </h3>
            {persona.historialAcciones.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No hay derivaciones pendientes registradas.</p>
            ) : (
              <div className="space-y-3">
                {persona.historialAcciones.map((a) => (
                  <div key={a.id} className="border border-gray-100 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-900">{a.tipo}</span>
                      <span className="text-[10px] uppercase font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                        {a.estado}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{a.descripcion}</p>
                    <p className="text-[10px] text-gray-400">Responsable: {a.profesional} · {a.fecha}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


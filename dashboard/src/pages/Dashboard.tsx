import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Phone,
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle,
  UserCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

import type { NivelSeguimiento } from '../data/types';
import {
  getPersonas,
  getAlertas,
  getEvolucionMensual,
  getDatosDominio,
} from '../data/syntheticData';

import Header from '../components/layout/Header';
import StatCard from '../components/ui/StatCard';
import FilterBar from '../components/ui/FilterBar';
import { NivelBadge } from '../components/ui/StatusBadge';

// ─── Chart color constants ────────────────────────────────────────
const NIVEL_COLORS: Record<NivelSeguimiento, string> = {
  estable: '#10b981',
  preventivo: '#f59e0b',
  prioritario: '#f97316',
  urgente: '#ef4444',
};

const NIVEL_LABELS: Record<NivelSeguimiento, string> = {
  estable: 'Estable',
  preventivo: 'Preventivo',
  prioritario: 'Prioritario',
  urgente: 'Urgente',
};

// ─── Custom tooltip components ────────────────────────────────────
function ChartTooltipWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      {children}
    </div>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  // Raw data
  const allPersonas = useMemo(() => getPersonas(), []);
  const allAlertas = useMemo(() => getAlertas(), []);
  const evolucionMensual = useMemo(() => getEvolucionMensual(), []);
  const datosDominio = useMemo(() => getDatosDominio(), []);

  // Filter state
  const [searchValue, setSearchValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [regionFilter, setRegionFilter] = useState('');
  const [comunaFilter, setComunaFilter] = useState('');
  const [nivelFilter, setNivelFilter] = useState<NivelSeguimiento | ''>('');
  const [periodoFilter, setPeriodoFilter] = useState('');

  // Derived: unique regions & comunas from the data
  const regiones = useMemo(() => {
    const set = new Set(allPersonas.map((p) => p.region));
    return Array.from(set).sort();
  }, [allPersonas]);

  const comunas = useMemo(() => {
    let source = allPersonas;
    if (regionFilter) {
      source = source.filter((p) => p.region === regionFilter);
    }
    const set = new Set(source.map((p) => p.comuna));
    return Array.from(set).sort();
  }, [allPersonas, regionFilter]);

  // Period helper
  const periodCutoff = useMemo(() => {
    if (!periodoFilter) return null;
    const now = new Date();
    switch (periodoFilter) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '6m':
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }, [periodoFilter]);

  // ─── Filtered personas ──────────────────────────────────────────
  const filteredPersonas = useMemo(() => {
    let result = allPersonas;

    if (regionFilter) {
      result = result.filter((p) => p.region === regionFilter);
    }
    if (comunaFilter) {
      result = result.filter((p) => p.comuna === comunaFilter);
    }
    if (nivelFilter) {
      result = result.filter((p) => p.nivel === nivelFilter);
    }
    if (periodCutoff) {
      result = result.filter(
        (p) => new Date(p.fechaUltimoControl) >= periodCutoff
      );
    }
    if (searchValue.trim()) {
      const q = searchValue.toLowerCase();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.apellido.toLowerCase().includes(q) ||
          p.comuna.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allPersonas, regionFilter, comunaFilter, nivelFilter, periodCutoff, searchValue]);

  // ─── Filtered alertas ───────────────────────────────────────────
  const filteredAlertas = useMemo(() => {
    const personaIds = new Set(filteredPersonas.map((p) => p.id));
    return allAlertas.filter((a) => personaIds.has(a.personaId));
  }, [allAlertas, filteredPersonas]);

  // ─── Stat computations ─────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredPersonas.length;

    // "Con controles al día" = personas whose last control was within 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const controlesAlDia = filteredPersonas.filter(
      (p) => new Date(p.fechaUltimoControl) >= thirtyDaysAgo
    ).length;

    // Controles realizados este mes
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const controlesEsteMes = filteredPersonas.reduce((acc, p) => {
      return (
        acc +
        p.historialControles.filter((c) => {
          const d = new Date(c.fecha);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length
      );
    }, 0);

    // Pendientes de seguimiento
    const pendientesSeguimiento = filteredPersonas.filter(
      (p) => p.estadoRevision === 'pendiente' || p.estadoRevision === 'en_revision'
    ).length;

    // Alertas by level
    const alertasPreventivas = filteredAlertas.filter(
      (a) => a.nivel === 'preventivo'
    ).length;
    const alertasPrioritarias = filteredAlertas.filter(
      (a) => a.nivel === 'prioritario'
    ).length;
    const casosUrgentesPendientes = filteredAlertas.filter(
      (a) => a.nivel === 'urgente' && a.estadoRevision === 'pendiente'
    ).length;

    return {
      total,
      controlesAlDia,
      controlesEsteMes,
      pendientesSeguimiento,
      alertasPreventivas,
      alertasPrioritarias,
      casosUrgentesPendientes,
    };
  }, [filteredPersonas, filteredAlertas]);

  // ─── Donut chart: distribución por nivel ────────────────────────
  const nivelDistribution = useMemo(() => {
    const counts: Record<NivelSeguimiento, number> = {
      estable: 0,
      preventivo: 0,
      prioritario: 0,
      urgente: 0,
    };
    filteredPersonas.forEach((p) => {
      counts[p.nivel]++;
    });
    return (Object.keys(counts) as NivelSeguimiento[]).map((nivel) => ({
      name: NIVEL_LABELS[nivel],
      value: counts[nivel],
      color: NIVEL_COLORS[nivel],
    }));
  }, [filteredPersonas]);

  // ─── Area chart: evolución mensual de controles ─────────────────
  const evolucionControles = useMemo(() => {
    return evolucionMensual.map((d) => ({
      mes: d.mes,
      controles: d.controles,
      nuevos: d.nuevosRegistros,
    }));
  }, [evolucionMensual]);

  // ─── Line chart: evolución de alertas ───────────────────────────
  const evolucionAlertas = useMemo(() => {
    return evolucionMensual.map((d) => ({
      mes: d.mes,
      alertas: d.alertas,
      // Simulate a breakdown — roughly 60% preventivas, 40% urgentes
      preventivas: Math.round(d.alertas * 0.6),
      urgentes: Math.round(d.alertas * 0.4),
    }));
  }, [evolucionMensual]);

  // ─── Horizontal bar chart: señales por dominio ──────────────────
  const senalesPorDominio = useMemo(() => {
    return datosDominio.map((d) => ({
      dominio: d.label,
      total: d.total,
      alta: d.alta,
      media: d.media,
      baja: d.baja,
    }));
  }, [datosDominio]);

  // ─── Recent alerts (top 5 urgent/priority) ──────────────────────
  const recentAlerts = useMemo(() => {
    return filteredAlertas
      .filter((a) => a.nivel === 'urgente' || a.nivel === 'prioritario')
      .sort(
        (a, b) =>
          new Date(b.fechaUltimoControl).getTime() -
          new Date(a.fechaUltimoControl).getTime()
      )
      .slice(0, 5);
  }, [filteredAlertas]);

  // ─── Filter handlers ───────────────────────────────────────────
  const handleRegionChange = (v: string) => {
    setRegionFilter(v);
    setComunaFilter(''); // Reset comuna when region changes
  };

  const handleClearFilters = () => {
    setRegionFilter('');
    setComunaFilter('');
    setNivelFilter('');
    setPeriodoFilter('');
    setSearchValue('');
  };

  // ─── Format helpers ─────────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Custom tooltips
  const renderDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <ChartTooltipWrapper>
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-gray-600">
            {data.value} personas ({((data.value / Math.max(stats.total, 1)) * 100).toFixed(1)}%)
          </p>
        </ChartTooltipWrapper>
      );
    }
    return null;
  };

  const renderAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <ChartTooltipWrapper>
          <p className="font-medium text-gray-900 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </ChartTooltipWrapper>
      );
    }
    return null;
  };

  const renderBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <ChartTooltipWrapper>
          <p className="font-medium text-gray-900 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color || entry.fill }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </ChartTooltipWrapper>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <Header
        title="Dashboard General"
        subtitle="Vista general del sistema de seguimiento"
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {/* Filter Bar */}
      <FilterBar
        show={showFilters}
        regionFilter={regionFilter}
        comunaFilter={comunaFilter}
        nivelFilter={nivelFilter}
        periodoFilter={periodoFilter}
        regiones={regiones}
        comunas={comunas}
        onRegionChange={handleRegionChange}
        onComunaChange={setComunaFilter}
        onNivelChange={setNivelFilter}
        onPeriodoChange={setPeriodoFilter}
        onClear={handleClearFilters}
      />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
        {/* ─── Stat Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total personas registradas"
            value={stats.total.toLocaleString('es-CL')}
            icon={<Users className="w-5 h-5" />}
            color="blue"
            trend={{ value: 12.5, label: 'vs. mes anterior' }}
            subtitle="En el sistema"
          />
          <StatCard
            title="Con controles al día"
            value={stats.controlesAlDia.toLocaleString('es-CL')}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
            trend={{ value: 8.3, label: 'vs. mes anterior' }}
            subtitle={`${stats.total > 0 ? ((stats.controlesAlDia / stats.total) * 100).toFixed(0) : 0}% del total`}
          />
          <StatCard
            title="Controles realizados este mes"
            value={stats.controlesEsteMes.toLocaleString('es-CL')}
            icon={<Phone className="w-5 h-5" />}
            color="blue"
            trend={{ value: 15.2, label: 'vs. mes anterior' }}
            subtitle="Telefónicos y presenciales"
          />
          <StatCard
            title="Pendientes de seguimiento"
            value={stats.pendientesSeguimiento.toLocaleString('es-CL')}
            icon={<Clock className="w-5 h-5" />}
            color="yellow"
            trend={{ value: -5.1, label: 'vs. mes anterior' }}
            subtitle="Requieren atención"
          />
          <StatCard
            title="Alertas preventivas"
            value={stats.alertasPreventivas.toLocaleString('es-CL')}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="orange"
            trend={{ value: 3.7, label: 'vs. mes anterior' }}
            subtitle="Nivel preventivo"
          />
          <StatCard
            title="Alertas prioritarias"
            value={stats.alertasPrioritarias.toLocaleString('es-CL')}
            icon={<ShieldAlert className="w-5 h-5" />}
            color="red"
            trend={{ value: -2.4, label: 'vs. mes anterior' }}
            subtitle="Nivel prioritario"
          />
          <StatCard
            title="Casos urgentes pendientes"
            value={
              <span className="flex items-center gap-2">
                {stats.casosUrgentesPendientes}
                {stats.casosUrgentesPendientes > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
              </span>
            }
            icon={<ShieldAlert className="w-5 h-5" />}
            color="red"
            trend={{ value: -8.0, label: 'vs. mes anterior' }}
            subtitle="Acción inmediata requerida"
          />
        </div>

        {/* ─── Charts 2×2 Grid ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut: Distribución por Nivel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Distribución por Nivel de Seguimiento
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={nivelDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {nivelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={renderDonutTooltip} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-gray-600">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Summary row under donut */}
            <div className="flex justify-center gap-4 mt-2">
              {nivelDistribution.map((item) => (
                <div key={item.name} className="text-center">
                  <p className="text-lg font-bold text-gray-900">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Area Chart: Evolución Mensual de Controles */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Evolución Mensual de Controles
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucionControles}>
                  <defs>
                    <linearGradient id="gradControles" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradNuevos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={renderAreaTooltip} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-gray-600">{value}</span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="controles"
                    name="Controles"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#gradControles)"
                  />
                  <Area
                    type="monotone"
                    dataKey="nuevos"
                    name="Nuevos registros"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gradNuevos)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line Chart: Evolución de Alertas */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Evolución de Alertas
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucionAlertas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={renderAreaTooltip} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-gray-600">{value}</span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="preventivas"
                    name="Alertas preventivas"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="urgentes"
                    name="Alertas urgentes"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Horizontal Bar Chart: Señales por Dominio */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Señales por Dominio
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={senalesPorDominio} layout="vertical" barCategoryGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="dominio"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    width={130}
                  />
                  <Tooltip content={renderBarTooltip} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-gray-600">{value}</span>
                    )}
                  />
                  <Bar dataKey="alta" name="Alta" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="media" name="Media" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar
                    dataKey="baja"
                    name="Baja"
                    stackId="a"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ─── Recent Alerts Table ────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Alertas Recientes
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Últimas alertas urgentes y prioritarias del sistema
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-full ring-1 ring-inset ring-red-600/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                {recentAlerts.length} alerta{recentAlerts.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Nombre
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Edad
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Comuna
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Señal
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Nivel
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Fecha
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentAlerts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-sm text-gray-400"
                    >
                      No hay alertas urgentes o prioritarias con los filtros aplicados
                    </td>
                  </tr>
                ) : (
                  recentAlerts.map((alerta) => (
                    <tr
                      key={alerta.id}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-gray-600">
                              {alerta.nombre[0]}
                              {alerta.apellido[0]}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {alerta.nombre} {alerta.apellido}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {alerta.edad} años
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {alerta.comuna}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-gray-700 max-w-[200px] truncate block">
                          {alerta.senalDetectada}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <NivelBadge nivel={alerta.nivel} />
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(alerta.fechaUltimoControl)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() =>
                            navigate(`/personas/${alerta.personaId}`)
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors ring-1 ring-inset ring-primary-200"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

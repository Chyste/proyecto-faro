import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FaroProvider } from './state/FaroStore';
import { ActionsProvider } from './components/actions/ActionModals';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import GeograficoPage from './pages/Geografico';
import BienestarPage from './pages/Bienestar';
import AlertasPage from './pages/Alertas';
import PersonasPage from './pages/Personas';
import PersonaDetallePage from './pages/PersonaDetalle';
import SeguimientoPage from './pages/Seguimiento';

export default function App() {
  return (
    <FaroProvider>
    <ActionsProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="geografico" element={<GeograficoPage />} />
          <Route path="bienestar" element={<BienestarPage />} />
          <Route path="alertas" element={<AlertasPage />} />
          <Route path="alertas/:id" element={<AlertasPage />} />
          <Route path="personas" element={<PersonasPage />} />
          <Route path="personas/:id" element={<PersonaDetallePage />} />
          <Route path="seguimiento" element={<SeguimientoPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ActionsProvider>
    </FaroProvider>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar           from './components/layout/Navbar';
import Inicio           from './pages/inicio/Inicio';
import Login            from './pages/login/Login';
import Registro         from './pages/registro/Registro';
import Verificar        from './pages/verificar/Verificar';
import RecuperarPassword from './pages/recuperar/RecuperarPassword';
import NuevaPassword    from './pages/recuperar/NuevaPassword';
import Dashboard        from './pages/dashboard/Dashboard';
import Agendarcita      from './pages/agendar/Agendarcita';
import MisCitas         from './pages/miscitas/MisCitas';
import DashboardMedico  from './pages/dashboard-medico/DashboardMedico';
import MedicosAdmin     from './pages/admin/MedicosAdmin';

function RutaProtegida({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

function RutaMedico({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== 'medico') return <Navigate to="/dashboard" replace />;
  return children;
}

function RutaAdmin({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Públicas */}
        <Route path="/"                element={<Inicio />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/registro"        element={<Registro />} />
        <Route path="/verificar"       element={<Verificar />} />
        <Route path="/recuperar"       element={<RecuperarPassword />} />
        <Route path="/nueva-password"  element={<NuevaPassword />} />

        {/* Paciente */}
        <Route path="/dashboard"  element={<RutaProtegida><Dashboard /></RutaProtegida>} />
        <Route path="/agendar"    element={<RutaProtegida><Agendarcita /></RutaProtegida>} />
        <Route path="/mis-citas"  element={<RutaProtegida><MisCitas /></RutaProtegida>} />

        {/* Médico */}
        <Route path="/dashboard-medico" element={<RutaMedico><DashboardMedico /></RutaMedico>} />

        {/* Admin */}
        <Route path="/admin/medicos" element={<RutaAdmin><MedicosAdmin /></RutaAdmin>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
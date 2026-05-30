import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/layout/Navbar";
import Inicio from "./pages/inicio/Inicio";
import Login from "./pages/login/Login";
import Registro from "./pages/registro/Registro";
import Verificar from "./pages/verificar/Verificar";
import RecuperarPassword from "./pages/recuperar/RecuperarPassword";
import NuevaPassword from "./pages/recuperar/NuevaPassword";
import Dashboard from "./pages/dashboard/Dashboard";
import Agendarcita from "./pages/agendar/Agendarcita";
import MisCitas from "./pages/miscitas/MisCitas";
import DashboardMedico from "./pages/dashboard-medico/DashboardMedico";
import ActivarCuenta from "./pages/activar-cuenta/ActivarCuenta";
import Catalogo from "./pages/catalogo/Catalogo";
// ─── Imports Admin (nueva estructura de carpetas) ────────────────────────────
import AdminLayout          from "./pages/admin/AdminLayout";
import AdminDashboard       from "./pages/admin/dashboard/AdminDashboard";
import MedicosAdmin         from "./pages/admin/gestionmedicos/MedicosAdmin"; 
import HorariosAdmin        from "./pages/admin/gestionhorarios/HorariosAdmin";
import UsuariosAdmin        from "./pages/admin/gestionusuarios/UsuariosAdmin";
import CitasAdmin           from "./pages/admin/gestioncitas/CitasAdmin";
import EspecialidadesAdmin  from "./pages/admin/gestionespecialidades/EspecialidadesAdmin";
import MedicamentosAdmin    from "./pages/admin/gestionmedicamentos/MedicamentosAdmin";




function RutaProtegida({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

function RutaMedico({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== "medico") return <Navigate to="/dashboard" replace />;
  return children;
}

function RutaAdmin({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* ── Públicas ────────────────────────────────── */}
        <Route path="/" element={<Inicio />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/verificar" element={<Verificar />} />
        <Route path="/recuperar" element={<RecuperarPassword />} />
        <Route path="/nueva-password" element={<NuevaPassword />} />
        <Route path="/activar-cuenta" element={<ActivarCuenta />} />
        <Route path="/catalogo" element={<Catalogo />} />
        {/* ── Paciente ────────────────────────────────── */}
        <Route
          path="/dashboard"
          element={
            <RutaProtegida>
              <Dashboard />
            </RutaProtegida>
          }
        />
        <Route
          path="/agendar"
          element={
            <RutaProtegida>
              <Agendarcita />
            </RutaProtegida>
          }
        />
        <Route
          path="/mis-citas"
          element={
            <RutaProtegida>
              <MisCitas />
            </RutaProtegida>
          }
        />
        {/* ── Médico ──────────────────────────────────── */}
        <Route
          path="/dashboard-medico"
          element={
            <RutaMedico>
              <DashboardMedico />
            </RutaMedico>
          }
        />
        // Reemplaza las rutas admin por:
        {/* ── Admin — layout con sidebar ─────────── */}
        <Route
          path="/admin"
          element={
            <RutaAdmin>
              <AdminLayout />
            </RutaAdmin>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="medicos" element={<MedicosAdmin />} />
          <Route path="horarios" element={<HorariosAdmin />} />
          <Route path="usuarios" element={<UsuariosAdmin />} />
          <Route path="citas" element={<CitasAdmin />} />
          <Route path="especialidades" element={<EspecialidadesAdmin />} />
          <Route path="medicamentos" element={<MedicamentosAdmin />} />
        </Route>
        {/* ── Catch-all: siempre al final ─────────────── */}
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

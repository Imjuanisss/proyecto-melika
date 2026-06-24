// client/src/App.jsx

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

// Especialidades (públicas)
import Especialidades from "./pages/especialidades/Especialidades";
import MedicosEspecialidad from "./pages/especialidades/MedicosEspecialidad";

// Admin
import AdminLayout         from "./pages/admin/AdminLayout";
import AdminDashboard      from "./pages/admin/dashboard/AdminDashboard";
import MedicosAdmin        from "./pages/admin/gestionmedicos/MedicosAdmin";
import HorariosAdmin       from "./pages/admin/gestionhorarios/HorariosAdmin";
import UsuariosAdmin       from "./pages/admin/gestionusuarios/UsuariosAdmin";
import CitasAdmin          from "./pages/admin/gestioncitas/CitasAdmin";
import EspecialidadesAdmin from "./pages/admin/gestionespecialidades/EspecialidadesAdmin";
import MedicamentosAdmin   from "./pages/admin/gestionmedicamentos/MedicamentosAdmin";

// ─── Guards de rutas ──────────────────────────────────────────────────────────

// Exclusivo para pacientes — el médico NO puede entrar aquí
function RutaPaciente({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol === "medico")  return <Navigate to="/dashboard-medico" replace />;
  if (usuario.rol === "admin")   return <Navigate to="/admin" replace />;
  return children;
}

// Exclusivo para médicos
function RutaMedico({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== "medico") return <Navigate to="/dashboard" replace />;
  return children;
}

// Exclusivo para administradores
function RutaAdmin({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

// ─── Componente principal ─────────────────────────────────────────────────────

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>

          {/* ── Rutas públicas ── */}
          <Route path="/"              element={<Inicio />} />
          <Route path="/login"         element={<Login />} />
          <Route path="/registro"      element={<Registro />} />
          <Route path="/verificar"     element={<Verificar />} />
          <Route path="/recuperar"     element={<RecuperarPassword />} />
          <Route path="/nueva-password" element={<NuevaPassword />} />
          <Route path="/catalogo"      element={<Catalogo />} />
          <Route path="/activar-cuenta" element={<ActivarCuenta />} />

          {/* ── Catálogo de especialidades y médicos (público) ── */}
          <Route path="/especialidades"              element={<Especialidades />} />
          <Route path="/especialidades/:id/medicos"  element={<MedicosEspecialidad />} />

          {/*
            Agendar desde el perfil público de un médico.
            Solo pacientes — si un médico intenta acceder, RutaPaciente
            lo redirige a /dashboard-medico.
          */}
          <Route
            path="/medico/:id/agenda"
            element={<RutaPaciente><Agendarcita /></RutaPaciente>}
          />

          {/* ── Rutas exclusivas de pacientes ── */}
          <Route path="/dashboard" element={<RutaPaciente><Dashboard /></RutaPaciente>} />
          <Route path="/agendar"   element={<RutaPaciente><Agendarcita /></RutaPaciente>} />
          <Route path="/mis-citas" element={<RutaPaciente><MisCitas /></RutaPaciente>} />

          {/* ── Rutas exclusivas de médicos ── */}
          <Route
            path="/dashboard-medico"
            element={<RutaMedico><DashboardMedico /></RutaMedico>}
          />

          {/* ── Rutas de administración ── */}
          <Route path="/admin" element={<RutaAdmin><AdminLayout /></RutaAdmin>}>
            <Route index               element={<AdminDashboard />} />
            <Route path="medicos"      element={<MedicosAdmin />} />
            <Route path="horarios"     element={<HorariosAdmin />} />
            <Route path="usuarios"     element={<UsuariosAdmin />} />
            <Route path="citas"        element={<CitasAdmin />} />
            <Route path="especialidades" element={<EspecialidadesAdmin />} />
            <Route path="medicamentos" element={<MedicamentosAdmin />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
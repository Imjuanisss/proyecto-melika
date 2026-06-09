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

// 🩺 IMPORTACIONES DE ESPECIALIDADES (PÚBLICAS)
import Especialidades from "./pages/especialidades/Especialidades";
import MedicosEspecialidad from "./pages/especialidades/MedicosEspecialidad";

// ─── Imports Admin (nueva estructura de carpetas) ────────────────────────────
import AdminLayout          from "./pages/admin/AdminLayout";
import AdminDashboard       from "./pages/admin/dashboard/AdminDashboard";
import MedicosAdmin         from "./pages/admin/gestionmedicos/MedicosAdmin"; 
import HorariosAdmin        from "./pages/admin/gestionhorarios/HorariosAdmin";
import UsuariosAdmin        from "./pages/admin/gestionusuarios/UsuariosAdmin";
import CitasAdmin           from "./pages/admin/gestioncitas/CitasAdmin";
import EspecialidadesAdmin  from "./pages/admin/gestionespecialidades/EspecialidadesAdmin";
import MedicamentosAdmin    from "./pages/admin/gestionmedicamentos/MedicamentosAdmin";

// ─── Middlewares de Protección de Rutas ──────────────────────────────────────
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

// ─── Componente Principal ────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* 🔓 Rutas Públicas */}
          <Route path="/" element={<Inicio />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/verificar" element={<Verificar />} />
          <Route path="/recuperar" element={<RecuperarPassword />} />
          <Route path="/nueva-password" element={<NuevaPassword />} />
          <Route path="/catalogo" element={<Catalogo />} />

           {/* ruta de activación de cuenta (para médicos) */}
          <Route path="/activar-cuenta" element={<ActivarCuenta />} />

          {/* 🩺 Catálogo de Especialidades y Médicos (Públicos) */}
          <Route path="/especialidades" element={<Especialidades />} />
          <Route path="/especialidades/:id/medicos" element={<MedicosEspecialidad />} />

          {/* 🔒 Rutas de Pacientes Protegidas */}
          <Route path="/dashboard" element={<RutaProtegida><Dashboard /></RutaProtegida>} />
          <Route path="/agendar" element={<RutaProtegida><Agendarcita /></RutaProtegida>} />
          <Route path="/mis-citas" element={<RutaProtegida><MisCitas /></RutaProtegida>} />

          {/* 🩺 Rutas de Médicos Protegidas */}
          <Route path="/dashboard-medico" element={<RutaMedico><DashboardMedico /></RutaMedico>} />
          

          {/* 👑 Rutas de Admin Protegidas (Anidadas) */}
          <Route path="/admin" element={<RutaAdmin><AdminLayout /></RutaAdmin>}>
            <Route index element={<AdminDashboard />} />
            <Route path="medicos" element={<MedicosAdmin />} />
            <Route path="horarios" element={<HorariosAdmin />} />
            <Route path="usuarios" element={<UsuariosAdmin />} />
            <Route path="citas" element={<CitasAdmin />} />
            <Route path="especialidades" element={<EspecialidadesAdmin />} />
            <Route path="medicamentos" element={<MedicamentosAdmin />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
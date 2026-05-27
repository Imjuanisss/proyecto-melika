import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth }  from './context/AuthContext';
import Navbar      from './components/layout/Navbar';
import Inicio      from './pages/inicio/Inicio';
import Login       from './pages/login/Login';
import Registro    from './pages/registro/Registro';
import Dashboard   from './pages/dashboard/Dashboard';
import Agendarcita from './pages/agendar/Agendarcita';
import MisCitas    from './pages/miscitas/MisCitas';
import Catalogo from './pages/catalogo/Catalogo';
 
// Componente que protege rutas: si no hay sesión, redirige al login
function RutaProtegida({ children }) {
    const { usuario } = useAuth();
    if (!usuario) return <Navigate to="/login" replace />;
    return children;
}
 
function AppRoutes() {
    return (
        <>
            <Navbar />
            <Routes>
                {/* Rutas públicas */}
                <Route path="/"         element={<Inicio />} />
                <Route path="/login"    element={<Login />} />
                <Route path="/registro" element={<Registro />} />
 
                {/* Rutas protegidas — requieren login */}
                <Route path="/dashboard" element={
                    <RutaProtegida><Dashboard /></RutaProtegida>
                } />
                <Route path="/agendar" element={
                    <RutaProtegida><Agendarcita /></RutaProtegida>
                } />
                <Route path="/mis-citas" element={
                    <RutaProtegida><MisCitas /></RutaProtegida>
                } />
 
                {/* Cualquier ruta desconocida lleva al inicio */}
                <Route path="*" element={<Navigate to="/" replace />} />

                {/* Ruta para el catálogo de medicamentos */}
                <Route path="/catalogo" element={<Catalogo />} />
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
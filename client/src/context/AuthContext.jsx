import { createContext, useContext, useState } from 'react';
 
// Creamos el contexto de autenticación
const AuthContext = createContext(null);
 
export function AuthProvider({ children }) {
    // Intentamos cargar el usuario desde localStorage al iniciar la app
    const [usuario, setUsuario] = useState(() => {
        try {
            const guardado = localStorage.getItem('melika_usuario');
            return guardado ? JSON.parse(guardado) : null;
        } catch {
            return null;
        }
    });
 
    // Se llama después de un login exitoso
    function login(token, datosUsuario) {
        localStorage.setItem('melika_token',   token);
        localStorage.setItem('melika_usuario', JSON.stringify(datosUsuario));
        setUsuario(datosUsuario);
    }
 
    // Se llama al cerrar sesión
    function logout() {
        localStorage.removeItem('melika_token');
        localStorage.removeItem('melika_usuario');
        setUsuario(null);
    }
 
    return (
        <AuthContext.Provider value={{ usuario, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
 
// Hook personalizado para usar el contexto fácilmente
export function useAuth() {
    return useContext(AuthContext);
}
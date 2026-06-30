const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Lee el token guardado en localStorage después del login
function getToken() {
    return localStorage.getItem('melika_token') || '';
}

// Función base que hace todas las peticiones HTTP
async function request(method, endpoint, body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
    };

    const config = { method, headers };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Si el servidor devuelve 204 (sin contenido), retornamos null
    if (response.status === 204) return null;

   let data;
try {
    data = await response.json();
} catch {
    data = null;
}

    // Si la respuesta no fue exitosa, lanzamos un error enriquecido:
    // - error.message  → string legible (compatibilidad con código existente)
    // - error.mensaje  → mismo texto que entrega el backend
    // - error.errores  → array de validaciones específicas (ej. 422 de
    //                    historias clínicas), o null si el backend no lo envió
    // - error.status   → código HTTP, útil para distinguir 401/403/422/500
    if (!response.ok) {
        const mensaje = data?.mensaje || 'Ocurrió un error inesperado.';
        const error = new Error(mensaje);
        error.mensaje = mensaje;
        error.errores = Array.isArray(data?.errores) ? data.errores : null;
        error.status  = response.status;
        throw error;
    }

    return data;
}

export const api = {
    get:    (endpoint)        => request('GET',    endpoint),
    post:   (endpoint, body)  => request('POST',   endpoint, body),
    put:    (endpoint, body)  => request('PUT',    endpoint, body),
    patch:  (endpoint, body)  => request('PATCH',  endpoint, body),
    delete: (endpoint)        => request('DELETE', endpoint),
};
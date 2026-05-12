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
 
    const data = await response.json();
 
    // Si la respuesta no fue exitosa, lanzamos un error con el mensaje del servidor
    if (!response.ok) {
        throw new Error(data.mensaje || 'Ocurrió un error inesperado.');
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
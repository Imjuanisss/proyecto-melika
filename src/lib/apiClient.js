const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  const session = JSON.parse(localStorage.getItem("sb-session") || "null");
  return session?.access_token || "";
}

async function request(method, endpoint, body = null) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, config);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Error en la petición");
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (endpoint) => request("GET", endpoint),
  post: (endpoint, body) => request("POST", endpoint, body),
  put: (endpoint, body) => request("PUT", endpoint, body),
  patch: (endpoint, body) => request("PATCH", endpoint, body),
  delete: (endpoint) => request("DELETE", endpoint),
};

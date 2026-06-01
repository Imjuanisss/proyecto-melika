const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const especialidadesService = {
  // Obtener todas las especialidades activas
  getAll: async () => {
    try {
      const response = await fetch(`${API_URL}/especialidades`);
      if (!response.ok) throw new Error('Error al obtener las especialidades');
      return await response.json();
    } catch (error) {
      console.error("Error en especialidadesService.getAll:", error);
      throw error;
    }
  },

  // Obtener médicos por ID de especialidad
  getMedicos: async (id) => {
    try {
      const response = await fetch(`${API_URL}/especialidades/${id}/medicos`);
      if (!response.ok) throw new Error('Error al obtener los médicos');
      return await response.json();
    } catch (error) {
      console.error(`Error en especialidadesService.getMedicos(${id}):`, error);
      throw error;
    }
  }
};
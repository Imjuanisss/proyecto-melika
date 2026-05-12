const pool = require('../db');
 
// GET /especialidades — lista todas las especialidades activas
async function listarEspecialidades(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT id, nombre, descripcion, precio_base, imagen_url
             FROM especialidades
             WHERE activa = TRUE
             ORDER BY nombre`
        );
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error en listarEspecialidades:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener especialidades.' });
    }
}
 
// GET /especialidades/:id/medicos — médicos de una especialidad
async function medicosPorEspecialidad(req, res) {
    const { id } = req.params;
 
    try {
        const resultado = await pool.query(
            `SELECT
                m.id,
                u.nombre,
                u.primer_apellido,
                m.tarifa,
                m.calificacion,
                m.acepta_teleconsulta,
                m.acepta_presencial,
                m.biografia,
                m.anos_experiencia
             FROM medicos m
             JOIN usuarios u ON m.id_usuario = u.id
             WHERE m.id_especialidad = $1
               AND m.activo = TRUE
             ORDER BY u.nombre`,
            [id]
        );
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error en medicosPorEspecialidad:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener médicos.' });
    }
}
 
// GET /especialidades/disponibilidad?medico_id=&fecha= — franjas disponibles
async function disponibilidad(req, res) {
    const { medico_id, fecha } = req.query;
 
    if (!medico_id || !fecha) {
        return res.status(400).json({ mensaje: 'Se requiere medico_id y fecha.' });
    }
 
    try {
        const resultado = await pool.query(
            `SELECT id, hora_inicio, hora_fin
             FROM franjas_horarias
             WHERE id_medico = $1
               AND fecha = $2
               AND disponible = TRUE
             ORDER BY hora_inicio`,
            [medico_id, fecha]
        );
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error en disponibilidad:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener disponibilidad.' });
    }
}
 
module.exports = { listarEspecialidades, medicosPorEspecialidad, disponibilidad };
 
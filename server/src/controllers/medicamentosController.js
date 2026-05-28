const pool = require('../config/db');

// ─── GET /medicamentos ────────────────────────────────────────────────────────
// Acepta query params: ?tipo=OTC|Rx  &categoria=...  &buscar=...
async function listarMedicamentos(req, res) {
  const { tipo, categoria, buscar } = req.query;

  try {
    const condiciones = ['m.activo = TRUE'];
    const params      = [];
    let   idx         = 1;

    if (tipo && ['OTC', 'Rx'].includes(tipo)) {
      condiciones.push(`m.tipo = $${idx++}`);
      params.push(tipo);
    }

    if (categoria && categoria !== 'Todos') {
      condiciones.push(`m.categoria = $${idx++}`);
      params.push(categoria);
    }

    if (buscar && buscar.trim().length > 0) {
      condiciones.push(
        `(m.nombre_comercial ILIKE $${idx} OR m.principio_activo ILIKE $${idx})`
      );
      params.push(`%${buscar.trim()}%`);
      idx++;
    }

    const where = condiciones.join(' AND ');

    const resultado = await pool.query(
      `SELECT
         m.id,
         m.nombre_comercial,
         m.principio_activo,
         m.laboratorio,
         m.categoria,
         m.tipo,
         m.descripcion,
         m.indicaciones,
         m.contraindicaciones,
         m.presentaciones,
         m.registro_invima,
         m.imagen_url
       FROM medicamentos m
       WHERE ${where}
       ORDER BY m.nombre_comercial`,
      params
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error en listarMedicamentos:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener medicamentos.' });
  }
}

// ─── GET /medicamentos/categorias ─────────────────────────────────────────────
// Devuelve el listado de categorías únicas que tienen al menos 1 medicamento activo
async function listarCategorias(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT DISTINCT categoria
       FROM medicamentos
       WHERE activo = TRUE AND categoria IS NOT NULL AND categoria <> ''
       ORDER BY categoria`
    );
    res.json(resultado.rows.map(r => r.categoria));
  } catch (error) {
    console.error('Error en listarCategorias:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener categorías.' });
  }
}

// ─── GET /medicamentos/:id ─────────────────────────────────────────────────────
async function obtenerMedicamento(req, res) {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({ mensaje: 'ID inválido.' });
  }

  try {
    const resultado = await pool.query(
      `SELECT * FROM medicamentos WHERE id = $1 AND activo = TRUE`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Medicamento no encontrado.' });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error('Error en obtenerMedicamento:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener el medicamento.' });
  }
}

module.exports = { listarMedicamentos, listarCategorias, obtenerMedicamento };
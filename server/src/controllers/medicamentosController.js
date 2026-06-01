const pool = require('../config/db');

// GET /medicamentos (Filtrado parametrizado para pacientes/médicos)
async function listarMedicamentos(req, res) {
  const { tipo, categoria, buscar } = req.query;

  try {
    const condiciones = ['m.activo = TRUE'];
    const params = [];
    let idx = 1;

    if (tipo && ['OTC', 'Rx'].includes(tipo)) {
      condiciones.push(`m.tipo = $${idx++}`);
      params.push(tipo);
    }

    if (categoria && categoria !== 'Todos') {
      condiciones.push(`m.categoria = $${idx++}`);
      params.push(categoria);
    }

    if (buscar && buscar.trim().length > 0) {
      condiciones.push(`(m.nombre_comercial ILIKE $${idx} OR m.principio_activo ILIKE $${idx})`);
      params.push(`%${buscar.trim()}%`);
      idx++;
    }

    const where = condiciones.join(' AND ');
    const resultado = await pool.query(
      `SELECT m.* FROM medicamentos m WHERE ${where} ORDER BY m.nombre_comercial`,
      params
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error en listarMedicamentos:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener medicamentos.' });
  }
}

// GET /medicamentos/admin (Catálogo sin filtros restrictivos de actividad)
async function listarMedicamentosAdmin(req, res) {
  try {
    const resultado = await pool.query('SELECT * FROM medicamentos ORDER BY id DESC');
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error en listarMedicamentosAdmin:', error.message);
    res.status(500).json({ mensaje: 'Error interno al cargar catálogo administrativo.' });
  }
}

// POST /medicamentos (Insertar medicamento adaptando la nomenclatura cruzada)
async function crearMedicamento(req, res) {
  const { nombre, principio, tipo, descripcion, presentacion, activo, laboratorio, categoria } = req.body;

  if (!nombre || !tipo) {
    return res.status(400).json({ mensaje: 'El nombre comercial y el tipo (OTC/Rx) son campos mandatorios.' });
  }

  try {
    const queryText = `
      INSERT INTO medicamentos (
        nombre_comercial, principio_activo, principio_activa, laboratorio, categoria,
        tipo, descripcion, presentaciones, activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, TRUE))
      RETURNING *`;

    const resultado = await pool.query(queryText, [
      nombre.trim(),
      principio || null,
      principio || null, // Se llenan ambos campos por duplicidad en la BD
      laboratorio || null,
      categoria || null,
      tipo,
      descripcion || null,
      presentacion || null, // Mapea del cuerpo 'presentacion' a la columna 'presentaciones'
      activo
    ]);

    res.status(201).json({
      mensaje: 'Medicamento guardado con éxito.',
      medicamento: resultado.rows[0]
    });
  } catch (error) {
    console.error('Error al crear medicamento:', error.message);
    res.status(500).json({ mensaje: 'Error al registrar el medicamento.' });
  }
}

// PUT /medicamentos/:id (Actualizar registro clínico)
async function actualizarMedicamento(req, res) {
  const { id } = req.params;
  const { nombre, principio, tipo, descripcion, presentacion, activo, laboratorio, categoria } = req.body;

  try {
    const queryText = `
      UPDATE medicamentos
      SET nombre_comercial = $1, principio_activo = $2, principio_activa = $3,
          laboratorio = $4, categoria = $5, tipo = $6, descripcion = $7,
          presentaciones = $8, activo = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *`;

    const resultado = await pool.query(queryText, [
      nombre.trim(),
      principio || null,
      principio || null,
      laboratorio || null,
      categoria || null,
      tipo,
      descripcion || null,
      presentacion || null,
      activo === undefined ? true : activo,
      id
    ]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Medicamento no encontrado.' });
    }

    res.json({
      mensaje: 'Medicamento actualizado con éxito.',
      medicamento: resultado.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar medicamento:', error.message);
    res.status(500).json({ mensaje: 'Error al modificar el medicamento.' });
  }
}

// Auxiliares del catálogo
async function listarCategorias(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT DISTINCT categoria FROM medicamentos WHERE activo = TRUE AND categoria IS NOT NULL AND categoria <> '' ORDER BY categoria`
    );
    res.json(resultado.rows.map(r => r.categoria));
  } catch (error) {
    console.error('Error en listarCategorias:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener categorías.' });
  }
}

async function obtenerMedicamento(req, res) {
  const { id } = req.params;
  if (isNaN(Number(id))) return res.status(400).json({ mensaje: 'ID inválido.' });
  try {
    const resultado = await pool.query(`SELECT * FROM medicamentos WHERE id = $1 AND activo = TRUE`, [id]);
    if (resultado.rows.length === 0) return res.status(404).json({ mensaje: 'Medicamento no encontrado.' });
    res.json(resultado.rows[0]);
  } catch (error) {
    console.error('Error en obtenerMedicamento:', error.message);
    res.status(500).json({ mensaje: 'Error al obtener el medicamento.' });
  }
}

module.exports = {
  listarMedicamentos,
  listarMedicamentosAdmin,
  crearMedicamento,
  actualizarMedicamento,
  listarCategorias,
  obtenerMedicamento
};
const pool = require('../config/db');

// GET /medicamentos (Filtrado parametrizado para pacientes/médicos por especialidad)
async function listarMedicamentos(req, res) {
  const { tipo, id_especialidad, buscar } = req.query; // Cambiado categoria por id_especialidad

  try {
    const condiciones = ['m.activo = TRUE'];
    const params = [];
    let idx = 1;

    if (tipo && ['OTC', 'Rx'].includes(tipo)) {
      condiciones.push(`m.tipo = $${idx++}`);
      params.push(tipo);
    }

    if (id_especialidad && id_especialidad !== 'Todos') {
      condiciones.push(`m.id_especialidad = $${idx++}`);
      params.push(Number(id_especialidad));
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

// POST /medicamentos (Insertar medicamento adaptando id_especialidad y foto)
async function crearMedicamento(req, res) {
  const { 
    nombre, principio, tipo, descripcion, presentacion, 
    activo, laboratorio, id_especialidad, imagen_url // Extraemos id_especialidad en vez de categoria
  } = req.body;

  if (!nombre || !tipo) {
    return res.status(400).json({ mensaje: 'El nombre comercial y el tipo (OTC/Rx) son campos mandatorios.' });
  }

  try {
    // Reemplazamos la columna 'categoria' por 'id_especialidad' en el query
    const queryText = `
      INSERT INTO medicamentos (
        nombre_comercial, principio_activo, principio_activa, laboratorio, id_especialidad,
        tipo, descripcion, presentaciones, activo, imagen_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, TRUE), $10)
      RETURNING *`;

    const resultado = await pool.query(queryText, [
      nombre.trim(),
      principio || null,
      principio || null, 
      laboratorio || null,
      id_especialidad ? parseInt(id_especialidad) : null, // Mapeado al parámetro $5
      tipo,
      descripcion || null,
      presentacion || null, 
      activo,
      imagen_url || null // Mapeado al parámetro $10
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

// PUT /medicamentos/:id (Actualizar registro clínico, especialidad e imagen)
async function actualizarMedicamento(req, res) {
  const { id } = req.params;
  const { 
    nombre, principio, tipo, descripcion, presentacion, 
    activo, laboratorio, id_especialidad, imagen_url // Extraemos id_especialidad en vez de categoria
  } = req.body;

  try {
    // Cambiamos categoria = $5 por id_especialidad = $5
    const queryText = `
      UPDATE medicamentos
      SET nombre_comercial = $1, principio_activo = $2, principio_activa = $3,
          laboratorio = $4, id_especialidad = $5, tipo = $6, descripcion = $7,
          presentaciones = $8, activo = $9, imagen_url = $10, updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *`;

    const resultado = await pool.query(queryText, [
      nombre.trim(),
      principio || null,
      principio || null,
      laboratorio || null,
      id_especialidad ? parseInt(id_especialidad) : null, // Mapeado al parámetro $5
      tipo,
      descripcion || null,
      presentacion || null,
      activo === undefined ? true : activo,
      imagen_url || null, // Mapeado al parámetro $10
      id // Mapeado al parámetro $11
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

// Auxiliares del catálogo (Mantenido para evitar errores de importación en rutas)
async function listarCategorias(req, res) {
  try {
    // Ahora busca de forma dinámica los nombres de las especialidades asignadas a medicamentos activos
    const resultado = await pool.query(
      `SELECT DISTINCT e.nombre 
       FROM medicamentos m 
       JOIN especialidades e ON m.id_especialidad = e.id 
       WHERE m.activo = TRUE AND m.id_especialidad IS NOT NULL 
       ORDER BY e.nombre`
    );
    res.json(resultado.rows.map(r => r.nombre));
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
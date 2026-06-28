// server/src/controllers/adminController.js
const pool = require('../config/db');

// ─── GET /admin/stats — Métricas del dashboard ────────────────────────
async function getStats(req, res) {
  try {
    const [usuarios, medicos, citas, citasHoy, especialidades, medicamentos] =
      await Promise.all([
        pool.query("SELECT COUNT(*) FROM usuarios WHERE rol = 'paciente' AND activo = TRUE"),
        pool.query('SELECT COUNT(*) FROM medicos WHERE activo = TRUE'),
        pool.query("SELECT COUNT(*) FROM citas WHERE estado NOT IN ('cancelada')"),
        pool.query("SELECT COUNT(*) FROM citas WHERE fecha = CURRENT_DATE AND estado != 'cancelada'"),
        pool.query('SELECT COUNT(*) FROM especialidades WHERE activa = TRUE'),
        pool.query('SELECT COUNT(*) FROM medicamentos WHERE activo = TRUE'),
      ]);

    // Citas por estado
    const citasPorEstado = await pool.query(
      `SELECT estado, COUNT(*) as total FROM citas GROUP BY estado`
    );

    // Últimas 5 citas
    const ultimasCitas = await pool.query(
      `SELECT c.id, c.fecha, c.hora_inicio, c.estado, c.tipo_consulta,
              up.nombre AS paciente_nombre, up.primer_apellido AS paciente_apellido,
              um.nombre AS medico_nombre, um.primer_apellido AS medico_apellido,
              e.nombre  AS especialidad
       FROM citas c
       JOIN usuarios up ON c.id_paciente = up.id
       JOIN medicos  m  ON c.id_medico   = m.id
       JOIN usuarios um ON m.id_usuario  = um.id
       JOIN especialidades e ON c.id_especialidad = e.id
       ORDER BY c.created_at DESC LIMIT 5`
    );

    // Médicos más solicitados
    const medicosMasSolicitados = await pool.query(
      `SELECT um.nombre, um.primer_apellido, e.nombre AS especialidad,
              COUNT(c.id) AS total_citas
       FROM citas c
       JOIN medicos  m  ON c.id_medico   = m.id
       JOIN usuarios um ON m.id_usuario  = um.id
       JOIN especialidades e ON m.id_especialidad = e.id
       WHERE c.estado != 'cancelada'
       GROUP BY um.nombre, um.primer_apellido, e.nombre
       ORDER BY total_citas DESC LIMIT 5`
    );

    res.json({
      totales: {
        pacientes:     parseInt(usuarios.rows[0].count),
        medicos:       parseInt(medicos.rows[0].count),
        citas:         parseInt(citas.rows[0].count),
        citasHoy:      parseInt(citasHoy.rows[0].count),
        especialidades:parseInt(especialidades.rows[0].count),
        medicamentos:  parseInt(medicamentos.rows[0].count),
      },
      citasPorEstado:        citasPorEstado.rows,
      ultimasCitas:          ultimasCitas.rows,
      medicosMasSolicitados: medicosMasSolicitados.rows,
    });
  } catch (err) {
    console.error('Error en getStats:', err.message);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas.' });
  }
}

// ─── GET /admin/usuarios — Listar todos los usuarios ──────────────────
async function listarUsuarios(req, res) {
  const { rol, buscar, activo } = req.query;

  try {
    const condiciones = ['1=1'];
    const params = [];
    let idx = 1;

    if (rol && ['paciente', 'medico', 'admin'].includes(rol)) {
      condiciones.push(`u.rol = $${idx++}`);
      params.push(rol);
    }
    if (activo !== undefined && activo !== '') {
      condiciones.push(`u.activo = $${idx++}`);
      params.push(activo === 'true');
    }
    if (buscar?.trim()) {
      condiciones.push(
        `(u.nombre ILIKE $${idx} OR u.primer_apellido ILIKE $${idx} OR u.email ILIKE $${idx})`
      );
      params.push(`%${buscar.trim()}%`);
      idx++;
    }

    const resultado = await pool.query(
      `SELECT u.id, u.nombre, u.primer_apellido, u.email, u.rol,
              u.activo, u.verificado, u.telefono, u.ciudad, u.created_at
       FROM usuarios u
       WHERE ${condiciones.join(' AND ')}
       ORDER BY u.created_at DESC`,
      params
    );

    res.json(resultado.rows);
  } catch (err) {
    console.error('Error en listarUsuarios:', err.message);
    res.status(500).json({ mensaje: 'Error al obtener usuarios.' });
  }
}

// ─── PATCH /admin/usuarios/:id/estado — Activar o desactivar usuario ──
async function toggleEstadoUsuario(req, res) {
  const { id } = req.params;

  try {
    const existe = await pool.query(
      'SELECT id, activo, rol FROM usuarios WHERE id = $1',
      [id]
    );
    if (existe.rows.length === 0)
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    if (existe.rows[0].rol === 'admin')
      return res.status(400).json({ mensaje: 'No puedes desactivar una cuenta de administrador.' });

    const nuevoEstado = !existe.rows[0].activo;

    await pool.query(
      'UPDATE usuarios SET activo = $1, updated_at = NOW() WHERE id = $2',
      [nuevoEstado, id]
    );

    res.json({ mensaje: nuevoEstado ? 'Usuario activado.' : 'Usuario desactivado.' });
  } catch (err) {
    console.error('Error en toggleEstadoUsuario:', err.message);
    res.status(500).json({ mensaje: 'Error al cambiar estado del usuario.' });
  }
}

// ─── GET /admin/citas — Listar citas ───────────────────────────────────────────
async function listarCitas(req, res) {
  const { estado, fecha_desde, fecha_hasta, buscar } = req.query;

  try {
    const condiciones = ['1=1'];
    const params = [];
    let idx = 1;

    if (estado && ['pendiente', 'completada', 'cancelada', 'no_asistio'].includes(estado)) {
      condiciones.push(`c.estado = $${idx++}`);
      params.push(estado);
    }
    if (fecha_desde) {
      condiciones.push(`c.fecha >= $${idx++}`);
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      condiciones.push(`c.fecha <= $${idx++}`);
      params.push(fecha_hasta);
    }
    if (buscar?.trim()) {
      condiciones.push(
        `(up.nombre ILIKE $${idx} OR up.primer_apellido ILIKE $${idx} OR
          um.nombre ILIKE $${idx} OR um.primer_apellido ILIKE $${idx})`
      );
      params.push(`%${buscar.trim()}%`);
      idx++;
    }

    const resultado = await pool.query(
      `SELECT c.id, c.fecha, c.hora_inicio, c.estado, c.tipo_consulta,
              c.motivo, c.razon_cancelacion, c.tarifa, c.created_at,
              f.hora_fin,
              up.nombre AS paciente_nombre, up.primer_apellido AS paciente_apellido,
              up.email  AS paciente_email,
              um.nombre AS medico_nombre,  um.primer_apellido AS medico_apellido,
              e.nombre  AS especialidad
       FROM citas c
       JOIN usuarios up        ON c.id_paciente    = up.id
       JOIN medicos  m         ON c.id_medico      = m.id
       JOIN usuarios um        ON m.id_usuario     = um.id
       JOIN especialidades e   ON c.id_especialidad = e.id
       LEFT JOIN franjas_horarias f ON c.id_franja = f.id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY c.fecha DESC, c.hora_inicio DESC`,
      params
    );

    res.json(resultado.rows);
  } catch (err) {
    console.error('Error en listarCitas:', err.message);
    res.status(500).json({ mensaje: 'Error al obtener citas.' });
  }
}

// ─── PATCH /admin/citas/:id/estado — Cambiar estado cita ─────────────────────
async function cambiarEstadoCita(req, res) {
  const { id } = req.params;
  const { estado, razon_cancelacion } = req.body;

  const estadosValidos = ['pendiente', 'completada', 'cancelada', 'no_asistio'];
  if (!estadosValidos.includes(estado))
    return res.status(400).json({ mensaje: 'Estado no válido.' });

  try {
    const cita = await pool.query(
      'SELECT id, estado, id_franja FROM citas WHERE id = $1',
      [id]
    );
    if (cita.rows.length === 0)
      return res.status(404).json({ mensaje: 'Cita no encontrada.' });

    await pool.query(
      `UPDATE citas SET estado = $1, razon_cancelacion = $2, updated_at = NOW() WHERE id = $3`,
      [estado, razon_cancelacion || null, id]
    );

    if (estado === 'cancelada') {
      await pool.query(
        'UPDATE franjas_horarias SET disponible = TRUE WHERE id = $1',
        [cita.rows[0].id_franja]
      );
    }

    res.json({ mensaje: `Cita actualizada a estado: ${estado}.` });
  } catch (err) {
    console.error('Error en cambiarEstadoCita:', err.message);
    res.status(500).json({ mensaje: 'Error al actualizar la cita.' });
  }
}

// ─── GET /admin/horarios — Franjas de TODOS los médicos (FullCalendar) ─
async function getHorariosAdmin(req, res) {
  const { inicio, fin, id_medico } = req.query;

  try {
    const condiciones = ['1=1'];
    const params = [];
    let idx = 1;

    if (inicio) { condiciones.push(`f.fecha >= $${idx++}`); params.push(inicio); }
    if (fin)    { condiciones.push(`f.fecha <= $${idx++}`); params.push(fin); }
    if (id_medico) { condiciones.push(`f.id_medico = $${idx++}`); params.push(id_medico); }

    const resultado = await pool.query(
      `SELECT f.id, f.fecha, f.hora_inicio, f.hora_fin, f.disponible,
              f.id_medico,
              u.nombre AS medico_nombre, u.primer_apellido AS medico_apellido,
              e.nombre AS especialidad,
              c.id AS cita_id,
              cp.nombre AS paciente_nombre, cp.primer_apellido AS paciente_apellido
       FROM franjas_horarias f
       JOIN medicos     m   ON f.id_medico     = m.id
       JOIN usuarios    u   ON m.id_usuario    = u.id
       JOIN especialidades e ON m.id_especialidad = e.id
       LEFT JOIN citas   c  ON c.id_franja    = f.id AND c.estado != 'cancelada'
       LEFT JOIN usuarios cp ON c.id_paciente = cp.id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY f.fecha, f.hora_inicio`,
      params
    );

    const eventos = resultado.rows.map(f => ({
      id:    f.id,
      title: f.disponible
        ? `Dr(a). ${f.medico_nombre} — Libre`
        : `Dr(a). ${f.medico_nombre} · ${f.paciente_nombre || ''} ${f.paciente_apellido || ''}`,
      start: `${f.fecha.toISOString().split('T')[0]}T${f.hora_inicio}`,
      end:   `${f.fecha.toISOString().split('T')[0]}T${f.hora_fin}`,
      backgroundColor: f.disponible ? '#1A7A52' : '#E8856A',
      borderColor:     f.disponible ? '#1A7A52' : '#C96848',
      extendedProps: {
        disponible:         f.disponible,
        id_medico:          f.id_medico,
        medico_nombre:      `${f.medico_nombre} ${f.medico_apellido}`,
        especialidad:       f.especialidad,
        cita_id:            f.cita_id,
        paciente:           f.paciente_nombre ? `${f.paciente_nombre} ${f.paciente_apellido}` : null,
      },
    }));

    res.json(eventos);
  } catch (err) {
    console.error('Error en getHorariosAdmin:', err.message);
    res.status(500).json({ mensaje: 'Error al obtener horarios.' });
  }
}

// ─── POST /admin/horarios — Crear franja individual (Admin) ─────────────────
async function crearFranjaAdmin(req, res) {
  const { id_medico, fecha, hora_inicio, hora_fin } = req.body;

  if (!id_medico || !fecha || !hora_inicio || !hora_fin)
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });

  if (hora_inicio >= hora_fin)
    return res.status(400).json({ mensaje: 'La hora de inicio debe ser menor a la de fin.' });

  try {
    const medico = await pool.query(
      'SELECT id FROM medicos WHERE id = $1 AND activo = TRUE',
      [id_medico]
    );
    if (medico.rows.length === 0)
      return res.status(404).json({ mensaje: 'Médico no encontrado o inactivo.' });

    const nueva = await pool.query(
      `INSERT INTO franjas_horarias (id_medico, fecha, hora_inicio, hora_fin)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [id_medico, fecha, hora_inicio, hora_fin]
    );

    res.status(201).json({ mensaje: 'Franja creada.', franja: nueva.rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ mensaje: 'Ya existe una franja para esa fecha y hora.' });
    console.error('Error en crearFranjaAdmin:', err.message);
    res.status(500).json({ mensaje: 'Error al crear la franja.' });
  }
}

// ─── POST /admin/horarios/masivo — Crear franjas en bloque ──────────────────
async function crearHorarioMasivo(req, res) {
  const {
    id_medico,
    fecha,
    hora_inicio,
    hora_fin,
    inicio_descanso = null,
    fin_descanso    = null,
  } = req.body;

  if (!id_medico || !fecha || !hora_inicio || !hora_fin)
    return res.status(400).json({ mensaje: 'id_medico, fecha, hora_inicio y hora_fin son obligatorios.' });

  if (hora_inicio >= hora_fin)
    return res.status(400).json({ mensaje: 'La hora de inicio debe ser anterior a la de fin.' });

  if (inicio_descanso && fin_descanso) {
    if (inicio_descanso >= fin_descanso)
      return res.status(400).json({ mensaje: 'El inicio del descanso debe ser anterior a su fin.' });
    if (inicio_descanso <= hora_inicio || fin_descanso >= hora_fin)
      return res.status(400).json({ mensaje: 'El descanso debe estar dentro del horario de la jornada.' });
  }

  try {
    const medicoRes = await pool.query(
      'SELECT id FROM medicos WHERE id = $1 AND activo = TRUE',
      [id_medico]
    );
    if (medicoRes.rows.length === 0)
      return res.status(404).json({ mensaje: 'Médico no encontrado o inactivo.' });

    const franjas = generarFranjasConDescanso(
      hora_inicio,
      hora_fin,
      40,
      inicio_descanso,
      fin_descanso
    );

    if (franjas.length === 0)
      return res.status(400).json({
        mensaje: 'El rango horario no permite generar ninguna franja de 40 minutos.',
      });

    let insertadas  = 0;
    let duplicadas  = 0;

    for (const f of franjas) {
      try {
        await pool.query(
          `INSERT INTO franjas_horarias (id_medico, fecha, hora_inicio, hora_fin)
           VALUES ($1, $2, $3, $4)`,
          [id_medico, fecha, f.hora_inicio, f.hora_fin]
        );
        insertadas++;
      } catch (e) {
        if (e.code === '23505') duplicadas++;
        else throw e;
      }
    }

    return res.status(201).json({
      mensaje:    `Se crearon ${insertadas} franjas${duplicadas ? ` (${duplicadas} ya existían)` : ''}.`,
      insertadas,
      duplicadas,
      total:      franjas.length,
    });
  } catch (err) {
    console.error('Error en crearHorarioMasivo:', err.message);
    return res.status(500).json({ mensaje: 'Error al crear el horario.' });
  }
}

// ─── Helper privado para franjas masivas ─────────────────────────────────────
function generarFranjasConDescanso(horaInicio, horaFin, duracionMin, iniDesc, finDesc) {
  const franjas = [];

  const toMin = str => {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  };
  const toStr = min =>
    `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

  let actual  = toMin(horaInicio);
  const fin   = toMin(horaFin);
  const desc1 = iniDesc ? toMin(iniDesc) : null;
  const desc2 = finDesc ? toMin(finDesc) : null;

  while (actual + duracionMin <= fin) {
    const siguiente = actual + duracionMin;

    if (desc1 !== null && desc2 !== null && actual < desc2 && siguiente > desc1) {
      actual = desc2;
      continue;
    }

    franjas.push({ hora_inicio: toStr(actual), hora_fin: toStr(siguiente) });
    actual = siguiente;
  }

  return franjas;
}

// ─── DELETE /admin/horarios/:id — Eliminar franja libre ────────────────
async function eliminarFranjaAdmin(req, res) {
  const { id } = req.params;

  try {
    const franja = await pool.query('SELECT * FROM franjas_horarias WHERE id = $1', [id]);
    if (franja.rows.length === 0)
      return res.status(404).json({ mensaje: 'Franja no encontrada.' });

    if (!franja.rows[0].disponible)
      return res.status(400).json({ mensaje: 'No se puede eliminar una franja con cita activa.' });

    await pool.query('DELETE FROM franjas_horarias WHERE id = $1', [id]);
    res.json({ mensaje: 'Franja eliminada.' });
  } catch (err) {
    console.error('Error en eliminarFranjaAdmin:', err.message);
    res.status(500).json({ mensaje: 'Error al eliminar la franja.' });
  }
}

// ─── CRUD ESPECIALIDADES ───────────────────────────────────────────────

async function crearEspecialidad(req, res) {
  const { nombre, descripcion, precio_base, imagen_url } = req.body;
  if (!nombre || !precio_base)
    return res.status(400).json({ mensaje: 'Nombre y precio son obligatorios.' });

  try {
    const nueva = await pool.query(
      `INSERT INTO especialidades (nombre, descripcion, precio_base, imagen_url)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [nombre, descripcion || null, precio_base, imagen_url || null]
    );
    res.status(201).json({ mensaje: 'Especialidad creada.', especialidad: nueva.rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ mensaje: 'Ya existe una especialidad con ese nombre.' });
    console.error('Error en crearEspecialidad:', err.message);
    res.status(500).json({ mensaje: 'Error al crear la especialidad.' });
  }
}

async function actualizarEspecialidad(req, res) {
  const { id } = req.params;
  const { nombre, descripcion, precio_base, imagen_url, activa } = req.body;

  try {
    const actualizada = await pool.query(
      `UPDATE especialidades
       SET nombre=$1, descripcion=$2, precio_base=$3, imagen_url=$4, activa=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [nombre, descripcion, precio_base, imagen_url, activa ?? true, id]
    );
    if (actualizada.rows.length === 0)
      return res.status(404).json({ mensaje: 'Especialidad no encontrada.' });

    res.json({ mensaje: 'Especialidad actualizada.', especialidad: actualizada.rows[0] });
  } catch (err) {
    console.error('Error en actualizarEspecialidad:', err.message);
    res.status(500).json({ mensaje: 'Error al actualizar.' });
  }
}

async function toggleEspecialidad(req, res) {
  const { id } = req.params;
  try {
    const esp = await pool.query('SELECT activa FROM especialidades WHERE id = $1', [id]);
    if (esp.rows.length === 0)
      return res.status(404).json({ mensaje: 'Especialidad no encontrada.' });

    const nuevo = !esp.rows[0].activa;
    await pool.query('UPDATE especialidades SET activa=$1, updated_at=NOW() WHERE id=$2', [nuevo, id]);
    res.json({ mensaje: nuevo ? 'Especialidad activada.' : 'Especialidad desactivada.' });
  } catch (err) {
    console.error('Error en toggleEspecialidad:', err.message);
    res.status(500).json({ mensaje: 'Error al cambiar estado.' });
  }
}

// ─── CRUD MEDICAMENTOS ─────────────────────────────────────────────────

async function crearMedicamento(req, res) {
  const {
    nombre_comercial, principio_activo, laboratorio, categoria, tipo,
    descripcion, indicaciones, contraindicaciones, presentaciones,
    registro_invima, imagen_url,
  } = req.body;

  if (!nombre_comercial || !principio_activo)
    return res.status(400).json({ mensaje: 'Nombre comercial y principio activo son obligatorios.' });

  try {
    const nuevo = await pool.query(
      `INSERT INTO medicamentos
         (nombre_comercial, principio_activo, laboratorio, categoria, tipo,
          descripcion, indicaciones, contraindicaciones, presentaciones,
          registro_invima, imagen_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        nombre_comercial, principio_activo, laboratorio || null, categoria || null,
        tipo || 'OTC', descripcion || null, indicaciones || null,
        contraindicaciones || null, presentaciones || null,
        registro_invima || null, imagen_url || null,
      ]
    );
    res.status(201).json({ mensaje: 'Medicamento creado.', medicamento: nuevo.rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ mensaje: 'El registro INVIMA ya existe.' });
    console.error('Error en crearMedicamento:', err.message);
    res.status(500).json({ mensaje: 'Error al crear el medicamento.' });
  }
}

async function actualizarMedicamento(req, res) {
  const { id } = req.params;
  const {
    nombre_comercial, principio_activo, laboratorio, categoria, tipo,
    descripcion, indicaciones, contraindicaciones, presentaciones,
    registro_invima, imagen_url, activo,
  } = req.body;

  try {
    const actualizado = await pool.query(
      `UPDATE medicamentos SET
         nombre_comercial=$1, principio_activo=$2, laboratorio=$3, categoria=$4,
         tipo=$5, descripcion=$6, indicaciones=$7, contraindicaciones=$8,
         presentaciones=$9, registro_invima=$10, imagen_url=$11, activo=$12,
         updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [
        nombre_comercial, principio_activo, laboratorio, categoria, tipo,
        descripcion, indicaciones, contraindicaciones, presentaciones,
        registro_invima, imagen_url, activo ?? true, id,
      ]
    );
    if (actualizado.rows.length === 0)
      return res.status(404).json({ mensaje: 'Medicamento no encontrado.' });

    res.json({ mensaje: 'Medicamento actualizado.', medicamento: actualizado.rows[0] });
  } catch (err) {
    console.error('Error en actualizarMedicamento:', err.message);
    res.status(500).json({ mensaje: 'Error al actualizar.' });
  }
}

async function toggleMedicamento(req, res) {
  const { id } = req.params;
  try {
    const med = await pool.query('SELECT activo FROM medicamentos WHERE id = $1', [id]);
    if (med.rows.length === 0)
      return res.status(404).json({ mensaje: 'Medicamento no encontrado.' });

    const nuevo = !med.rows[0].activo;
    await pool.query('UPDATE medicamentos SET activo=$1, updated_at=NOW() WHERE id=$2', [nuevo, id]);
    res.json({ mensaje: nuevo ? 'Medicamento activado.' : 'Medicamento desactivado.' });
  } catch (err) {
    console.error('Error en toggleMedicamento:', err.message);
    res.status(500).json({ mensaje: 'Error al cambiar estado.' });
  }
}

module.exports = {
  getStats,
  listarUsuarios,
  toggleEstadoUsuario,
  listarCitas,
  cambiarEstadoCita,
  getHorariosAdmin,
  crearFranjaAdmin,
  crearHorarioMasivo, 
  eliminarFranjaAdmin,
  crearEspecialidad,
  actualizarEspecialidad,
  toggleEspecialidad,
  crearMedicamento,
  actualizarMedicamento,
  toggleMedicamento,
};
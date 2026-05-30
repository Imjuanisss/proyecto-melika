import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/apiClient';
import './MedicosAdmin.css';
import '../admin-shared.css';

const FORM_INICIAL = {
  nombre:              '',
  primer_apellido:     '',
  email:               '',
  tipo_documento:      'CC',
  numero_documento:    '',
  ciudad:              '',
  numero_registro:     '',
  id_especialidad:     '',
  anos_experiencia:    0,
  biografia:           '',
  acepta_teleconsulta: true,
  acepta_presencial:   true,
};

// ── Tipos de documento permitidos por el schema ───────────────────────────────
const TIPOS_DOC = [
  { value: 'CC',        label: 'Cédula de Ciudadanía (CC)' },
  { value: 'CE',        label: 'Cédula de Extranjería (CE)' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

export default function MedicosAdmin() {
  const [medicos,        setMedicos]        = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  // Modal: null | 'crear' | 'editar'
  const [modal,      setModal]      = useState(null);
  const [form,       setForm]       = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando,  setGuardando]  = useState(false);
  const [errorForm,  setErrorForm]  = useState(null);
  const [exitoForm,  setExitoForm]  = useState(null);

  // Loading individual por fila para toggle
  const [toggling, setToggling] = useState(null);

  // Búsqueda/filtro rápido
  const [buscar,      setBuscar]      = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const cargarDatos = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.get('/medicos'), api.get('/especialidades')])
      .then(([med, esp]) => {
        setMedicos(med);
        setEspecialidades(esp);
      })
      .catch(() => setError('No se pudieron cargar los datos. Verifica la conexión con el servidor.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Filtrado local ──────────────────────────────────────────────────────────
  const medicosFiltrados = medicos.filter(m => {
    const termino = buscar.toLowerCase();
    const coincide =
      !termino ||
      `${m.nombre} ${m.primer_apellido}`.toLowerCase().includes(termino) ||
      m.email?.toLowerCase().includes(termino) ||
      m.numero_registro?.toLowerCase().includes(termino) ||
      m.numero_documento?.toLowerCase().includes(termino) ||
      m.especialidad?.toLowerCase().includes(termino);

    const estadoOk =
      filtroEstado === 'todos' ||
      (filtroEstado === 'activos'   && m.activo) ||
      (filtroEstado === 'inactivos' && !m.activo);

    return coincide && estadoOk;
  });

  // ── Abrir modal crear ───────────────────────────────────────────────────────
  function abrirCrear() {
    setForm(FORM_INICIAL);
    setEditandoId(null);
    setErrorForm(null);
    setExitoForm(null);
    setModal('crear');
  }

  // ── Abrir modal editar ──────────────────────────────────────────────────────
  function abrirEditar(medico) {
    setForm({
      nombre:              medico.nombre || '',
      primer_apellido:     medico.primer_apellido || '',
      email:               medico.email || '',
      tipo_documento:      medico.tipo_documento  || 'CC',
      numero_documento:    medico.numero_documento || '',
      ciudad:              medico.ciudad           || '',
      numero_registro:     medico.numero_registro || '',
      id_especialidad:     medico.id_especialidad || '',
      anos_experiencia:    medico.anos_experiencia || 0,
      biografia:           medico.biografia        || '',
      acepta_teleconsulta: medico.acepta_teleconsulta ?? true,
      acepta_presencial:   medico.acepta_presencial ?? true,
    });
    setEditandoId(medico.id);
    setErrorForm(null);
    setExitoForm(null);
    setModal('editar');
  }

  function cerrarModal() {
    setModal(null);
    setForm(FORM_INICIAL);
    setEditandoId(null);
    setErrorForm(null);
    setExitoForm(null);
  }

  // ── Manejar cambios en el formulario ───────────────────────────────────────
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  // ── Guardar (crear o editar) ────────────────────────────────────────────────
  async function handleGuardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    setExitoForm(null);

    try {
      if (modal === 'crear') {
        const res = await api.post('/medicos', form);
        setMedicos(prev => [res.medico, ...prev]);
        setExitoForm(`✓ Médico creado. Email de activación enviado a ${form.email}`);
        setTimeout(cerrarModal, 2500);
      } else {
        await api.put(`/medicos/${editandoId}`, form);
        setMedicos(prev =>
          prev.map(m =>
            m.id === editandoId
              ? {
                  ...m,
                  nombre:              form.nombre,
                  primer_apellido:     form.primer_apellido,
                  tipo_documento:      form.tipo_documento,
                  numero_documento:    form.numero_documento,
                  ciudad:              form.ciudad,
                  numero_registro:     form.numero_registro,
                  id_especialidad:     form.id_especialidad,
                  especialidad:        especialidades.find(e => String(e.id) === String(form.id_especialidad))?.nombre || m.especialidad,
                  anos_experiencia:    form.anos_experiencia,
                  biografia:           form.biografia,
                  acepta_teleconsulta: form.acepta_teleconsulta,
                  acepta_presencial:   form.acepta_presencial,
                }
              : m
          )
        );
        setExitoForm('✓ Médico actualizado correctamente.');
        setTimeout(cerrarModal, 1800);
      }
    } catch (err) {
      setErrorForm(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setGuardando(false);
    }
  }

  // ── Toggle activar/desactivar ───────────────────────────────────────────────
  async function handleToggle(id, estadoActual) {
    if (
      !window.confirm(
        estadoActual
          ? '¿Desactivar este médico? No podrá acceder al sistema ni ser agendado.'
          : '¿Activar este médico? Recuperará acceso completo al sistema.'
      )
    ) return;

    setToggling(id);
    try {
      const res = await api.patch(`/medicos/${id}/estado`);
      setMedicos(prev =>
        prev.map(m => (m.id === id ? { ...m, activo: res.activo } : m))
      );
    } catch (err) {
      alert(err.message || 'No se pudo cambiar el estado del médico.');
    } finally {
      setToggling(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="medicos-admin-v2">

      {/* ── Cabecera del módulo ─────────────────────────────────────────── */}
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Gestión de médicos</h1>
          <p className="admin-modulo__subtitulo">
            {!loading && (
              <>
                <span className="med-count med-count--total">{medicos.length} registrados</span>
                <span className="med-count med-count--activos">
                  {medicos.filter(m => m.activo).length} activos
                </span>
                <span className="med-count med-count--inactivos">
                  {medicos.filter(m => !m.activo).length} inactivos
                </span>
              </>
            )}
          </p>
        </div>
        <button className="btn-admin-primario" onClick={abrirCrear}>
          <span className="btn-icon">＋</span> Agregar médico
        </button>
      </div>

      {/* ── Barra de filtros ────────────────────────────────────────────── */}
      <div className="admin-filtros">
        <input
          className="admin-filtros__input"
          placeholder="🔍  Buscar por nombre, email, registro, documento o especialidad…"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
        />
        <div className="filtro-estado-tabs">
          {[
            { key: 'todos',    label: 'Todos' },
            { key: 'activos',  label: '✓ Activos' },
            { key: 'inactivos',label: '✗ Inactivos' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`filtro-tab ${filtroEstado === tab.key ? 'filtro-tab--activo' : ''}`}
              onClick={() => setFiltroEstado(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error global ────────────────────────────────────────────────── */}
      {error && (
        <div className="admin-error">
          {error}
          <button className="admin-error__reintentar" onClick={cargarDatos}>Reintentar</button>
        </div>
      )}

      {/* ── Tabla ────────────────────────────────────────────────────────── */}
      <div className="admin-tabla-wrap">
        <table className="admin-tabla medicos-tabla-v2">
          <thead>
            <tr>
              <th>Médico</th>
              <th>Documento</th>
              <th>Especialidad</th>
              <th>Registro</th>
              <th>Ciudad</th>
              <th>Exp.</th>
              <th>Modalidad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {Array(9).fill(0).map((_, j) => (
                    <td key={j}>
                      <div className="skeleton-cell" style={{ width: j === 0 ? '160px' : '80px' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : medicosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={9} className="admin-vacio">
                  {buscar || filtroEstado !== 'todos'
                    ? 'No hay médicos que coincidan con los filtros aplicados.'
                    : 'Aún no hay médicos registrados. Agrega el primero.'}
                </td>
              </tr>
            ) : (
              medicosFiltrados.map(m => (
                <tr key={m.id} className={!m.activo ? 'fila-inactiva' : ''}>

                  {/* Médico */}
                  <td>
                    <div className="med-avatar-cell">
                      <div className={`med-avatar ${!m.activo ? 'med-avatar--inactivo' : ''}`}>
                        {m.nombre?.[0]}{m.primer_apellido?.[0]}
                      </div>
                      <div>
                        <p className="med-nombre">
                          Dr(a). {m.nombre} {m.primer_apellido}
                        </p>
                        <p className="med-email">{m.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Documento */}
                  <td>
                    <div className="med-doc">
                      <span className="badge badge--gris">{m.tipo_documento || '—'}</span>
                      <span className="med-doc__num">{m.numero_documento || '—'}</span>
                    </div>
                  </td>

                  {/* Especialidad */}
                  <td>
                    <span className="badge badge--azul">{m.especialidad}</span>
                  </td>

                  {/* Registro */}
                  <td className="text-mono">{m.numero_registro}</td>

                  {/* Ciudad */}
                  <td>{m.ciudad || <span className="text-muted">—</span>}</td>

                  {/* Experiencia */}
                  <td>
                    {m.anos_experiencia > 0
                      ? <span className="badge badge--gris">{m.anos_experiencia} años</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>

                  {/* Modalidad */}
                  <td>
                    <div className="modalidad-chips">
                      {m.acepta_presencial   && <span className="chip chip--presencial">🏥 Presencial</span>}
                      {m.acepta_teleconsulta && <span className="chip chip--teleconsulta">💻 Virtual</span>}
                    </div>
                  </td>

                  {/* Estado */}
                  <td>
                    <span className={`badge ${m.activo ? 'badge--verde' : 'badge--rojo'}`}>
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td>
                    <div className="tabla-acciones">
                      <button
                        className="btn-tabla btn-tabla--editar"
                        onClick={() => abrirEditar(m)}
                        title="Editar datos del médico"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        className={`btn-tabla ${m.activo ? 'btn-tabla--warning' : 'btn-tabla--success'}`}
                        disabled={toggling === m.id}
                        onClick={() => handleToggle(m.id, m.activo)}
                        title={m.activo ? 'Desactivar médico' : 'Activar médico'}
                      >
                        {toggling === m.id
                          ? '…'
                          : m.activo
                          ? '🔴 Desactivar'
                          : '🟢 Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal crear / editar ─────────────────────────────────────────── */}
      {modal && (
        <div className="admin-modal-overlay" onClick={cerrarModal}>
          <div
            className="admin-modal medicos-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="medicos-modal__header">
              <div>
                <h3>
                  {modal === 'crear' ? '➕ Agregar nuevo médico' : '✏️ Editar médico'}
                </h3>
                <p className="medicos-modal__sub">
                  {modal === 'crear'
                    ? 'Se enviará un email de invitación para que el médico active su cuenta.'
                    : `Editando: Dr(a). ${form.nombre} ${form.primer_apellido}`}
                </p>
              </div>
              <button className="modal-close-btn" onClick={cerrarModal} title="Cerrar">✕</button>
            </div>

            {/* Mensajes de feedback */}
            {errorForm && <div className="admin-error">{errorForm}</div>}
            {exitoForm  && <div className="admin-exito">{exitoForm}</div>}

            <form onSubmit={handleGuardar} noValidate>

              {/* ── SECCIÓN 1: Datos personales ─────────────────────────── */}
              <div className="form-seccion">
                <div className="form-seccion__titulo">
                  <span className="form-seccion__num">01</span>
                  Datos personales
                </div>
                <div className="admin-form-grid">

                  <div className="admin-campo">
                    <label>Nombre <span className="req">*</span></label>
                    <input
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      placeholder="Ej: Juliana"
                      required
                    />
                  </div>

                  <div className="admin-campo">
                    <label>Apellido <span className="req">*</span></label>
                    <input
                      name="primer_apellido"
                      value={form.primer_apellido}
                      onChange={handleChange}
                      placeholder="Ej: Martínez"
                      required
                    />
                  </div>

                  <div className="admin-campo">
                    <label>Tipo de documento <span className="req">*</span></label>
                    <select
                      name="tipo_documento"
                      value={form.tipo_documento}
                      onChange={handleChange}
                      required
                    >
                      {TIPOS_DOC.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-campo">
                    <label>Número de documento <span className="req">*</span></label>
                    <input
                      name="numero_documento"
                      value={form.numero_documento}
                      onChange={handleChange}
                      placeholder="Ej: 1234567890"
                      required
                    />
                  </div>

                  <div className="admin-campo">
                    <label>Ciudad</label>
                    <input
                      name="ciudad"
                      value={form.ciudad}
                      onChange={handleChange}
                      placeholder="Ej: Medellín"
                    />
                  </div>

                  {/* Email solo editable al crear */}
                  <div className="admin-campo">
                    <label>
                      Correo electrónico <span className="req">*</span>
                      {modal === 'editar' && (
                        <span className="campo-hint"> (no editable)</span>
                      )}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="correo@ejemplo.com"
                      required
                      disabled={modal === 'editar'}
                      className={modal === 'editar' ? 'input-disabled' : ''}
                    />
                  </div>

                </div>
              </div>

              {/* ── SECCIÓN 2: Datos profesionales ──────────────────────── */}
              <div className="form-seccion">
                <div className="form-seccion__titulo">
                  <span className="form-seccion__num">02</span>
                  Datos profesionales
                </div>
                <div className="admin-form-grid">

                  <div className="admin-campo">
                    <label>Número de registro médico <span className="req">*</span></label>
                    <input
                      name="numero_registro"
                      value={form.numero_registro}
                      onChange={handleChange}
                      placeholder="Ej: REG-COL-00123"
                      required
                    />
                  </div>

                  <div className="admin-campo">
                    <label>Especialidad <span className="req">*</span></label>
                    <select
                      name="id_especialidad"
                      value={form.id_especialidad}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar especialidad…</option>
                      {especialidades.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </select>
                    {especialidades.length === 0 && !loading && (
                      <span className="campo-warning">
                        ⚠️ No hay especialidades activas. Crea una primero.
                      </span>
                    )}
                  </div>

                  <div className="admin-campo">
                    <label>Años de experiencia</label>
                    <input
                      type="number"
                      name="anos_experiencia"
                      value={form.anos_experiencia}
                      onChange={handleChange}
                      min="0"
                      max="60"
                      placeholder="0"
                    />
                  </div>

                  <div className="admin-campo admin-form-grid--full">
                    <label>Biografía <span className="campo-hint">(opcional)</span></label>
                    <textarea
                      name="biografia"
                      value={form.biografia}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Breve descripción del perfil profesional del médico…"
                      maxLength={500}
                    />
                    {/* El arreglo que evita el crash de Vite al usar encadenamiento opcional y fallback */}
                    <span className="campo-contador">{(form.biografia?.length || 0)}/500</span>
                  </div>

                </div>
              </div>

              {/* ── SECCIÓN 3: Modalidades ───────────────────────────────── */}
              <div className="form-seccion">
                <div className="form-seccion__titulo">
                  <span className="form-seccion__num">03</span>
                  Modalidades de atención
                </div>
                <div className="modalidades-grid">
                  <label className={`modalidad-toggle ${form.acepta_presencial ? 'modalidad-toggle--activo' : ''}`}>
                    <input
                      type="checkbox"
                      name="acepta_presencial"
                      checked={form.acepta_presencial}
                      onChange={handleChange}
                    />
                    <div className="modalidad-toggle__content">
                      <span className="modalidad-toggle__icon">🏥</span>
                      <div>
                        <p className="modalidad-toggle__label">Consulta presencial</p>
                        <p className="modalidad-toggle__desc">Atención física en consultorio</p>
                      </div>
                    </div>
                    <span className="modalidad-toggle__check">
                      {form.acepta_presencial ? '✓' : ''}
                    </span>
                  </label>

                  <label className={`modalidad-toggle ${form.acepta_teleconsulta ? 'modalidad-toggle--activo' : ''}`}>
                    <input
                      type="checkbox"
                      name="acepta_teleconsulta"
                      checked={form.acepta_teleconsulta}
                      onChange={handleChange}
                    />
                    <div className="modalidad-toggle__content">
                      <span className="modalidad-toggle__icon">💻</span>
                      <div>
                        <p className="modalidad-toggle__label">Teleconsulta</p>
                        <p className="modalidad-toggle__desc">Videollamada o consulta virtual</p>
                      </div>
                    </div>
                    <span className="modalidad-toggle__check">
                      {form.acepta_teleconsulta ? '✓' : ''}
                    </span>
                  </label>
                </div>
              </div>

              {/* ── Acciones del modal ───────────────────────────────────── */}
              <div className="admin-modal__acciones">
                <button
                  type="button"
                  className="admin-modal__btn-cancelar"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="admin-modal__btn-guardar"
                  disabled={guardando || !!exitoForm}
                >
                  {guardando
                    ? (modal === 'crear' ? 'Creando médico…' : 'Guardando cambios…')
                    : (modal === 'crear' ? '✉️ Crear y enviar invitación' : '💾 Guardar cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
// src/pages/admin/MedicosAdmin.jsx  — v2
// Rediseño completo: tabla con avatares, badges de estado premium,
// modal de secciones, toggles de modalidad, filtros avanzados.

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/apiClient';
import './MedicosAdmin.css';
import '../admin-shared.css';


// ─── Formulario inicial ───────────────────────────────────────────
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

const TIPOS_DOC = [
  { value: 'CC',        label: 'Cédula de Ciudadanía' },
  { value: 'CE',        label: 'Cédula de Extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

// ─── Componente Avatar ────────────────────────────────────────────
function MedAvatar({ nombre, apellido, activo }) {
  const initials = `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase();
  return (
    <div className={`med-avatar${!activo ? ' med-avatar--inactivo' : ''}`}>
      {initials}
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────
function SkeletonRows({ count = 5, cols = 9 }) {
  const widths = ['180px', '100px', '110px', '110px', '80px', '60px', '120px', '80px', '110px'];
  return Array(count).fill(0).map((_, i) => (
    <tr key={i} className="skeleton-row">
      {Array(cols).fill(0).map((_, j) => (
        <td key={j}>
          <div className="skeleton-cell" style={{ width: widths[j] || '80px' }} />
        </td>
      ))}
    </tr>
  ));
}

export default function MedicosAdmin() {
  const [medicos,        setMedicos]        = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  // Modal
  const [modal,      setModal]      = useState(null); // null | 'crear' | 'editar'
  const [form,       setForm]       = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando,  setGuardando]  = useState(false);
  const [errorForm,  setErrorForm]  = useState(null);
  const [exitoForm,  setExitoForm]  = useState(null);

  // Acciones por fila
  const [toggling, setToggling] = useState(null);

  // Filtros
  const [buscar,       setBuscar]       = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // ── Carga ─────────────────────────────────────────────────────────
  const cargarDatos = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.get('/medicos'), api.get('/especialidades')])
      .then(([med, esp]) => { setMedicos(med); setEspecialidades(esp); })
      .catch(() => setError('No se pudieron cargar los datos. Verifica la conexión con el servidor.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Filtrado local ─────────────────────────────────────────────────
  const medicosFiltrados = medicos.filter(m => {
    const term = buscar.trim().toLowerCase();
    const coincide = !term ||
      `${m.nombre} ${m.primer_apellido}`.toLowerCase().includes(term) ||
      m.email?.toLowerCase().includes(term) ||
      m.numero_registro?.toLowerCase().includes(term) ||
      m.numero_documento?.toLowerCase().includes(term) ||
      m.especialidad?.toLowerCase().includes(term);

    const estadoOk =
      filtroEstado === 'todos' ||
      (filtroEstado === 'activos'   && m.activo) ||
      (filtroEstado === 'inactivos' && !m.activo);

    return coincide && estadoOk;
  });

  // ── Modal handlers ─────────────────────────────────────────────────
  function abrirCrear() {
    setForm(FORM_INICIAL);
    setEditandoId(null);
    setErrorForm(null);
    setExitoForm(null);
    setModal('crear');
  }

  function abrirEditar(medico) {
    setForm({
      nombre:              medico.nombre,
      primer_apellido:     medico.primer_apellido,
      email:               medico.email,
      tipo_documento:      medico.tipo_documento  || 'CC',
      numero_documento:    medico.numero_documento || '',
      ciudad:              medico.ciudad           || '',
      numero_registro:     medico.numero_registro,
      id_especialidad:     medico.id_especialidad,
      anos_experiencia:    medico.anos_experiencia || 0,
      biografia:           medico.biografia        || '',
      acepta_teleconsulta: medico.acepta_teleconsulta,
      acepta_presencial:   medico.acepta_presencial,
    });
    setEditandoId(medico.id);
    setErrorForm(null);
    setExitoForm(null);
    setModal('editar');
  }

  function cerrarModal() {
    setModal(null);
    setEditandoId(null);
    setErrorForm(null);
    setExitoForm(null);
    setForm(FORM_INICIAL);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleGuardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    setExitoForm(null);
    try {
      if (modal === 'crear') {
        const res = await api.post('/medicos', form);
        setMedicos(prev => [res.medico, ...prev]);
        setExitoForm(`✓ Médico creado. Invitación enviada a ${form.email}`);
        setTimeout(cerrarModal, 2500);
      } else {
        await api.put(`/medicos/${editandoId}`, form);
        setMedicos(prev => prev.map(m => m.id === editandoId
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
        ));
        setExitoForm('✓ Datos del médico actualizados correctamente.');
        setTimeout(cerrarModal, 1800);
      }
    } catch (err) {
      setErrorForm(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setGuardando(false);
    }
  }

  async function handleToggle(id, activo) {
    if (!window.confirm(activo
      ? '¿Desactivar este médico? Perderá acceso y no podrá ser agendado.'
      : '¿Activar este médico? Recuperará acceso completo al sistema.'
    )) return;
    setToggling(id);
    try {
      const res = await api.patch(`/medicos/${id}/estado`);
      setMedicos(prev => prev.map(m => m.id === id ? { ...m, activo: res.activo } : m));
    } catch (err) {
      alert(err.message || 'No se pudo cambiar el estado.');
    } finally {
      setToggling(null);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="medicos-admin-v2">

      {/* ── Cabecera ──────────────────────────────────────────────── */}
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Gestión de Médicos</h1>
          {!loading && (
            <div className="med-counts">
              <span className="med-count med-count--total">
                <span className="med-count__dot" />
                {medicos.length} registrados
              </span>
              <span className="med-count med-count--activos">
                <span className="med-count__dot" />
                {medicos.filter(m => m.activo).length} activos
              </span>
              {medicos.filter(m => !m.activo).length > 0 && (
                <span className="med-count med-count--inactivos">
                  <span className="med-count__dot" />
                  {medicos.filter(m => !m.activo).length} inactivos
                </span>
              )}
            </div>
          )}
        </div>
        <button className="btn-admin-primario" onClick={abrirCrear}>
          + Añadir Médico
        </button>
      </div>

      {/* ── Filtros ───────────────────────────────────────────────── */}
      <div className="admin-filtros">
        <input
          className="admin-filtros__input"
          placeholder="Buscar médico…"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
        />
        <div className="filtro-estado-tabs">
          {[
            { key: 'todos',     label: 'Todos'     },
            { key: 'activos',   label: '✓ Activos' },
            { key: 'inactivos', label: '✗ Inactivos' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`filtro-tab${filtroEstado === tab.key ? ' filtro-tab--activo' : ''}`}
              onClick={() => setFiltroEstado(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error global ──────────────────────────────────────────── */}
      {error && (
        <div className="admin-error">
          <span>⚠ {error}</span>
          <button className="admin-error__reintentar" onClick={cargarDatos}>
            Reintentar
          </button>
        </div>
      )}

      {/* ── Tabla ─────────────────────────────────────────────────── */}
      <div className="admin-tabla-wrap">
        <table className="admin-tabla medicos-tabla-v2">
          <colgroup>
            <col className="col-medico" />
            <col className="col-doc" />
            <col className="col-esp" />
            <col className="col-registro" />
            <col className="col-ciudad" />
            <col className="col-exp" />
            <col className="col-modal" />
            <col className="col-estado" />
            <col className="col-acciones" />
          </colgroup>
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
              <SkeletonRows count={5} cols={9} />
            ) : medicosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={9} className="admin-vacio">
                  {buscar || filtroEstado !== 'todos'
                    ? 'Sin resultados para los filtros aplicados.'
                    : 'Aún no hay médicos registrados. Agrega el primero.'}
                </td>
              </tr>
            ) : (
              medicosFiltrados.map(m => (
                <tr key={m.id} className={!m.activo ? 'fila-inactiva' : ''}>

                  {/* Médico */}
                  <td>
                    <div className="med-avatar-cell">
                      <MedAvatar nombre={m.nombre} apellido={m.primer_apellido} activo={m.activo} />
                      <div className="med-info">
                        <div className="med-nombre">Dr(a). {m.nombre} {m.primer_apellido}</div>
                        <div className="med-email">{m.email}</div>
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
                  <td><span className="text-mono">{m.numero_registro}</span></td>

                  {/* Ciudad */}
                  <td>{m.ciudad || <span className="text-muted">—</span>}</td>

                  {/* Experiencia */}
                  <td>
                    {m.anos_experiencia > 0
                      ? <span className="badge badge--gris">{m.anos_experiencia}a</span>
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
                      >
                        Editar
                      </button>
                      <button
                        className={`btn-tabla ${m.activo ? 'btn-tabla--warning' : 'btn-tabla--success'}`}
                        disabled={toggling === m.id}
                        onClick={() => handleToggle(m.id, m.activo)}
                      >
                        {toggling === m.id ? '…' : m.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODAL CREAR / EDITAR
          ═══════════════════════════════════════════════════════════ */}
      {modal && (
        <div className="admin-modal-overlay" onClick={cerrarModal}>
          <div
            className="admin-modal medicos-modal"
            onClick={e => e.stopPropagation()}
          >

            {/* Header sticky */}
            <div className="medicos-modal__header">
              <div className="medicos-modal__header-info">
                <h3>
                  {modal === 'crear' ? 'Agregar médico' : 'Editar médico'}
                </h3>
                <p className="medicos-modal__sub">
                  {modal === 'crear'
                    ? 'El médico recibirá un email para activar su cuenta.'
                    : `Dr(a). ${form.nombre} ${form.primer_apellido}`}
                </p>
              </div>
              <button className="modal-close-btn" onClick={cerrarModal} aria-label="Cerrar">✕</button>
            </div>

            {/* Cuerpo */}
            <div className="medicos-modal__body">
              {errorForm && <div className="admin-error">{errorForm}</div>}
              {exitoForm  && <div className="admin-exito">{exitoForm}</div>}

              <form onSubmit={handleGuardar} id="form-medico" noValidate>

                {/* Sección 1: Datos personales */}
                <div className="form-seccion">
                  <div className="form-seccion__titulo">
                    <span className="form-seccion__num">1</span>
                    <span className="form-seccion__label">Datos personales</span>
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
                        autoComplete="off"
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
                        autoComplete="off"
                      />
                    </div>

                    <div className="admin-campo">
                      <label>Tipo de documento <span className="req">*</span></label>
                      <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} required>
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
                        autoComplete="off"
                      />
                    </div>

                    <div className="admin-campo">
                      <label>
                        Correo electrónico <span className="req">*</span>
                        {modal === 'editar' && <span className="campo-hint">(no editable)</span>}
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
                        autoComplete="off"
                      />
                    </div>

                    <div className="admin-campo">
                      <label>Ciudad</label>
                      <input
                        name="ciudad"
                        value={form.ciudad}
                        onChange={handleChange}
                        placeholder="Ej: Medellín"
                        autoComplete="off"
                      />
                    </div>

                  </div>
                </div>

                {/* Sección 2: Datos profesionales */}
                <div className="form-seccion">
                  <div className="form-seccion__titulo">
                    <span className="form-seccion__num">2</span>
                    <span className="form-seccion__label">Datos profesionales</span>
                  </div>
                  <div className="admin-form-grid">

                    <div className="admin-campo">
                      <label>Registro médico <span className="req">*</span></label>
                      <input
                        name="numero_registro"
                        value={form.numero_registro}
                        onChange={handleChange}
                        placeholder="Ej: REG-COL-00123"
                        required
                        autoComplete="off"
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
                        <option value="">Seleccionar…</option>
                        {especialidades.map(e => (
                          <option key={e.id} value={e.id}>{e.nombre}</option>
                        ))}
                      </select>
                      {especialidades.length === 0 && !loading && (
                        <span className="campo-warning">⚠ Crea una especialidad primero.</span>
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
                        placeholder="Breve descripción del perfil profesional…"
                        maxLength={500}
                      />
                      <span className="campo-contador">{form.biografia.length} / 500</span>
                    </div>

                  </div>
                </div>

                {/* Sección 3: Modalidades */}
                <div className="form-seccion">
                  <div className="form-seccion__titulo">
                    <span className="form-seccion__num">3</span>
                    <span className="form-seccion__label">Modalidades de atención</span>
                  </div>
                  <div className="modalidades-grid">

                    <label className={`modalidad-toggle${form.acepta_presencial ? ' modalidad-toggle--activo' : ''}`}>
                      <input
                        type="checkbox"
                        name="acepta_presencial"
                        checked={form.acepta_presencial}
                        onChange={handleChange}
                      />
                      <span className="modalidad-toggle__icon">🏥</span>
                      <div className="modalidad-toggle__content">
                        <span className="modalidad-toggle__label">Presencial</span>
                        <span className="modalidad-toggle__desc">Atención física en consultorio</span>
                      </div>
                      <span className="modalidad-toggle__check">✓</span>
                    </label>

                    <label className={`modalidad-toggle${form.acepta_teleconsulta ? ' modalidad-toggle--activo' : ''}`}>
                      <input
                        type="checkbox"
                        name="acepta_teleconsulta"
                        checked={form.acepta_teleconsulta}
                        onChange={handleChange}
                      />
                      <span className="modalidad-toggle__icon">💻</span>
                      <div className="modalidad-toggle__content">
                        <span className="modalidad-toggle__label">Teleconsulta</span>
                        <span className="modalidad-toggle__desc">Consulta virtual o videollamada</span>
                      </div>
                      <span className="modalidad-toggle__check">✓</span>
                    </label>

                  </div>
                </div>

              </form>
            </div>

            {/* Footer sticky con acciones */}
            <div className="medicos-modal__footer">
              <div className="admin-modal__acciones" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
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
                  form="form-medico"
                  className="admin-modal__btn-guardar"
                  disabled={guardando || !!exitoForm}
                >
                  {guardando
                    ? (modal === 'crear' ? 'Creando…' : 'Guardando…')
                    : (modal === 'crear' ? 'Crear y enviar invitación' : 'Guardar cambios')}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
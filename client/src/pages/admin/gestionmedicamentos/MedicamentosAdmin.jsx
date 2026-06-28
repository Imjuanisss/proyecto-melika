import { useState, useEffect } from 'react';
import { api } from '../../../lib/apiClient';
import './MedicamentosAdmin.css';
import '../admin-shared.css';

// FIX: Solo OTC y Rx son válidos según el CHECK constraint de la BD
// CHECK (tipo IN ('OTC','Rx')) — los otros valores causaban el 500
const TIPOS = ['OTC', 'Rx'];

const TIPO_BADGE = {
  'OTC': 'badge--verde',
  'Rx': 'badge--azul',
};

// ── Modal de crear / editar ───────────────────────────────────────────────────
function ModalMedicamento({ modo, medicamento, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    nombre:          medicamento?.nombre_comercial ?? '',
    principio:       medicamento?.principio_activo ?? '',
    tipo:            medicamento?.tipo ?? 'OTC',
    descripcion:     medicamento?.descripcion ?? '',
    presentacion:    medicamento?.presentaciones ?? '',
    laboratorio:     medicamento?.laboratorio ?? '',
    id_especialidad: medicamento?.id_especialidad ?? '',
    imagen_url:      medicamento?.imagen_url ?? '',
    activo:          medicamento?.activo ?? true,
  });

  const [guardando,     setGuardando]     = useState(false);
  const [errorModal,    setErrorModal]    = useState(null);
  const [especialidades, setEspecialidades] = useState([]);

  useEffect(() => {
    api.get('/especialidades')
      .then(res => {
        const data = res.data ? res.data : res;
        setEspecialidades(Array.isArray(data) ? data : []);
      })
      .catch(() => {}); // silencioso — la especialidad es opcional
  }, []);

  function cambiar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setErrorModal('El nombre comercial es obligatorio.');
      return;
    }
    setGuardando(true);
    setErrorModal(null);
    try {
      await onGuardar(form);
    } catch (err) {
      setErrorModal(err.message || 'Error al guardar el medicamento.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onCerrar}>
      <form className="admin-modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="admin-modal__header">
          <h3>{modo === 'crear' ? 'Nuevo medicamento' : 'Editar medicamento'}</h3>
          <button type="button" className="admin-modal__cerrar" onClick={onCerrar}>✕</button>
        </div>

        {errorModal && (
          <div className="admin-error" style={{ marginBottom: '1rem' }}>
            {errorModal}
          </div>
        )}

        <div className="med-modal-grid">
          {/* Nombre comercial */}
          <div className="admin-campo">
            <label>Nombre comercial *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => cambiar('nombre', e.target.value)}
              placeholder="Ej: Ibuprofeno 400mg"
              required
            />
          </div>

          {/* Principio activo */}
          <div className="admin-campo">
            <label>Principio activo</label>
            <input
              type="text"
              value={form.principio}
              onChange={e => cambiar('principio', e.target.value)}
              placeholder="Ej: Ibuprofeno"
            />
          </div>

          {/* Tipo — solo OTC o Rx para respetar el CHECK de la BD */}
          <div className="admin-campo">
            <label>Tipo *</label>
            <select value={form.tipo} onChange={e => cambiar('tipo', e.target.value)}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Presentación */}
          <div className="admin-campo">
            <label>Presentación</label>
            <input
              type="text"
              value={form.presentacion}
              onChange={e => cambiar('presentacion', e.target.value)}
              placeholder="Ej: Caja x 20 tabletas"
            />
          </div>

          {/* Laboratorio */}
          <div className="admin-campo">
            <label>Laboratorio</label>
            <input
              type="text"
              value={form.laboratorio}
              onChange={e => cambiar('laboratorio', e.target.value)}
              placeholder="Ej: Genfar"
            />
          </div>

          {/* Especialidad */}
          <div className="admin-campo">
            <label>Especialidad</label>
            <select
              value={form.id_especialidad}
              onChange={e => cambiar('id_especialidad', e.target.value)}
            >
              <option value="">Seleccione especialidad...</option>
              {especialidades.map(esp => (
                <option key={esp.id} value={esp.id}>{esp.nombre}</option>
              ))}
            </select>
          </div>

          {/* URL imagen */}
          <div className="admin-campo admin-campo--full">
            <label>URL de la imagen o ícono</label>
            <input
              type="text"
              value={form.imagen_url}
              onChange={e => cambiar('imagen_url', e.target.value)}
              placeholder="Ej: /imagenes/medicamentos/ibuprofeno.jpg"
            />
          </div>

          {/* Descripción */}
          <div className="admin-campo admin-campo--full">
            <label>Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => cambiar('descripcion', e.target.value)}
              placeholder="Indicaciones o advertencias clínicas…"
              rows={3}
            />
          </div>
        </div>

        {/* Toggle activo/inactivo — solo al editar */}
        {modo === 'editar' && (
          <div className="admin-campo admin-campo--toggle">
            <label>Estado</label>
            <button
              type="button"
              className={`toggle-btn ${form.activo ? 'toggle-btn--activo' : ''}`}
              onClick={() => cambiar('activo', !form.activo)}
            >
              <span className="toggle-btn__dot" />
              {form.activo ? 'Activo' : 'Inactivo'}
            </button>
          </div>
        )}

        <div className="admin-modal__acciones">
          <button type="button" className="admin-modal__btn-cancelar" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="admin-modal__btn-guardar" disabled={guardando}>
            {guardando ? 'Guardando…' : modo === 'crear' ? 'Crear medicamento' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function MedicamentosAdmin() {
  const [meds,     setMeds]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [buscar,   setBuscar]   = useState('');
  const [tipoFilt, setTipoFilt] = useState('');
  const [modal,    setModal]    = useState(null);

  useEffect(() => {
    api.get('/medicamentos/admin')
      .then(res => {
        const data = res.data ? res.data : res;
        setMeds(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch(() => setError('No se pudieron cargar los medicamentos.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleGuardar(form) {
    if (modal.modo === 'crear') {
      const res  = await api.post('/medicamentos', form);
      const data = res.data ? res.data : res;
      setMeds(prev => [data.medicamento, ...prev]);
    } else {
      const res  = await api.put(`/medicamentos/${modal.med.id}`, form);
      const data = res.data ? res.data : res;
      setMeds(prev => prev.map(m => m.id === modal.med.id ? data.medicamento : m));
    }
    setModal(null);
  }

  const filtrados = meds.filter(m => {
    const coincideBuscar =
      !buscar ||
      (m.nombre_comercial ?? '').toLowerCase().includes(buscar.toLowerCase()) ||
      (m.principio_activo ?? '').toLowerCase().includes(buscar.toLowerCase());
    const coincideTipo = !tipoFilt || m.tipo === tipoFilt;
    return coincideBuscar && coincideTipo;
  });

  return (
    <div className="meds-admin">
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Medicamentos</h1>
          <p className="admin-modulo__subtitulo">Catálogo global de medicamentos del sistema</p>
        </div>
        <button
          className="btn-admin-primario"
          onClick={() => setModal({ modo: 'crear', med: null })}
        >
          + Nuevo medicamento
        </button>
      </div>

      <div className="admin-filtros">
        <input
          className="admin-filtros__input"
          placeholder="Buscar por nombre o principio activo…"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
        />
        <select
          className="admin-filtros__select"
          value={tipoFilt}
          onChange={e => setTipoFilt(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-tabla-wrap">
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>Medicamento</th>
              <th>Principio activo</th>
              <th>Tipo</th>
              <th>Presentación</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {Array(6).fill(0).map((_, j) => (
                    <td key={j}><div className="skeleton-cell" /></td>
                  ))}
                </tr>
              ))
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-vacio">
                  <p>No se encontraron medicamentos registrados.</p>
                </td>
              </tr>
            ) : (
              filtrados.map(m => (
                <tr key={m.id} className={!m.activo ? 'admin-tabla__row--inactivo' : ''}>
                  <td>
                    <p className="admin-tabla__nombre">{m.nombre_comercial}</p>
                  </td>
                  <td className="admin-tabla__meta">{m.principio_activo ?? '—'}</td>
                  <td>
                    <span className={`badge ${TIPO_BADGE[m.tipo] ?? 'badge--gris'}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="admin-tabla__meta">{m.presentaciones ?? '—'}</td>
                  <td>
                    <span className={`badge ${m.activo ? 'badge--verde' : 'badge--gris'}`}>
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-tabla btn-tabla--editar"
                      onClick={() => setModal({ modo: 'editar', med: m })}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalMedicamento
          modo={modal.modo}
          medicamento={modal.med}
          onGuardar={handleGuardar}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}
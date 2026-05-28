// src/pages/admin/EspecialidadesAdmin.jsx
import { useState, useEffect, useCallback } from 'react'; // ← añadir useCallback
import { api } from '../../lib/apiClient';
import './EspecialidadesAdmin.css';
import './admin-shared.css';

const FORM0 = { nombre: '', descripcion: '', precio_base: '', imagen_url: '', activa: true };

export default function EspecialidadesAdmin() {
  const [especialidades, setEspecialidades] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [modal,     setModal]     = useState(null); // null | 'crear' | 'editar'
  const [form,      setForm]      = useState(FORM0);
  const [editId,    setEditId]    = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);
  const [toggling,  setToggling]  = useState(null);

  // ── FIX: convertir a useCallback para poder usarla como dependencia ──
  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/especialidades')
      .then(data  => setEspecialidades(data))
      .catch(()   => setError('Error al cargar especialidades.'))
      .finally(() => setLoading(false));
  }, []); // sin deps: no depende de ningún estado externo

  // ── FIX: useEffect después de la declaración de cargar ────────────────
  useEffect(() => {
    cargar();
  }, [cargar]);

  function abrirCrear() {
    setForm(FORM0);
    setEditId(null);
    setErrorForm(null);
    setModal('crear');
  }

  function abrirEditar(esp) {
    setForm({
      nombre:      esp.nombre,
      descripcion: esp.descripcion || '',
      precio_base: esp.precio_base,
      imagen_url:  esp.imagen_url  || '',
      activa:      esp.activa,
    });
    setEditId(esp.id);
    setErrorForm(null);
    setModal('editar');
  }

  async function handleGuardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    try {
      if (modal === 'crear') {
        const res = await api.post('/admin/especialidades', form);
        setEspecialidades(prev => [res.especialidad, ...prev]);
      } else {
        await api.put(`/admin/especialidades/${editId}`, form);
        setEspecialidades(prev =>
          prev.map(e => e.id === editId ? { ...e, ...form } : e)
        );
      }
      setModal(null);
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleToggle(id) {
    setToggling(id);
    try {
      await api.patch(`/admin/especialidades/${id}/estado`);
      setEspecialidades(prev =>
        prev.map(e => e.id === id ? { ...e, activa: !e.activa } : e)
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="especialidades-admin">
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Especialidades</h1>
          <p className="admin-modulo__subtitulo">Catálogo de especialidades médicas</p>
        </div>
        <button className="btn-admin-primario" onClick={abrirCrear}>
          + Nueva especialidad
        </button>
      </div>

      {/* error ahora sí se usa → sin warning ─────────────────────────── */}
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-tabla-wrap">
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>Especialidad</th>
              <th>Descripción</th>
              <th>Precio base</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(5).fill(0).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {Array(5).fill(0).map((_, j) => (
                    <td key={j}><div className="skeleton-cell" /></td>
                  ))}
                </tr>
              ))
              : especialidades.length === 0
              ? <tr><td colSpan={5} className="admin-vacio">No hay especialidades.</td></tr>
              : especialidades.map(e => (
                <tr key={e.id}>
                  <td>
                    <strong style={{ color: 'var(--melika-text-primary)' }}>{e.nombre}</strong>
                  </td>
                  <td style={{ maxWidth: '280px', fontSize: '13px' }}>{e.descripcion || '—'}</td>
                  <td>${Number(e.precio_base).toLocaleString('es-CO')} COP</td>
                  <td>
                    <span className={`badge ${e.activa ? 'badge--verde' : 'badge--rojo'}`}>
                      {e.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <div className="tabla-acciones">
                      <button
                        className="btn-tabla btn-tabla--editar"
                        onClick={() => abrirEditar(e)}
                      >
                        Editar
                      </button>
                      <button
                        className={`btn-tabla ${e.activa ? 'btn-tabla--warning' : 'btn-tabla--success'}`}
                        disabled={toggling === e.id}
                        onClick={() => handleToggle(e.id)}
                      >
                        {toggling === e.id ? '…' : e.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={ev => ev.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Nueva especialidad' : 'Editar especialidad'}</h3>
            {errorForm && <div className="admin-error">{errorForm}</div>}
            <form onSubmit={handleGuardar}>
              <div className="admin-form-grid">
                <div className="admin-campo admin-form-grid--full">
                  <label>Nombre</label>
                  <input
                    value={form.nombre}
                    onChange={ev => setForm(p => ({ ...p, nombre: ev.target.value }))}
                    placeholder="Ej: Cardiología"
                    required
                  />
                </div>
                <div className="admin-campo admin-form-grid--full">
                  <label>Descripción</label>
                  <textarea
                    rows={2}
                    value={form.descripcion}
                    onChange={ev => setForm(p => ({ ...p, descripcion: ev.target.value }))}
                    placeholder="Breve descripción de la especialidad…"
                  />
                </div>
                <div className="admin-campo">
                  <label>Precio base (COP)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.precio_base}
                    onChange={ev => setForm(p => ({ ...p, precio_base: ev.target.value }))}
                    required
                  />
                </div>
                <div className="admin-campo">
                  <label>URL imagen (opcional)</label>
                  <input
                    value={form.imagen_url}
                    onChange={ev => setForm(p => ({ ...p, imagen_url: ev.target.value }))}
                    placeholder="/imagenes/especialidades/…"
                  />
                </div>
              </div>
              <div className="admin-modal__acciones">
                <button
                  type="button"
                  className="admin-modal__btn-cancelar"
                  onClick={() => setModal(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="admin-modal__btn-guardar"
                  disabled={guardando}
                >
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
// src/pages/admin/gestion-especialidades/EspecialidadesAdmin.jsx
import { useState, useEffect } from 'react';
import { api } from '../../../lib/apiClient';
import './EspecialidadesAdmin.css';
import '../admin-shared.css';

const ICONOS_PREDEFINIDOS = ['🔬', '🫀', '🧠', '🦷', '👶', '👁️', '🦴', '🩺', '💉', '🫁', '🤰', '🦻', '🩻', '💊', '🏋️'];

function ModalEspecialidad({ modo, especialidad, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    nombre:      especialidad?.nombre      ?? '',
    descripcion: especialidad?.descripcion ?? '',
    precio_base: especialidad?.precio_base ?? '',
    icono:       especialidad?.icono       ?? '🔬',
    activa:      especialidad?.activa      ?? true,
  });
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.');
    setGuardando(true);
    try {
      await onGuardar(form);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onCerrar}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal__header">
          <h3>{modo === 'crear' ? 'Nueva especialidad' : 'Editar especialidad'}</h3>
          <button className="admin-modal__cerrar" onClick={onCerrar}>✕</button>
        </div>

        <div className="esp-modal-icono-selector">
          <label>Ícono</label>
          <div className="esp-iconos-grid">
            {ICONOS_PREDEFINIDOS.map(ic => (
              <button
                key={ic}
                className={`esp-icono-btn ${form.icono === ic ? 'esp-icono-btn--activo' : ''}`}
                onClick={() => setForm(prev => ({ ...prev, icono: ic }))}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-campo">
          <label>Nombre *</label>
          <input
            type="text"
            value={form.nombre}
            onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
            placeholder="Ej: Cardiología"
          />
        </div>

        <div className="admin-campo">
          <label>Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
            placeholder="Breve descripción de la especialidad…"
            rows={3}
          />
        </div>

        <div className="admin-campo">
          <label>Precio base (COP)</label>
          <input
            type="number"
            value={form.precio_base}
            onChange={e => setForm(prev => ({ ...prev, precio_base: e.target.value }))}
            placeholder="Ej: 80000"
            min="0"
          />
        </div>

        {modo === 'editar' && (
          <div className="admin-campo admin-campo--toggle">
            <label>Estado</label>
            <button
              className={`toggle-btn ${form.activa ? 'toggle-btn--activo' : ''}`}
              onClick={() => setForm(prev => ({ ...prev, activa: !prev.activa }))}
            >
              <span className="toggle-btn__dot" />
              {form.activa ? 'Activa' : 'Inactiva'}
            </button>
          </div>
        )}

        <div className="admin-modal__acciones">
          <button className="admin-modal__btn-cancelar" onClick={onCerrar}>Cancelar</button>
          <button className="admin-modal__btn-guardar" disabled={guardando} onClick={handleSubmit}>
            {guardando ? 'Guardando…' : modo === 'crear' ? 'Crear especialidad' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EspecialidadesAdmin() {
  const [especialidades, setEspecialidades] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [buscar,   setBuscar]   = useState('');
  const [modal,    setModal]    = useState(null); // null | { modo: 'crear'|'editar', esp: null|{} }

  useEffect(() => {
    api.get('/admin/especialidades')
      .then(data  => { setEspecialidades(data); setError(null); })
      .catch(()   => setError('No se pudieron cargar las especialidades.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleGuardar(form) {
    if (modal.modo === 'crear') {
      const nueva = await api.post('/admin/especialidades', form);
      setEspecialidades(prev => [...prev, nueva]);
    } else {
      const actualizada = await api.put(`/admin/especialidades/${modal.esp.id}`, form);
      setEspecialidades(prev =>
        prev.map(e => e.id === modal.esp.id ? { ...e, ...actualizada } : e)
      );
    }
    setModal(null);
  }

  const filtradas = especialidades.filter(e =>
    e.nombre.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <div className="especialidades-admin">
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Especialidades</h1>
          <p className="admin-modulo__subtitulo">Catálogo de especialidades médicas disponibles</p>
        </div>
        <button
          className="btn-admin-primario"
          onClick={() => setModal({ modo: 'crear', esp: null })}
        >
          + Nueva especialidad
        </button>
      </div>

      <div className="admin-filtros">
        <input
          className="admin-filtros__input"
          placeholder="🔍  Buscar especialidad…"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
        />
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="esp-grid">
        {loading
          ? Array(6).fill(0).map((_, i) => (
            <div key={i} className="esp-card esp-card--skeleton">
              <div className="skeleton-block" style={{ width: '52px', height: '52px', borderRadius: '16px' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-block" style={{ width: '70%', height: '14px', marginBottom: '8px' }} />
                <div className="skeleton-block" style={{ width: '50%', height: '12px' }} />
              </div>
            </div>
          ))
          : filtradas.length === 0
          ? (
            <div className="admin-vacio-full">
              <span>🔬</span>
              <p>No se encontraron especialidades.</p>
            </div>
          )
          : filtradas.map(e => (
            <div key={e.id} className={`esp-card ${!e.activa ? 'esp-card--inactiva' : ''}`}>
              <div className="esp-card__icono">{e.icono ?? '🔬'}</div>
              <div className="esp-card__info">
                <h3 className="esp-card__nombre">{e.nombre}</h3>
                {e.descripcion && <p className="esp-card__descripcion">{e.descripcion}</p>}
                {e.precio_base && (
                  <p className="esp-card__precio">
                    ${Number(e.precio_base).toLocaleString('es-CO')} COP
                  </p>
                )}
                <div className="esp-card__footer">
                  <span className={`badge ${e.activa ? 'badge--verde' : 'badge--gris'}`}>
                    {e.activa ? 'Activa' : 'Inactiva'}
                  </span>
                  <button
                    className="btn-tabla btn-tabla--editar"
                    onClick={() => setModal({ modo: 'editar', esp: e })}
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {modal && (
        <ModalEspecialidad
          modo={modal.modo}
          especialidad={modal.esp}
          onGuardar={handleGuardar}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}
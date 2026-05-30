// src/pages/admin/gestion-medicamentos/MedicamentosAdmin.jsx
import { useState, useEffect } from 'react';
import { api } from '../../../lib/apiClient';
import './MedicamentosAdmin.css';
import '../admin-shared.css';

const TIPOS = ['OTC', 'Rx', 'Controlado', 'Biológico', 'Genérico'];

const TIPO_BADGE = {
  'OTC':        'badge--verde',
  'Rx':         'badge--azul',
  'Controlado': 'badge--rojo',
  'Biológico':  'badge--morado',
  'Genérico':   'badge--gris',
};

function ModalMedicamento({ modo, medicamento, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    nombre:       medicamento?.nombre        ?? '',
    principio:    medicamento?.principio     ?? '',
    tipo:         medicamento?.tipo          ?? 'OTC',
    descripcion:  medicamento?.descripcion   ?? '',
    presentacion: medicamento?.presentacion  ?? '',
    activo:       medicamento?.activo        ?? true,
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
          <h3>{modo === 'crear' ? 'Nuevo medicamento' : 'Editar medicamento'}</h3>
          <button className="admin-modal__cerrar" onClick={onCerrar}>✕</button>
        </div>

        <div className="med-modal-grid">
          <div className="admin-campo">
            <label>Nombre comercial *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej: Ibuprofeno 400mg"
            />
          </div>
          <div className="admin-campo">
            <label>Principio activo</label>
            <input
              type="text"
              value={form.principio}
              onChange={e => setForm(prev => ({ ...prev, principio: e.target.value }))}
              placeholder="Ej: Ibuprofeno"
            />
          </div>
          <div className="admin-campo">
            <label>Tipo</label>
            <select value={form.tipo} onChange={e => setForm(prev => ({ ...prev, tipo: e.target.value }))}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="admin-campo">
            <label>Presentación</label>
            <input
              type="text"
              value={form.presentacion}
              onChange={e => setForm(prev => ({ ...prev, presentacion: e.target.value }))}
              placeholder="Ej: Caja x 20 tabletas"
            />
          </div>
          <div className="admin-campo admin-campo--full">
            <label>Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Indicaciones, contraindicaciones…"
              rows={3}
            />
          </div>
        </div>

        <div className="admin-modal__acciones">
          <button className="admin-modal__btn-cancelar" onClick={onCerrar}>Cancelar</button>
          <button className="admin-modal__btn-guardar" disabled={guardando} onClick={handleSubmit}>
            {guardando ? 'Guardando…' : modo === 'crear' ? 'Crear medicamento' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MedicamentosAdmin() {
  const [meds,     setMeds]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [buscar,   setBuscar]   = useState('');
  const [tipoFilt, setTipoFilt] = useState('');
  const [modal,    setModal]    = useState(null);

  useEffect(() => {
    api.get('/admin/medicamentos')
      .then(data  => { setMeds(data); setError(null); })
      .catch(()   => setError('No se pudieron cargar los medicamentos.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleGuardar(form) {
    if (modal.modo === 'crear') {
      const nuevo = await api.post('/admin/medicamentos', form);
      setMeds(prev => [nuevo, ...prev]);
    } else {
      const actualizado = await api.put(`/admin/medicamentos/${modal.med.id}`, form);
      setMeds(prev => prev.map(m => m.id === modal.med.id ? { ...m, ...actualizado } : m));
    }
    setModal(null);
  }

  const filtrados = meds.filter(m => {
    const coincideBuscar = !buscar ||
      m.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
      (m.principio ?? '').toLowerCase().includes(buscar.toLowerCase());
    const coincideTipo = !tipoFilt || m.tipo === tipoFilt;
    return coincideBuscar && coincideTipo;
  });

  return (
    <div className="meds-admin">
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Medicamentos</h1>
          <p className="admin-modulo__subtitulo">Catálogo de medicamentos del sistema</p>
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
          placeholder="🔍  Buscar por nombre o principio activo…"
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
            {loading
              ? Array(5).fill(0).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {Array(6).fill(0).map((_, j) => (
                    <td key={j}><div className="skeleton-cell" /></td>
                  ))}
                </tr>
              ))
              : filtrados.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="admin-vacio">
                    <span>💊</span>
                    <p>No se encontraron medicamentos.</p>
                  </td>
                </tr>
              )
              : filtrados.map(m => (
                <tr key={m.id} className={!m.activo ? 'admin-tabla__row--inactivo' : ''}>
                  <td>
                    <p className="admin-tabla__nombre">💊 {m.nombre}</p>
                  </td>
                  <td className="admin-tabla__meta">{m.principio ?? '—'}</td>
                  <td>
                    <span className={`badge ${TIPO_BADGE[m.tipo] ?? 'badge--gris'}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="admin-tabla__meta">{m.presentacion ?? '—'}</td>
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
            }
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
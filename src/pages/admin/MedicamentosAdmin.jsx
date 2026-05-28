// src/pages/admin/MedicamentosAdmin.jsx
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/apiClient';
import './MedicamentosAdmin.css';
import './admin-shared.css';

const FORM0 = {
  nombre_comercial: '', principio_activo: '', laboratorio: '',
  categoria: '', tipo: 'OTC', descripcion: '', indicaciones: '',
  contraindicaciones: '', presentaciones: '', registro_invima: '', imagen_url: '',
};

export default function MedicamentosAdmin() {
  const [meds,     setMeds]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [buscar,   setBuscar]   = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState(FORM0);
  const [editId,   setEditId]   = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);
  const [toggling,  setToggling]  = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (buscar.trim()) params.set('buscar', buscar.trim());
    if (filtroTipo)    params.set('tipo',   filtroTipo);
    api.get(`/medicamentos?${params.toString()}`)
      .then(data  => setMeds(data))
      .catch(()   => setError('Error al cargar medicamentos.'))
      .finally(() => setLoading(false));
  }, [buscar, filtroTipo]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  function abrirCrear() {
    setForm(FORM0); setEditId(null); setErrorForm(null); setModal('crear');
  }

  function abrirEditar(med) {
    setForm({
      nombre_comercial: med.nombre_comercial, principio_activo: med.principio_activo,
      laboratorio: med.laboratorio || '', categoria: med.categoria || '',
      tipo: med.tipo, descripcion: med.descripcion || '',
      indicaciones: med.indicaciones || '', contraindicaciones: med.contraindicaciones || '',
      presentaciones: med.presentaciones || '', registro_invima: med.registro_invima || '',
      imagen_url: med.imagen_url || '',
    });
    setEditId(med.id); setErrorForm(null); setModal('editar');
  }

  async function handleGuardar(e) {
    e.preventDefault(); setGuardando(true); setErrorForm(null);
    try {
      if (modal === 'crear') {
        const res = await api.post('/admin/medicamentos', form);
        setMeds(prev => [res.medicamento, ...prev]);
      } else {
        await api.put(`/admin/medicamentos/${editId}`, { ...form, activo: true });
        setMeds(prev => prev.map(m => m.id === editId ? { ...m, ...form } : m));
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
      await api.patch(`/admin/medicamentos/${id}/estado`);
      setMeds(prev => prev.map(m => m.id === id ? { ...m, activo: !m.activo } : m));
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(null);
    }
  }

  function campo(field, label, tipo = 'text', placeholder = '') {
    return (
      <div className="admin-campo">
        <label>{label}</label>
        <input type={tipo} value={form[field]} placeholder={placeholder}
          onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
      </div>
    );
  }

  function textarea(field, label, placeholder = '') {
    return (
      <div className="admin-campo admin-form-grid--full">
        <label>{label}</label>
        <textarea rows={2} value={form[field]} placeholder={placeholder}
          onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
      </div>
    );
  }

  return (
    <div className="medicamentos-admin">
      <div className="admin-modulo__cabecera">
        <div>
          <h1 className="admin-modulo__titulo">Medicamentos</h1>
          <p className="admin-modulo__subtitulo">Catálogo INVIMA — OTC y Rx</p>
        </div>
        <button className="btn-admin-primario" onClick={abrirCrear}>+ Nuevo medicamento</button>
      </div>

      <div className="admin-filtros">
        <input className="admin-filtros__input" placeholder="🔍  Buscar por nombre o principio activo…"
          value={buscar} onChange={e => setBuscar(e.target.value)} />
        <select className="admin-filtros__select" value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="OTC">OTC — Venta libre</option>
          <option value="Rx">Rx — Con receta</option>
        </select>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-tabla-wrap">
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>Medicamento</th>
              <th>Principio activo</th>
              <th>Laboratorio</th>
              <th>Tipo</th>
              <th>INVIMA</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(5).fill(0).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {Array(7).fill(0).map((_, j) => (
                    <td key={j}><div className="skeleton-cell" /></td>
                  ))}
                </tr>
              ))
              : meds.length === 0
              ? <tr><td colSpan={7} className="admin-vacio">No se encontraron medicamentos.</td></tr>
              : meds.map(m => (
                <tr key={m.id}>
                  <td><strong style={{ color: 'var(--melika-text-primary)' }}>{m.nombre_comercial}</strong></td>
                  <td style={{ fontSize: '13px' }}>{m.principio_activo}</td>
                  <td style={{ fontSize: '13px' }}>{m.laboratorio || '—'}</td>
                  <td>
                    <span className={`badge ${m.tipo === 'OTC' ? 'badge--verde' : 'badge--rojo'}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--melika-text-muted)' }}>
                    {m.registro_invima || '—'}
                  </td>
                  <td>
                    <span className={`badge ${m.activo ? 'badge--verde' : 'badge--rojo'}`}>
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="tabla-acciones">
                      <button className="btn-tabla btn-tabla--editar" onClick={() => abrirEditar(m)}>Editar</button>
                      <button
                        className={`btn-tabla ${m.activo ? 'btn-tabla--warning' : 'btn-tabla--success'}`}
                        disabled={toggling === m.id}
                        onClick={() => handleToggle(m.id)}
                      >
                        {toggling === m.id ? '…' : m.activo ? 'Desactivar' : 'Activar'}
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
          <div className="admin-modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Nuevo medicamento' : 'Editar medicamento'}</h3>
            {errorForm && <div className="admin-error">{errorForm}</div>}
            <form onSubmit={handleGuardar}>
              <div className="admin-form-grid">
                <div className="admin-campo admin-form-grid--full">
                  <label>Nombre comercial *</label>
                  <input value={form.nombre_comercial} required
                    onChange={e => setForm(p => ({ ...p, nombre_comercial: e.target.value }))}
                    placeholder="Ej: Acetaminofén 500mg" />
                </div>
                <div className="admin-campo">
                  <label>Principio activo *</label>
                  <input value={form.principio_activo} required
                    onChange={e => setForm(p => ({ ...p, principio_activo: e.target.value }))} />
                </div>
                {campo('laboratorio',    'Laboratorio')}
                {campo('categoria',      'Categoría')}
                <div className="admin-campo">
                  <label>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                    <option value="OTC">OTC — Venta libre</option>
                    <option value="Rx">Rx — Con receta</option>
                  </select>
                </div>
                {campo('registro_invima', 'Registro INVIMA')}
                {campo('presentaciones',  'Presentaciones', 'text', 'Ej: Tabletas 500mg, Jarabe 150mg/5ml')}
                {campo('imagen_url',      'URL imagen')}
                {textarea('indicaciones',       'Indicaciones')}
                {textarea('contraindicaciones', 'Contraindicaciones')}
                {textarea('descripcion',        'Descripción')}
              </div>
              <div className="admin-modal__acciones">
                <button type="button" className="admin-modal__btn-cancelar" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="admin-modal__btn-guardar" disabled={guardando}>
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
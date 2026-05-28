import { useState, useEffect } from "react";
import { api } from "../../lib/apiClient";
import "./medicosAdmin.css";
import "./admin-shared.css";

const FORM_INICIAL = {
  nombre: "",
  primer_apellido: "",
  email: "",
  numero_registro: "",
  id_especialidad: "",
  tarifa: "",
  acepta_teleconsulta: true,
  acepta_presencial: true,
  biografia: "",
  anos_experiencia: 0,
};

export default function MedicosAdmin() {
  const [medicos, setMedicos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal crear / editar
  const [modal, setModal] = useState(null); // null | 'crear' | 'editar'
  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);

  // Desactivar
  const [desactivando, setDesactivando] = useState(null);

  // ✅ Función declarada ANTES del useEffect que la consume
  function cargarDatos() {
    setLoading(true);
    setError(null);

    Promise.all([api.get("/medicos"), api.get("/especialidades")])
      .then(([med, esp]) => {
        setMedicos(med);
        setEspecialidades(esp);
      })
      .catch(() => setError("No se pudieron cargar los datos."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function abrirCrear() {
    setForm(FORM_INICIAL);
    setEditandoId(null);
    setErrorForm(null);
    setModal("crear");
  }

  function abrirEditar(medico) {
    setForm({
      nombre: medico.nombre,
      primer_apellido: medico.primer_apellido,
      email: medico.email || "",
      numero_registro: medico.numero_registro,
      id_especialidad: medico.id_especialidad,
      tarifa: medico.tarifa,
      acepta_teleconsulta: medico.acepta_teleconsulta,
      acepta_presencial: medico.acepta_presencial,
      biografia: medico.biografia || "",
      anos_experiencia: medico.anos_experiencia || 0,
    });
    setEditandoId(medico.id);
    setErrorForm(null);
    setModal("editar");
  }

  function cerrarModal() {
    setModal(null);
    setForm(FORM_INICIAL);
    setEditandoId(null);
    setErrorForm(null);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleGuardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);

    try {
      if (modal === "crear") {
        const res = await api.post("/medicos", form);
        setMedicos((prev) => [res.medico, ...prev]);
      } else {
        const res = await api.put(`/medicos/${editandoId}`, form);
        setMedicos((prev) =>
          prev.map((m) => (m.id === editandoId ? { ...m, ...res.medico } : m)),
        );
      }
      cerrarModal();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleDesactivar(id) {
    setDesactivando(id);
    try {
      await api.patch(`/medicos/${id}/estado`); // ← nuevo endpoint
      setMedicos((prev) =>
        prev.map((m) => (m.id === id ? { ...m, activo: !m.activo } : m)),
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setDesactivando(null);
    }
  }

  return (
    <main className="medicos-admin">
      <div className="contenedor">
        <div className="medicos-admin__cabecera">
          <h1 className="medicos-admin__titulo">Gestión de médicos</h1>
          <button className="btn-primario" onClick={abrirCrear}>
            + Agregar médico
          </button>
        </div>

        {error && <div className="medicos-error">{error}</div>}

        <div className="medicos-tabla-wrap">
          <table className="medicos-tabla">
            <thead>
              <tr>
                <th>Médico</th>
                <th>Especialidad</th>
                <th>Registro</th>
                <th>Tarifa</th>
                <th>Teleconsulta</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="skeleton-fila">
                      {Array(7)
                        .fill(0)
                        .map((_, j) => (
                          <td key={j}>
                            <div
                              className="skeleton-celda"
                              style={{ width: j === 0 ? "140px" : "80px" }}
                            />
                          </td>
                        ))}
                    </tr>
                  ))
              ) : medicos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="medicos-vacio">
                    No hay médicos registrados.
                  </td>
                </tr>
              ) : (
                medicos.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="medico-nombre-celda">
                        <strong>
                          Dr(a). {m.nombre} {m.primer_apellido}
                        </strong>
                        <span>{m.email}</span>
                      </div>
                    </td>
                    <td>{m.especialidad}</td>
                    <td>{m.numero_registro}</td>
                    <td>${Number(m.tarifa).toLocaleString("es-CO")} COP</td>
                    <td>{m.acepta_teleconsulta ? "✓ Sí" : "— No"}</td>
                    <td>
                      <span
                        className={m.activo ? "badge-activo" : "badge-inactivo"}
                      >
                        {m.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className="tabla-acciones">
                        <button
                          className="btn-editar"
                          onClick={() => abrirEditar(m)}
                        >
                          Editar
                        </button>
                        {m.activo && (
                          <button
                            className="btn-desactivar"
                            disabled={desactivando === m.id}
                            onClick={() => handleDesactivar(m.id)}
                          >
                            {desactivando === m.id ? "…" : "Desactivar"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear / editar */}
      {modal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()}>
            <h3>{modal === "crear" ? "Agregar médico" : "Editar médico"}</h3>

            {errorForm && (
              <div
                className="medicos-error"
                style={{ marginBottom: "var(--space-4)" }}
              >
                {errorForm}
              </div>
            )}

            <form onSubmit={handleGuardar}>
              <div className="form-grid">
                <div className="campo">
                  <label>Nombre</label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Nombre del médico"
                    required
                  />
                </div>
                <div className="campo">
                  <label>Apellido</label>
                  <input
                    name="primer_apellido"
                    value={form.primer_apellido}
                    onChange={handleChange}
                    placeholder="Apellido"
                    required
                  />
                </div>

                {modal === "crear" && (
                  <div className="campo form-grid--full">
                    <label>Correo electrónico</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="correo@ejemplo.com"
                      required
                    />
                  </div>
                )}

                <div className="campo">
                  <label>Número de registro</label>
                  <input
                    name="numero_registro"
                    value={form.numero_registro}
                    onChange={handleChange}
                    placeholder="REG-001"
                    required
                  />
                </div>
                <div className="campo">
                  <label>Especialidad</label>
                  <select
                    name="id_especialidad"
                    value={form.id_especialidad}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {especialidades.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label>Tarifa (COP)</label>
                  <input
                    type="number"
                    name="tarifa"
                    value={form.tarifa}
                    onChange={handleChange}
                    placeholder="80000"
                    min="0"
                    required
                  />
                </div>
                <div className="campo">
                  <label>Años de experiencia</label>
                  <input
                    type="number"
                    name="anos_experiencia"
                    value={form.anos_experiencia}
                    onChange={handleChange}
                    min="0"
                  />
                </div>

                <div className="campo form-grid--full">
                  <label>Biografía (opcional)</label>
                  <textarea
                    name="biografia"
                    value={form.biografia}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Breve descripción del médico…"
                  />
                </div>

                <label className="campo-check">
                  <input
                    type="checkbox"
                    name="acepta_teleconsulta"
                    checked={form.acepta_teleconsulta}
                    onChange={handleChange}
                  />
                  Acepta teleconsulta
                </label>
                <label className="campo-check">
                  <input
                    type="checkbox"
                    name="acepta_presencial"
                    checked={form.acepta_presencial}
                    onChange={handleChange}
                  />
                  Acepta presencial
                </label>
              </div>

              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-cancelar-modal"
                  onClick={cerrarModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-guardar"
                  disabled={guardando}
                >
                  {guardando ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

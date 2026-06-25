
// MELIKA — Plantilla PDF profesional de Historia Clínica
// Cumple: Resolución 1995/1999 · Ley 2015/2020 · Estándar CIE-10

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// ─── Paleta corporativa MELIKA para el PDF ────────────────────────────────────
const AZUL_900  = '#0B1A36';
const AZUL_700  = '#1A3A8F';
const AZUL_200  = '#BFCFEE';
const AZUL_50   = '#EEF3FC';
const CORAL     = '#E8856A';
const GRIS_TEXT = '#4A5978';
const GRIS_MUT  = '#8A9BBE';
const BLANCO    = '#FFFFFF';

// ─── Estilos del documento PDF ────────────────────────────────────────────────
const estilos = StyleSheet.create({
  pagina: {
    fontFamily: 'Helvetica',
    backgroundColor: BLANCO,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 42,
    fontSize: 9,
    color: AZUL_900,
    lineHeight: 1.5,
  },

  // Encabezado institucional
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: CORAL,
  },
  encabezado__logo: {
    flexDirection: 'column',
  },
  encabezado__marca: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: AZUL_900,
    letterSpacing: 1,
  },
  encabezado__marca_span: {
    color: CORAL,
  },
  encabezado__subtitulo: {
    fontSize: 8,
    color: GRIS_TEXT,
    marginTop: 2,
  },
  encabezado__meta: {
    alignItems: 'flex-end',
  },
  encabezado__tipo_doc: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: AZUL_700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  encabezado__num_historia: {
    fontSize: 8,
    color: GRIS_MUT,
    marginTop: 3,
  },
  encabezado__fecha: {
    fontSize: 8,
    color: GRIS_MUT,
    marginTop: 2,
  },

  // Bloques de sección
  seccion: {
    marginBottom: 14,
  },
  seccion__cabecera: {
    backgroundColor: AZUL_700,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  seccion__numero: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: CORAL,
    marginRight: 6,
  },
  seccion__titulo: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: BLANCO,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seccion__cuerpo: {
    paddingHorizontal: 4,
  },

  // Filas de datos
  fila: {
    flexDirection: 'row',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  campo: {
    flexDirection: 'row',
    marginRight: 20,
    marginBottom: 3,
    flex: 1,
    minWidth: '45%',
  },
  campo__etiqueta: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GRIS_TEXT,
    marginRight: 4,
    minWidth: 90,
  },
  campo__valor: {
    fontSize: 9,
    color: AZUL_900,
    flex: 1,
  },
  campo__valor_vacio: {
    fontSize: 9,
    color: GRIS_MUT,
    fontStyle: 'italic',
  },

  // Párrafo de texto largo
  parrafo: {
    fontSize: 9,
    color: AZUL_900,
    lineHeight: 1.6,
    marginBottom: 4,
    textAlign: 'justify',
  },
  parrafo__etiqueta: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GRIS_TEXT,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  parrafo_vacio: {
    fontSize: 9,
    color: GRIS_MUT,
    fontStyle: 'italic',
  },
  bloque_texto: {
    marginBottom: 8,
  },

  // Signos vitales — tabla compacta
  signos_grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  signo_card: {
    backgroundColor: AZUL_50,
    borderWidth: 1,
    borderColor: AZUL_200,
    borderRadius: 4,
    padding: 6,
    minWidth: '22%',
    flex: 1,
    alignItems: 'center',
  },
  signo_card__valor: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: AZUL_700,
  },
  signo_card__unidad: {
    fontSize: 7,
    color: GRIS_MUT,
  },
  signo_card__etiqueta: {
    fontSize: 7,
    color: GRIS_TEXT,
    marginTop: 2,
    textAlign: 'center',
  },
  signo_card__imc: {
    backgroundColor: '#E8F5EE',
    borderColor: '#1A7A52',
  },
  signo_card__imc_valor: {
    color: '#1A7A52',
  },

  // CIE-10 badge
  diagnostico_badge: {
    backgroundColor: AZUL_50,
    borderLeftWidth: 3,
    borderLeftColor: AZUL_700,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderRadius: 3,
  },
  diagnostico_cie10: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: AZUL_700,
    letterSpacing: 0.5,
  },
  diagnostico_descripcion: {
    fontSize: 9,
    color: AZUL_900,
    marginTop: 2,
    lineHeight: 1.5,
  },

  // Medicamentos — tabla
  tabla_header: {
    flexDirection: 'row',
    backgroundColor: AZUL_700,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 4,
  },
  tabla_col_header: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: BLANCO,
    textTransform: 'uppercase',
  },
  tabla_fila: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: AZUL_200,
  },
  tabla_fila_par: {
    backgroundColor: AZUL_50,
  },
  tabla_col: {
    fontSize: 8,
    color: AZUL_900,
  },

  // Alerta / incapacidad
  alerta_box: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#B45309',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alerta_texto: {
    fontSize: 9,
    color: '#92400E',
    fontFamily: 'Helvetica-Bold',
  },

  // Separador visual
  separador: {
    borderBottomWidth: 1,
    borderBottomColor: AZUL_200,
    marginVertical: 8,
  },

  // Sello de cierre legal
  cierre: {
    marginTop: 24,
    borderTopWidth: 2,
    borderTopColor: CORAL,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cierre__firma: {
    alignItems: 'center',
    flex: 1,
  },
  cierre__linea: {
    borderBottomWidth: 1,
    borderBottomColor: AZUL_900,
    width: 160,
    marginBottom: 4,
  },
  cierre__nombre: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: AZUL_900,
    textAlign: 'center',
  },
  cierre__datos: {
    fontSize: 7,
    color: GRIS_TEXT,
    textAlign: 'center',
    marginTop: 1,
  },
  cierre__sello: {
    fontSize: 7,
    color: GRIS_MUT,
    textAlign: 'right',
    flex: 1,
  },

  // Pie de página
  pie: {
    position: 'absolute',
    bottom: 24,
    left: 42,
    right: 42,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: AZUL_200,
    paddingTop: 6,
  },
  pie__texto: {
    fontSize: 7,
    color: GRIS_MUT,
  },
  pie__paginas: {
    fontSize: 7,
    color: GRIS_MUT,
  },

  // Nota de aclaración (banner diferenciador)
  banner_aclaracion: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#B45309',
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
  },
  banner_aclaracion__titulo: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#92400E',
    marginBottom: 3,
  },
  banner_aclaracion__desc: {
    fontSize: 8,
    color: '#78350F',
    lineHeight: 1.5,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function valorOGuion(valor) {
  return valor !== null && valor !== undefined && String(valor).trim() !== ''
    ? String(valor).trim()
    : '—';
}

function formatFechaColombia(fechaStr) {
  if (!fechaStr) return '—';
  const f = new Date(fechaStr + (fechaStr.includes('T') ? '' : 'T00:00:00'));
  return f.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const hoy    = new Date();
  const nac    = new Date(fechaNacimiento + 'T00:00:00');
  let edad     = hoy.getFullYear() - nac.getFullYear();
  const mes    = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function clasificarIMC(imc) {
  if (!imc) return null;
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25)   return 'Normal';
  if (imc < 30)   return 'Sobrepeso';
  return 'Obesidad';
}

// ─── Componente de bloque de antecedente (reutilizable) ──────────────────────
function BloqueTexto({ etiqueta, valor }) {
  return (
    <View style={estilos.bloque_texto}>
      <Text style={estilos.parrafo__etiqueta}>{etiqueta}:</Text>
      {valor ? (
        <Text style={estilos.parrafo}>{valor}</Text>
      ) : (
        <Text style={estilos.parrafo_vacio}>Sin registro</Text>
      )}
    </View>
  );
}

// ─── Componente signo vital ───────────────────────────────────────────────────
function SignoCard({ valor, unidad, etiqueta, esIMC }) {
  return (
    <View style={[estilos.signo_card, esIMC ? estilos.signo_card__imc : null]}>
      <Text style={[estilos.signo_card__valor, esIMC ? estilos.signo_card__imc_valor : null]}>
        {valor !== null && valor !== undefined ? String(valor) : '—'}
      </Text>
      {unidad ? <Text style={estilos.signo_card__unidad}>{unidad}</Text> : null}
      <Text style={estilos.signo_card__etiqueta}>{etiqueta}</Text>
    </View>
  );
}

// ─── Plantilla principal: Historia Clínica PDF ────────────────────────────────
export function PlantillaHistoriaPDF({ historia, aclaraciones = [], esAclaracion = false }) {
  if (!historia) return null;

  const edad = calcularEdad(historia.paciente_fecha_nac);
  const imcClasificacion = clasificarIMC(historia.imc);
  const fechaGeneracion  = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // Parsear medicamentos_recetados (puede ser string plano, objeto JSON o null)
  let medicamentosTexto = '';
  if (historia.medicamentos_recetados) {
    if (typeof historia.medicamentos_recetados === 'string') {
      medicamentosTexto = historia.medicamentos_recetados;
    } else if (historia.medicamentos_recetados?.texto) {
      medicamentosTexto = historia.medicamentos_recetados.texto;
    } else {
      medicamentosTexto = JSON.stringify(historia.medicamentos_recetados);
    }
  }

  return (
    <Document
      title={`HC-${historia.id} — ${historia.paciente_nombre} ${historia.paciente_apellido}`}
      author="MELIKA Salud"
      subject="Historia Clínica Electrónica"
      creator="MELIKA — Plataforma de Salud Digital"
    >
      <Page size="A4" style={estilos.pagina}>

        {/* ── Encabezado institucional ───────────────────────────────────── */}
        <View style={estilos.encabezado} fixed>
          <View style={estilos.encabezado__logo}>
            <Text style={estilos.encabezado__marca}>
              <Text style={estilos.encabezado__marca_span}>M</Text>ELIKA
            </Text>
            <Text style={estilos.encabezado__subtitulo}>
              Plataforma de Salud Digital · Caldas, Antioquia, Colombia
            </Text>
            <Text style={estilos.encabezado__subtitulo}>
              Resolución 1995/1999 · Ley 2015/2020
            </Text>
          </View>
          <View style={estilos.encabezado__meta}>
            <Text style={estilos.encabezado__tipo_doc}>
              {esAclaracion ? 'Nota de Aclaración' : 'Historia Clínica Electrónica'}
            </Text>
            <Text style={estilos.encabezado__num_historia}>
              No. HC-{historia.id}
            </Text>
            <Text style={estilos.encabezado__fecha}>
              Fecha de atención: {formatFechaColombia(historia.fecha_cita)}
            </Text>
            <Text style={estilos.encabezado__fecha}>
              Generado: {fechaGeneracion}
            </Text>
          </View>
        </View>

        {/* Banner si es nota de aclaración */}
        {esAclaracion && (
          <View style={estilos.banner_aclaracion}>
            <Text style={estilos.banner_aclaracion__titulo}>
              ⚠ NOTA DE ACLARACIÓN / EVOLUCIÓN
            </Text>
            <Text style={estilos.banner_aclaracion__desc}>
              Este documento es una corrección o ampliación del registro original HC-{historia.id_historia_original}.
              Por mandato de la Ley 2015 de 2020, el registro original permanece intacto e inalterable.
              Las correcciones son visibles inmediatamente en el expediente del paciente.
            </Text>
          </View>
        )}

        {/* ── BLOQUE 1: Identificación del usuario ──────────────────────── */}
        <View style={estilos.seccion}>
          <View style={estilos.seccion__cabecera}>
            <Text style={estilos.seccion__numero}>1.</Text>
            <Text style={estilos.seccion__titulo}>Identificación del Paciente</Text>
          </View>
          <View style={estilos.seccion__cuerpo}>
            <View style={estilos.fila}>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>Nombre completo:</Text>
                <Text style={estilos.campo__valor}>
                  {historia.paciente_nombre} {historia.paciente_apellido}
                </Text>
              </View>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>Documento:</Text>
                <Text style={estilos.campo__valor}>
                  {valorOGuion(historia.paciente_tipo_doc)} {valorOGuion(historia.paciente_num_doc)}
                </Text>
              </View>
            </View>
            <View style={estilos.fila}>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>Fecha de nacimiento:</Text>
                <Text style={estilos.campo__valor}>
                  {formatFechaColombia(historia.paciente_fecha_nac)}
                  {edad !== null ? ` (${edad} años)` : ''}
                </Text>
              </View>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>Sexo:</Text>
                <Text style={estilos.campo__valor}>{valorOGuion(historia.paciente_genero)}</Text>
              </View>
            </View>
            <View style={estilos.fila}>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>Dirección:</Text>
                <Text style={estilos.campo__valor}>{valorOGuion(historia.paciente_direccion)}</Text>
              </View>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>Municipio:</Text>
                <Text style={estilos.campo__valor}>{valorOGuion(historia.paciente_ciudad)}</Text>
              </View>
            </View>
            <View style={estilos.fila}>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>Teléfono:</Text>
                <Text style={estilos.campo__valor}>{valorOGuion(historia.paciente_telefono)}</Text>
              </View>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>EPS / Aseguradora:</Text>
                <Text style={estilos.campo__valor}>{valorOGuion(historia.eps_aseguradora)}</Text>
              </View>
            </View>
            {(historia.contacto_responsable_nombre || historia.contacto_responsable_telefono) && (
              <View style={estilos.fila}>
                <View style={estilos.campo}>
                  <Text style={estilos.campo__etiqueta}>Responsable:</Text>
                  <Text style={estilos.campo__valor}>
                    {valorOGuion(historia.contacto_responsable_nombre)}
                    {historia.contacto_responsable_telefono
                      ? ` · Tel: ${historia.contacto_responsable_telefono}`
                      : ''}
                  </Text>
                </View>
              </View>
            )}
            <View style={estilos.fila}>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>Tipo de consulta:</Text>
                <Text style={estilos.campo__valor}>
                  {historia.tipo_cita === 'teleconsulta' ? 'Teleconsulta' : 'Presencial'}
                </Text>
              </View>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>Especialidad:</Text>
                <Text style={estilos.campo__valor}>{valorOGuion(historia.especialidad)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── BLOQUE 2: Anamnesis ───────────────────────────────────────── */}
        <View style={estilos.seccion}>
          <View style={estilos.seccion__cabecera}>
            <Text style={estilos.seccion__numero}>2.</Text>
            <Text style={estilos.seccion__titulo}>Anamnesis</Text>
          </View>
          <View style={estilos.seccion__cuerpo}>
            <BloqueTexto etiqueta="Motivo de consulta (palabras del paciente)" valor={historia.motivo_consulta} />
            <BloqueTexto etiqueta="Enfermedad actual" valor={historia.anamnesis} />
            <View style={estilos.separador} />
            <Text style={[estilos.parrafo__etiqueta, { marginBottom: 4 }]}>ANTECEDENTES:</Text>
            <BloqueTexto etiqueta="Patológicos"             valor={historia.antecedentes_patologicos} />
            <BloqueTexto etiqueta="Quirúrgicos"             valor={historia.antecedentes_quirurgicos} />
            <BloqueTexto etiqueta="Alérgicos / Farmacológicos" valor={historia.antecedentes_alergicos} />
            <BloqueTexto etiqueta="Familiares"              valor={historia.antecedentes_familiares} />
            {historia.antecedentes_ginecoobstetricos && (
              <BloqueTexto etiqueta="Ginecoobstétricos" valor={historia.antecedentes_ginecoobstetricos} />
            )}
            <BloqueTexto etiqueta="Hábitos (tabaquismo, alcohol, actividad física)" valor={historia.habitos} />
          </View>
        </View>

        {/* ── BLOQUE 3: Examen físico ───────────────────────────────────── */}
        <View style={estilos.seccion}>
          <View style={estilos.seccion__cabecera}>
            <Text style={estilos.seccion__numero}>3.</Text>
            <Text style={estilos.seccion__titulo}>Examen Físico</Text>
          </View>
          <View style={estilos.seccion__cuerpo}>

            {/* Signos vitales como cards numéricas */}
            <Text style={[estilos.parrafo__etiqueta, { marginBottom: 6 }]}>SIGNOS VITALES:</Text>
            <View style={estilos.signos_grid}>
              <SignoCard
                valor={historia.tension_arterial_sistolica && historia.tension_arterial_diastolica
                  ? `${historia.tension_arterial_sistolica}/${historia.tension_arterial_diastolica}`
                  : null}
                unidad="mmHg"
                etiqueta="Tensión Arterial"
              />
              <SignoCard
                valor={historia.frecuencia_cardiaca}
                unidad="lpm"
                etiqueta="Frec. Cardíaca"
              />
              <SignoCard
                valor={historia.frecuencia_respiratoria}
                unidad="rpm"
                etiqueta="Frec. Respiratoria"
              />
              <SignoCard
                valor={historia.temperatura_corporal}
                unidad="°C"
                etiqueta="Temperatura"
              />
            </View>
            <View style={estilos.signos_grid}>
              <SignoCard valor={historia.peso_kg}   unidad="kg"   etiqueta="Peso" />
              <SignoCard valor={historia.talla_cm}  unidad="cm"   etiqueta="Talla" />
              <SignoCard
                valor={historia.imc ? historia.imc.toFixed(1) : null}
                unidad={imcClasificacion || 'kg/m²'}
                etiqueta="IMC"
                esIMC
              />
            </View>

            <View style={estilos.separador} />
            <BloqueTexto etiqueta="Exploración por sistemas" valor={historia.exploracion_por_sistemas} />
            {historia.examen_fisico && (
              <BloqueTexto etiqueta="Hallazgos adicionales" valor={historia.examen_fisico} />
            )}
          </View>
        </View>

        {/* ── BLOQUE 4: Diagnóstico CIE-10 ─────────────────────────────── */}
        <View style={estilos.seccion}>
          <View style={estilos.seccion__cabecera}>
            <Text style={estilos.seccion__numero}>4.</Text>
            <Text style={estilos.seccion__titulo}>Juicio Clínico — Diagnóstico CIE-10</Text>
          </View>
          <View style={estilos.seccion__cuerpo}>
            {historia.diagnostico_cie10 ? (
              <View style={estilos.diagnostico_badge}>
                <Text style={estilos.diagnostico_cie10}>{historia.diagnostico_cie10}</Text>
                <Text style={estilos.diagnostico_descripcion}>
                  {valorOGuion(historia.descripcion_diagnostico)}
                </Text>
              </View>
            ) : (
              <Text style={estilos.parrafo_vacio}>Diagnóstico pendiente de registro.</Text>
            )}
          </View>
        </View>

        {/* ── BLOQUE 5: Plan de manejo ──────────────────────────────────── */}
        <View style={estilos.seccion}>
          <View style={estilos.seccion__cabecera}>
            <Text style={estilos.seccion__numero}>5.</Text>
            <Text style={estilos.seccion__titulo}>Plan de Manejo / Conducta</Text>
          </View>
          <View style={estilos.seccion__cuerpo}>

            {/* Incapacidad */}
            {historia.incapacidad_dias > 0 && (
              <View style={estilos.alerta_box}>
                <Text style={estilos.alerta_texto}>
                  ⚕ INCAPACIDAD MÉDICA: {historia.incapacidad_dias} día(s) a partir de la fecha de consulta.
                </Text>
              </View>
            )}

            <BloqueTexto etiqueta="Plan de tratamiento" valor={historia.plan_tratamiento} />

            {/* Fórmula médica */}
            <Text style={[estilos.parrafo__etiqueta, { marginBottom: 4 }]}>FÓRMULA MÉDICA:</Text>
            {medicamentosTexto ? (
              <Text style={estilos.parrafo}>{medicamentosTexto}</Text>
            ) : (
              <Text style={estilos.parrafo_vacio}>No se prescribieron medicamentos.</Text>
            )}

            <View style={estilos.separador} />
            <BloqueTexto etiqueta="Órdenes médicas (laboratorios / imágenes)" valor={historia.ordenes_medicas} />
            <BloqueTexto etiqueta="Recomendaciones y signos de alarma"        valor={historia.recomendaciones} />
            {historia.observaciones && (
              <BloqueTexto etiqueta="Observaciones adicionales" valor={historia.observaciones} />
            )}
          </View>
        </View>

        {/* ── BLOQUE 6: Cierre legal ────────────────────────────────────── */}
        <View style={estilos.cierre}>
          <View style={estilos.cierre__firma}>
            <View style={estilos.cierre__linea} />
            <Text style={estilos.cierre__nombre}>
              {historia.medico_nombre_firma
                ? historia.medico_nombre_firma
                : `Dr(a). ${historia.medico_nombre} ${historia.medico_apellido}`}
            </Text>
            {historia.medico_cedula_firma && (
              <Text style={estilos.cierre__datos}>
                C.C. {historia.medico_cedula_firma}
              </Text>
            )}
            {historia.medico_rethus_firma && (
              <Text style={estilos.cierre__datos}>
                ReTHUS: {historia.medico_rethus_firma}
              </Text>
            )}
            <Text style={estilos.cierre__datos}>{historia.especialidad}</Text>
          </View>
          <Text style={estilos.cierre__sello}>
            Documento generado electrónicamente por{'\n'}
            MELIKA Plataforma de Salud Digital{'\n'}
            Caldas, Antioquia — Colombia{'\n'}
            {fechaGeneracion}
          </Text>
        </View>

        {/* Pie de página fijo */}
        <View style={estilos.pie} fixed>
          <Text style={estilos.pie__texto}>
            MELIKA Salud · Historia Clínica No. HC-{historia.id} · Confidencial — Reserva Legal
          </Text>
          <Text
            style={estilos.pie__paginas}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
}

// ─── Plantilla: Fórmula Médica (standalone) ───────────────────────────────────
export function PlantillaFormulaPDF({ historia }) {
  if (!historia) return null;

  const fechaGeneracion = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const edad = calcularEdad(historia.paciente_fecha_nac);

  let medicamentosTexto = '';
  if (historia.medicamentos_recetados) {
    if (typeof historia.medicamentos_recetados === 'string') {
      medicamentosTexto = historia.medicamentos_recetados;
    } else if (historia.medicamentos_recetados?.texto) {
      medicamentosTexto = historia.medicamentos_recetados.texto;
    }
  }

  return (
    <Document
      title={`Formula-${historia.id} — ${historia.paciente_nombre}`}
      author="MELIKA Salud"
      subject="Fórmula Médica"
    >
      <Page size="A5" style={estilos.pagina}>

        <View style={estilos.encabezado}>
          <View style={estilos.encabezado__logo}>
            <Text style={estilos.encabezado__marca}>
              <Text style={estilos.encabezado__marca_span}>M</Text>ELIKA
            </Text>
            <Text style={estilos.encabezado__subtitulo}>Plataforma de Salud Digital · Colombia</Text>
          </View>
          <View style={estilos.encabezado__meta}>
            <Text style={estilos.encabezado__tipo_doc}>Fórmula Médica</Text>
            <Text style={estilos.encabezado__num_historia}>Ref. HC-{historia.id}</Text>
            <Text style={estilos.encabezado__fecha}>{formatFechaColombia(historia.fecha_cita)}</Text>
          </View>
        </View>

        <View style={estilos.seccion}>
          <View style={estilos.seccion__cabecera}>
            <Text style={estilos.seccion__titulo}>Datos del Paciente</Text>
          </View>
          <View style={estilos.seccion__cuerpo}>
            <View style={estilos.fila}>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>Paciente:</Text>
                <Text style={estilos.campo__valor}>
                  {historia.paciente_nombre} {historia.paciente_apellido}
                </Text>
              </View>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>Doc.:</Text>
                <Text style={estilos.campo__valor}>
                  {valorOGuion(historia.paciente_tipo_doc)} {valorOGuion(historia.paciente_num_doc)}
                </Text>
              </View>
            </View>
            <View style={estilos.fila}>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>Edad:</Text>
                <Text style={estilos.campo__valor}>{edad !== null ? `${edad} años` : '—'}</Text>
              </View>
              <View style={estilos.campo}>
                <Text style={estilos.campo__etiqueta}>EPS:</Text>
                <Text style={estilos.campo__valor}>{valorOGuion(historia.eps_aseguradora)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={estilos.seccion}>
          <View style={estilos.seccion__cabecera}>
            <Text style={estilos.seccion__titulo}>Diagnóstico</Text>
          </View>
          <View style={estilos.seccion__cuerpo}>
            {historia.diagnostico_cie10 && (
              <View style={estilos.diagnostico_badge}>
                <Text style={estilos.diagnostico_cie10}>{historia.diagnostico_cie10}</Text>
                <Text style={estilos.diagnostico_descripcion}>
                  {valorOGuion(historia.descripcion_diagnostico)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={estilos.seccion}>
          <View style={estilos.seccion__cabecera}>
            <Text style={estilos.seccion__titulo}>Medicamentos Prescritos (Rx)</Text>
          </View>
          <View style={estilos.seccion__cuerpo}>
            <Text style={estilos.parrafo}>
              {medicamentosTexto || 'Sin prescripción de medicamentos en esta consulta.'}
            </Text>
          </View>
        </View>

        {historia.recomendaciones && (
          <View style={estilos.seccion}>
            <View style={estilos.seccion__cabecera}>
              <Text style={estilos.seccion__titulo}>Recomendaciones</Text>
            </View>
            <View style={estilos.seccion__cuerpo}>
              <Text style={estilos.parrafo}>{historia.recomendaciones}</Text>
            </View>
          </View>
        )}

        {historia.incapacidad_dias > 0 && (
          <View style={estilos.alerta_box}>
            <Text style={estilos.alerta_texto}>
              INCAPACIDAD: {historia.incapacidad_dias} día(s)
            </Text>
          </View>
        )}

        <View style={estilos.cierre}>
          <View style={estilos.cierre__firma}>
            <View style={estilos.cierre__linea} />
            <Text style={estilos.cierre__nombre}>
              {historia.medico_nombre_firma || `Dr(a). ${historia.medico_nombre} ${historia.medico_apellido}`}
            </Text>
            {historia.medico_rethus_firma && (
              <Text style={estilos.cierre__datos}>ReTHUS: {historia.medico_rethus_firma}</Text>
            )}
            <Text style={estilos.cierre__datos}>{historia.especialidad}</Text>
          </View>
          <Text style={estilos.cierre__sello}>{fechaGeneracion}</Text>
        </View>

      </Page>
    </Document>
  );
}
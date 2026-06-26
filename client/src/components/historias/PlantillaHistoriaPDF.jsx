// client/src/components/historias/PlantillaHistoriaPDF.jsx
// MELIKA — Plantillas PDF vectoriales
// Usa @react-pdf/renderer (motor interno con objetos JS, no CSS externo)
// Cumple: Resolución 1995/1999 · Ley 2015/2020 — Normativa colombiana de HC

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

// ─── Paleta de colores MELIKA para PDF ───────────────────────────────────────
const COLOR = {
  azulPrimario: '#0B1A36',
  azulMedio:    '#1E3A6E',
  azulClaro:    '#D9E4F7',
  azulPale:     '#F0F5FF',
  acento:       '#E8856A',
  verde:        '#1A7A52',
  verdeClaro:   '#D1FAE5',
  grisTexto:    '#374151',
  grisMuted:    '#6B7280',
  grisLinea:    '#E5E7EB',
  blanco:       '#FFFFFF',
  negro:        '#111827',
};

// ─── Estilos base ─────────────────────────────────────────────────────────────
const base = StyleSheet.create({

  pagina: {
    fontFamily:      'Helvetica',
    fontSize:        9,
    color:           COLOR.grisTexto,
    backgroundColor: COLOR.blanco,
    paddingTop:      36,
    paddingBottom:   52,
    paddingLeft:     44,
    paddingRight:    44,
  },

  // Encabezado institucional
  encabezado: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-start',
    marginBottom:      16,
    paddingBottom:     10,
    borderBottomWidth: 2,
    borderBottomColor: COLOR.azulPrimario,
  },
  encabezadoIzq: {
    flexDirection: 'column',
    gap:           3,
  },
  logoTexto: {
    fontSize:      22,
    fontFamily:    'Helvetica-Bold',
    color:         COLOR.azulPrimario,
    letterSpacing: 2,
  },
  logoAccento: {
    color: COLOR.acento,
  },
  encabezadoSlogan: {
    fontSize:  8,
    color:     COLOR.grisMuted,
    marginTop: 2,
  },
  encabezadoDer: {
    alignItems:    'flex-end',
    flexDirection: 'column',
    gap:           3,
  },
  encabezadoTipoDoc: {
    fontSize:          9,
    fontFamily:        'Helvetica-Bold',
    color:             COLOR.blanco,
    backgroundColor:   COLOR.azulMedio,
    paddingVertical:   3,
    paddingHorizontal: 8,
    borderRadius:      4,
    textTransform:     'uppercase',
  },
  encabezadoFecha: {
    fontSize: 8,
    color:    COLOR.grisMuted,
  },
  encabezadoConsecutivo: {
    fontSize:  7,
    color:     COLOR.grisMuted,
    marginTop: 2,
  },

  // Sección / bloque
  seccion: {
    marginBottom: 10,
  },
  seccionTitulo: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    marginBottom:      6,
    paddingBottom:     4,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.azulClaro,
  },
  seccionNumero: {
    fontSize:          8,
    fontFamily:        'Helvetica-Bold',
    color:             COLOR.blanco,
    backgroundColor:   COLOR.azulMedio,
    width:             16,
    height:            16,
    borderRadius:      8,
    textAlign:         'center',
    paddingTop:        3,
  },
  seccionLabel: {
    fontSize:      10,
    fontFamily:    'Helvetica-Bold',
    color:         COLOR.azulPrimario,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Campo etiqueta / valor
  campoFila: {
    flexDirection: 'row',
    gap:           4,
    marginBottom:  4,
  },
  campoEtiqueta: {
    fontSize:   8,
    fontFamily: 'Helvetica-Bold',
    color:      COLOR.grisMuted,
    width:      110,
    flexShrink: 0,
  },
  campoValor: {
    fontSize:   9,
    color:      COLOR.negro,
    flex:       1,
    lineHeight: 1.4,
  },

  // Grid 2 columnas
  grid2: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           0,
  },
  grid2Item: {
    width:        '50%',
    paddingRight: 8,
    marginBottom: 4,
  },

  // Signos vitales
  signosGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    marginBottom:  6,
  },
  signoCard: {
    backgroundColor:   COLOR.azulPale,
    borderRadius:      6,
    paddingVertical:   6,
    paddingHorizontal: 10,
    alignItems:        'center',
    minWidth:          60,
  },
  signoValor: {
    fontSize:   11,
    fontFamily: 'Helvetica-Bold',
    color:      COLOR.azulPrimario,
  },
  signoUnidad: {
    fontSize:  7,
    color:     COLOR.grisMuted,
    marginTop: 1,
  },
  signoLabel: {
    fontSize:      7,
    color:         COLOR.azulMedio,
    marginTop:     2,
    fontFamily:    'Helvetica-Bold',
    textTransform: 'uppercase',
  },

  // CIE-10
  cie10Fila: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    gap:               8,
    backgroundColor:   COLOR.azulPale,
    borderRadius:      6,
    padding:           8,
    marginBottom:      4,
  },
  cie10Codigo: {
    fontSize:          10,
    fontFamily:        'Helvetica-Bold',
    color:             COLOR.azulMedio,
    backgroundColor:   COLOR.azulClaro,
    paddingVertical:   3,
    paddingHorizontal: 6,
    borderRadius:      4,
    flexShrink:        0,
  },
  cie10Desc: {
    fontSize:   9,
    color:      COLOR.grisTexto,
    flex:       1,
    lineHeight: 1.4,
  },

  // Medicamentos
  medicamentoBox: {
    backgroundColor: COLOR.verdeClaro,
    borderRadius:    6,
    padding:         8,
    marginBottom:    4,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.verde,
  },
  medicamentoLabel: {
    fontSize:      8,
    fontFamily:    'Helvetica-Bold',
    color:         COLOR.verde,
    marginBottom:  3,
    textTransform: 'uppercase',
  },
  medicamentoTexto: {
    fontSize:   9,
    color:      COLOR.grisTexto,
    lineHeight: 1.5,
  },

  // Incapacidad
  incapacidadBox: {
    backgroundColor: '#FEF9C3',
    borderRadius:    6,
    padding:         8,
    marginBottom:    4,
    borderLeftWidth: 3,
    borderLeftColor: '#CA8A04',
  },
  incapacidadTexto: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      '#854D0E',
  },

  // Bloque de texto largo
  textoBloque: {
    fontSize:        9,
    color:           COLOR.negro,
    lineHeight:      1.5,
    backgroundColor: COLOR.azulPale,
    borderRadius:    4,
    padding:         6,
    marginBottom:    4,
  },

  // Cierre legal / Firma
  cierreBox: {
    marginTop:         10,
    paddingTop:        10,
    borderTopWidth:    1,
    borderTopColor:    COLOR.azulClaro,
    alignItems:        'flex-end',
  },
  firmaLinea: {
    width:             160,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.azulMedio,
    marginBottom:      4,
  },
  firmaNombre: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      COLOR.azulPrimario,
    textAlign:  'right',
  },
  firmaDato: {
    fontSize:  8,
    color:     COLOR.grisMuted,
    textAlign: 'right',
    marginTop: 2,
  },

  // Aclaraciones
  aclaracionBox: {
    backgroundColor: '#FFFBEB',
    borderRadius:    6,
    padding:         8,
    marginBottom:    6,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  aclaracionEncabezado: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:   5,
  },
  aclaracionTipo: {
    fontSize:      8,
    fontFamily:    'Helvetica-Bold',
    color:         '#B45309',
    textTransform: 'uppercase',
  },
  aclaracionFecha: {
    fontSize: 8,
    color:    COLOR.grisMuted,
  },
  aclaracionEtiqueta: {
    fontSize:   8,
    fontFamily: 'Helvetica-Bold',
    color:      '#92400E',
    marginBottom: 2,
  },
  aclaracionTexto: {
    fontSize:   9,
    color:      COLOR.grisTexto,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  aclaracionFirma: {
    fontSize:  8,
    color:     COLOR.grisMuted,
    textAlign: 'right',
    marginTop: 4,
  },

  // Pie de página
  piePagina: {
    position:       'absolute',
    bottom:         20,
    left:           44,
    right:          44,
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingTop:     6,
    borderTopWidth: 1,
    borderTopColor: COLOR.grisLinea,
  },
  pieTexto: {
    fontSize: 7,
    color:    COLOR.grisMuted,
  },
  pieNumeroPagina: {
    fontSize: 7,
    color:    COLOR.grisMuted,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(fechaStr) {
  if (!fechaStr) return '—';
  return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function calcularEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy  = new Date();
  const nac  = new Date(fechaNac);
  let edad   = hoy.getFullYear() - nac.getFullYear();
  const mes  = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function extraerTextoMedicamentos(campo) {
  if (!campo) return null;
  if (typeof campo === 'string') return campo;
  if (typeof campo === 'object') return campo.texto || JSON.stringify(campo);
  return null;
}

// ─── Componentes reutilizables ────────────────────────────────────────────────

function Campo({ etiqueta, valor }) {
  if (valor === null || valor === undefined || valor === '') return null;
  return (
    <View style={base.campoFila}>
      <Text style={base.campoEtiqueta}>{etiqueta}:</Text>
      <Text style={base.campoValor}>{String(valor)}</Text>
    </View>
  );
}

function Seccion({ numero, titulo, children }) {
  return (
    <View style={base.seccion}>
      <View style={base.seccionTitulo}>
        {numero && <Text style={base.seccionNumero}>{numero}</Text>}
        <Text style={base.seccionLabel}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

function Encabezado({ tipoDocumento, historia }) {
  const fechaEmision = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <View style={base.encabezado} fixed>
      <View style={base.encabezadoIzq}>
        <Text style={base.logoTexto}>
          <Text style={base.logoAccento}>M</Text>ELIKA
        </Text>
        <Text style={base.encabezadoSlogan}>
          Plataforma de Salud Digital · Caldas, Antioquia, Colombia
        </Text>
        <Text style={base.encabezadoSlogan}>
          Res. 1995/1999 · Ley 2015/2020
        </Text>
      </View>
      <View style={base.encabezadoDer}>
        <Text style={base.encabezadoTipoDoc}>{tipoDocumento}</Text>
        <Text style={base.encabezadoFecha}>Emitido: {fechaEmision}</Text>
        {historia?.id && (
          <Text style={base.encabezadoConsecutivo}>
            Consecutivo: HC-{String(historia.id).padStart(6, '0')}
          </Text>
        )}
        {historia?.especialidad && (
          <Text style={base.encabezadoConsecutivo}>{historia.especialidad}</Text>
        )}
      </View>
    </View>
  );
}

function PiePagina() {
  return (
    <View style={base.piePagina} fixed>
      <Text style={base.pieTexto}>
        MELIKA · Documento de uso médico confidencial · Reserva legal Ley 23/1981
      </Text>
      <Text
        style={base.pieNumeroPagina}
        render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANTILLA 1: Historia Clínica Completa
// ─────────────────────────────────────────────────────────────────────────────

export function PlantillaHistoriaPDF({ historia, aclaraciones = [] }) {
  if (!historia) return null;

  const edad      = calcularEdad(historia.paciente_fecha_nac);
  const medTexto  = extraerTextoMedicamentos(historia.medicamentos_recetados);
  const haySignos = historia.tension_arterial_sistolica
                 || historia.frecuencia_cardiaca
                 || historia.peso_kg
                 || historia.temperatura_corporal;

  return (
    <Document
      title={`HC-${historia.id} — ${historia.paciente_nombre} ${historia.paciente_apellido}`}
      author="MELIKA Salud Digital"
      subject="Historia Clínica Electrónica"
      creator="MELIKA — Resolución 1995/1999"
    >
      <Page size="LETTER" style={base.pagina}>

        <Encabezado tipoDocumento="Historia Clínica" historia={historia} />

        {/* ── BLOQUE 1 — Identificación ── */}
        <Seccion numero="1" titulo="Identificación del Paciente">
          <View style={base.grid2}>
            <View style={base.grid2Item}>
              <Campo
                etiqueta="Paciente"
                valor={`${historia.paciente_nombre} ${historia.paciente_apellido}`}
              />
            </View>
            <View style={base.grid2Item}>
              <Campo
                etiqueta="Documento"
                valor={`${historia.paciente_tipo_doc || 'CC'} ${historia.paciente_num_doc}`}
              />
            </View>
            <View style={base.grid2Item}>
              <Campo etiqueta="Fecha de nacimiento" valor={formatFecha(historia.paciente_fecha_nac)} />
            </View>
            <View style={base.grid2Item}>
              <Campo etiqueta="Edad" valor={edad !== null ? `${edad} años` : null} />
            </View>
            <View style={base.grid2Item}>
              <Campo etiqueta="Sexo" valor={historia.paciente_genero} />
            </View>
            <View style={base.grid2Item}>
              <Campo etiqueta="Teléfono" valor={historia.paciente_telefono} />
            </View>
            <View style={base.grid2Item}>
              <Campo etiqueta="Dirección" valor={historia.paciente_direccion} />
            </View>
            <View style={base.grid2Item}>
              <Campo etiqueta="Municipio" valor={historia.paciente_ciudad || 'Caldas, Antioquia'} />
            </View>
            <View style={base.grid2Item}>
              <Campo etiqueta="EPS / Aseguradora" valor={historia.eps_aseguradora} />
            </View>
            <View style={base.grid2Item}>
              <Campo
                etiqueta="Tipo de consulta"
                valor={historia.tipo_cita === 'teleconsulta' ? 'Teleconsulta' : 'Presencial'}
              />
            </View>
            <View style={base.grid2Item}>
              <Campo etiqueta="Fecha de la cita" valor={formatFecha(historia.fecha_cita)} />
            </View>
            <View style={base.grid2Item}>
              <Campo etiqueta="Hora" valor={historia.hora_inicio?.substring(0, 5)} />
            </View>
          </View>

          {(historia.contacto_responsable_nombre || historia.contacto_responsable_telefono) && (
            <View style={base.campoFila}>
              <Text style={base.campoEtiqueta}>Contacto responsable:</Text>
              <Text style={base.campoValor}>
                {historia.contacto_responsable_nombre}
                {historia.contacto_responsable_telefono
                  ? ` · Tel: ${historia.contacto_responsable_telefono}`
                  : ''}
              </Text>
            </View>
          )}
        </Seccion>

        {/* ── BLOQUE 2 — Anamnesis ── */}
        <Seccion numero="2" titulo="Anamnesis">
          {historia.motivo_consulta && (
            <>
              <Text style={[base.campoEtiqueta, { marginBottom: 3 }]}>
                Motivo de consulta (en palabras del paciente):
              </Text>
              <Text style={base.textoBloque}>{historia.motivo_consulta}</Text>
            </>
          )}
          {historia.anamnesis && (
            <>
              <Text style={[base.campoEtiqueta, { marginBottom: 3, marginTop: 4 }]}>
                Enfermedad actual:
              </Text>
              <Text style={base.textoBloque}>{historia.anamnesis}</Text>
            </>
          )}
          {(historia.antecedentes_patologicos
            || historia.antecedentes_quirurgicos
            || historia.antecedentes_alergicos
            || historia.antecedentes_familiares
            || historia.antecedentes_ginecoobstetricos
            || historia.habitos) && (
            <View style={{ marginTop: 4 }}>
              <Text style={[base.campoEtiqueta, { marginBottom: 4 }]}>Antecedentes:</Text>
              <Campo etiqueta="  Patológicos"          valor={historia.antecedentes_patologicos} />
              <Campo etiqueta="  Quirúrgicos"          valor={historia.antecedentes_quirurgicos} />
              <Campo etiqueta="  Alérgicos/farmacol."  valor={historia.antecedentes_alergicos} />
              <Campo etiqueta="  Familiares"           valor={historia.antecedentes_familiares} />
              <Campo etiqueta="  Ginecoobstétricos"    valor={historia.antecedentes_ginecoobstetricos} />
              <Campo etiqueta="  Hábitos"              valor={historia.habitos} />
            </View>
          )}
        </Seccion>

        {/* ── BLOQUE 3 — Examen físico ── */}
        {haySignos && (
          <Seccion numero="3" titulo="Examen Físico — Signos Vitales">
            <View style={base.signosGrid}>
              {historia.tension_arterial_sistolica && (
                <View style={base.signoCard}>
                  <Text style={base.signoValor}>
                    {historia.tension_arterial_sistolica}/{historia.tension_arterial_diastolica}
                  </Text>
                  <Text style={base.signoUnidad}>mmHg</Text>
                  <Text style={base.signoLabel}>Tensión Arterial</Text>
                </View>
              )}
              {historia.frecuencia_cardiaca && (
                <View style={base.signoCard}>
                  <Text style={base.signoValor}>{historia.frecuencia_cardiaca}</Text>
                  <Text style={base.signoUnidad}>lpm</Text>
                  <Text style={base.signoLabel}>Frec. Cardíaca</Text>
                </View>
              )}
              {historia.frecuencia_respiratoria && (
                <View style={base.signoCard}>
                  <Text style={base.signoValor}>{historia.frecuencia_respiratoria}</Text>
                  <Text style={base.signoUnidad}>rpm</Text>
                  <Text style={base.signoLabel}>Frec. Respiratoria</Text>
                </View>
              )}
              {historia.temperatura_corporal && (
                <View style={base.signoCard}>
                  <Text style={base.signoValor}>{historia.temperatura_corporal}</Text>
                  <Text style={base.signoUnidad}>°C</Text>
                  <Text style={base.signoLabel}>Temperatura</Text>
                </View>
              )}
              {historia.peso_kg && (
                <View style={base.signoCard}>
                  <Text style={base.signoValor}>{historia.peso_kg}</Text>
                  <Text style={base.signoUnidad}>kg</Text>
                  <Text style={base.signoLabel}>Peso</Text>
                </View>
              )}
              {historia.talla_cm && (
                <View style={base.signoCard}>
                  <Text style={base.signoValor}>{historia.talla_cm}</Text>
                  <Text style={base.signoUnidad}>cm</Text>
                  <Text style={base.signoLabel}>Talla</Text>
                </View>
              )}
              {historia.imc && (
                <View style={[base.signoCard, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={[base.signoValor, { color: '#5B21B6' }]}>
                    {Number(historia.imc).toFixed(1)}
                  </Text>
                  <Text style={base.signoUnidad}>kg/m²</Text>
                  <Text style={[base.signoLabel, { color: '#5B21B6' }]}>IMC</Text>
                </View>
              )}
            </View>
            {historia.exploracion_por_sistemas && (
              <>
                <Text style={[base.campoEtiqueta, { marginBottom: 3 }]}>
                  Exploración por sistemas:
                </Text>
                <Text style={base.textoBloque}>{historia.exploracion_por_sistemas}</Text>
              </>
            )}
            {historia.examen_fisico && (
              <>
                <Text style={[base.campoEtiqueta, { marginBottom: 3, marginTop: 4 }]}>
                  Hallazgos al examen físico:
                </Text>
                <Text style={base.textoBloque}>{historia.examen_fisico}</Text>
              </>
            )}
          </Seccion>
        )}

        {/* ── BLOQUE 4 — Diagnóstico CIE-10 ── */}
        {historia.diagnostico_cie10 && (
          <Seccion numero="4" titulo="Juicio Clínico — Diagnóstico CIE-10">
            <View style={base.cie10Fila}>
              <Text style={base.cie10Codigo}>{historia.diagnostico_cie10}</Text>
              <Text style={base.cie10Desc}>
                {historia.descripcion_diagnostico || 'Sin descripción adicional.'}
              </Text>
            </View>
          </Seccion>
        )}

        {/* ── BLOQUE 5 — Plan de manejo ── */}
        {(historia.plan_tratamiento
          || medTexto
          || historia.ordenes_medicas
          || historia.recomendaciones
          || historia.incapacidad_dias) && (
          <Seccion numero="5" titulo="Plan de Manejo / Conducta">
            {historia.plan_tratamiento && (
              <>
                <Text style={[base.campoEtiqueta, { marginBottom: 3 }]}>Plan de tratamiento:</Text>
                <Text style={base.textoBloque}>{historia.plan_tratamiento}</Text>
              </>
            )}
            {medTexto && (
              <View style={base.medicamentoBox}>
                <Text style={base.medicamentoLabel}>Fórmula Médica — Medicamentos</Text>
                <Text style={base.medicamentoTexto}>{medTexto}</Text>
              </View>
            )}
            {historia.ordenes_medicas && (
              <>
                <Text style={[base.campoEtiqueta, { marginBottom: 3, marginTop: 4 }]}>
                  Órdenes médicas / Exámenes:
                </Text>
                <Text style={base.textoBloque}>{historia.ordenes_medicas}</Text>
              </>
            )}
            {historia.recomendaciones && (
              <>
                <Text style={[base.campoEtiqueta, { marginBottom: 3, marginTop: 4 }]}>
                  Recomendaciones y signos de alarma:
                </Text>
                <Text style={base.textoBloque}>{historia.recomendaciones}</Text>
              </>
            )}
            {historia.incapacidad_dias > 0 && (
              <View style={base.incapacidadBox}>
                <Text style={base.incapacidadTexto}>
                  Incapacidad médica: {historia.incapacidad_dias} día(s) a partir de{' '}
                  {formatFecha(historia.fecha_cita)}
                </Text>
              </View>
            )}
          </Seccion>
        )}

        {/* ── BLOQUE 6 — Cierre legal ── */}
        <Seccion numero="6" titulo="Cierre Legal y Firma del Médico">
          <View style={base.cierreBox}>
            <View style={base.firmaLinea} />
            <Text style={base.firmaNombre}>
              {historia.medico_nombre_firma
                || `Dr(a). ${historia.medico_nombre} ${historia.medico_apellido}`}
            </Text>
            {historia.especialidad && (
              <Text style={base.firmaDato}>{historia.especialidad}</Text>
            )}
            {historia.medico_cedula_firma && (
              <Text style={base.firmaDato}>C.C. {historia.medico_cedula_firma}</Text>
            )}
            {historia.medico_rethus_firma && (
              <Text style={base.firmaDato}>ReTHUS: {historia.medico_rethus_firma}</Text>
            )}
            <Text style={[base.firmaDato, { marginTop: 6 }]}>
              Firmado electrónicamente en MELIKA ·{' '}
              {new Date().toLocaleDateString('es-CO', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </View>
        </Seccion>

        {/* ── Notas de aclaración y evolución ── */}
        {aclaraciones.length > 0 && (
          <Seccion titulo="Notas de Aclaración y Evolución">
            {aclaraciones.map((ac, i) => {
              const medAcl = extraerTextoMedicamentos(ac.medicamentos_recetados);

              return (
                <View key={ac.id} style={base.aclaracionBox}>

                  {/* Encabezado: tipo + fecha */}
                  <View style={base.aclaracionEncabezado}>
                    <Text style={base.aclaracionTipo}>
                      {ac.tipo_registro === 'nota_evolucion'
                        ? `Nota de evolución #${i + 1}`
                        : `Aclaración / Corrección #${i + 1}`}
                    </Text>
                    <Text style={base.aclaracionFecha}>
                      {new Date(ac.created_at).toLocaleDateString('es-CO', {
                        day: '2-digit', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  {/* Motivo */}
                  {ac.motivo_consulta ? (
                    <View style={{ marginBottom: 4 }}>
                      <Text style={base.aclaracionEtiqueta}>Motivo / Descripción:</Text>
                      <Text style={base.aclaracionTexto}>{ac.motivo_consulta}</Text>
                    </View>
                  ) : null}

                  {/* Evolución / anamnesis */}
                  {ac.anamnesis ? (
                    <View style={{ marginBottom: 4 }}>
                      <Text style={base.aclaracionEtiqueta}>Evolución / Enfermedad actual:</Text>
                      <Text style={base.aclaracionTexto}>{ac.anamnesis}</Text>
                    </View>
                  ) : null}

                  {/* Diagnóstico CIE-10 */}
                  {ac.diagnostico_cie10 ? (
                    <View style={[base.cie10Fila, { marginBottom: 4 }]}>
                      <Text style={base.cie10Codigo}>{ac.diagnostico_cie10}</Text>
                      <Text style={base.cie10Desc}>
                        {ac.descripcion_diagnostico || ''}
                      </Text>
                    </View>
                  ) : null}

                  {/* Plan de tratamiento */}
                  {ac.plan_tratamiento ? (
                    <View style={{ marginBottom: 4 }}>
                      <Text style={base.aclaracionEtiqueta}>Plan de tratamiento:</Text>
                      <Text style={base.aclaracionTexto}>{ac.plan_tratamiento}</Text>
                    </View>
                  ) : null}

                  {/* Medicamentos */}
                  {medAcl ? (
                    <View style={[base.medicamentoBox, { marginBottom: 4 }]}>
                      <Text style={base.medicamentoLabel}>Medicamentos recetados</Text>
                      <Text style={base.medicamentoTexto}>{medAcl}</Text>
                    </View>
                  ) : null}

                  {/* Órdenes médicas */}
                  {ac.ordenes_medicas ? (
                    <View style={{ marginBottom: 4 }}>
                      <Text style={base.aclaracionEtiqueta}>Órdenes médicas:</Text>
                      <Text style={base.aclaracionTexto}>{ac.ordenes_medicas}</Text>
                    </View>
                  ) : null}

                  {/* Recomendaciones */}
                  {ac.recomendaciones ? (
                    <View style={{ marginBottom: 4 }}>
                      <Text style={base.aclaracionEtiqueta}>Recomendaciones:</Text>
                      <Text style={base.aclaracionTexto}>{ac.recomendaciones}</Text>
                    </View>
                  ) : null}

                  {/* Firma del médico que creó la aclaración */}
                  {ac.medico_nombre_firma ? (
                    <Text style={base.aclaracionFirma}>
                      — {ac.medico_nombre_firma}
                      {ac.medico_rethus_firma ? ` · ReTHUS: ${ac.medico_rethus_firma}` : ''}
                    </Text>
                  ) : null}

                </View>
              );
            })}
          </Seccion>
        )}

        <PiePagina />

      </Page>
    </Document>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANTILLA 2: Fórmula Médica
// ─────────────────────────────────────────────────────────────────────────────

const estilosFormula = StyleSheet.create({
  pagina: {
    fontFamily:      'Helvetica',
    fontSize:        9,
    color:           COLOR.grisTexto,
    backgroundColor: COLOR.blanco,
    paddingTop:      36,
    paddingBottom:   52,
    paddingLeft:     44,
    paddingRight:    44,
  },
  bannerFormula: {
    backgroundColor:   COLOR.verde,
    borderRadius:      8,
    paddingVertical:   10,
    paddingHorizontal: 14,
    marginBottom:      14,
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
  },
  bannerTitulo: {
    fontSize:   13,
    fontFamily: 'Helvetica-Bold',
    color:      COLOR.blanco,
  },
  bannerSub: {
    fontSize:  8,
    color:     '#A7F3D0',
    marginTop: 2,
  },
  bannerLogo: {
    fontSize:      16,
    fontFamily:    'Helvetica-Bold',
    color:         COLOR.blanco,
    letterSpacing: 2,
  },
  bannerLogoAccento: {
    color: '#FCA5A5',
  },
  pacienteBox: {
    backgroundColor: COLOR.azulPale,
    borderRadius:    6,
    padding:         10,
    marginBottom:    10,
  },
  pacienteTitulo: {
    fontSize:      8,
    fontFamily:    'Helvetica-Bold',
    color:         COLOR.azulMedio,
    textTransform: 'uppercase',
    marginBottom:  6,
    letterSpacing: 0.5,
  },
  medBox: {
    borderWidth:   1,
    borderColor:   COLOR.verde,
    borderRadius:  8,
    marginBottom:  10,
    overflow:      'hidden',
  },
  medBoxHeader: {
    backgroundColor:   COLOR.verde,
    paddingVertical:   5,
    paddingHorizontal: 10,
  },
  medBoxHeaderTexto: {
    fontSize:      8,
    fontFamily:    'Helvetica-Bold',
    color:         COLOR.blanco,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  medBoxCuerpo: {
    padding: 10,
  },
  medTextoContenido: {
    fontSize:   10,
    color:      COLOR.negro,
    lineHeight: 1.7,
  },
  ordenBox: {
    borderWidth:   1,
    borderColor:   COLOR.azulClaro,
    borderRadius:  8,
    marginBottom:  10,
    overflow:      'hidden',
  },
  ordenHeader: {
    backgroundColor:   COLOR.azulMedio,
    paddingVertical:   5,
    paddingHorizontal: 10,
  },
  ordenHeaderTexto: {
    fontSize:      8,
    fontFamily:    'Helvetica-Bold',
    color:         COLOR.blanco,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ordenCuerpo: {
    padding:         10,
    backgroundColor: COLOR.azulPale,
  },
  ordenTexto: {
    fontSize:   9,
    color:      COLOR.negro,
    lineHeight: 1.5,
  },
  recomBox: {
    backgroundColor: '#FFF7ED',
    borderRadius:    6,
    padding:         10,
    marginBottom:    10,
    borderLeftWidth: 3,
    borderLeftColor: '#F97316',
  },
  recomTitulo: {
    fontSize:      8,
    fontFamily:    'Helvetica-Bold',
    color:         '#C2410C',
    textTransform: 'uppercase',
    marginBottom:  4,
  },
  recomTexto: {
    fontSize:   9,
    color:      COLOR.grisTexto,
    lineHeight: 1.5,
  },
  incapacidadFormula: {
    backgroundColor: '#FEF9C3',
    borderRadius:    6,
    padding:         8,
    marginBottom:    10,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
  },
  incapacidadBadge: {
    fontSize:          9,
    fontFamily:        'Helvetica-Bold',
    color:             COLOR.blanco,
    backgroundColor:   '#CA8A04',
    paddingVertical:   3,
    paddingHorizontal: 8,
    borderRadius:      4,
  },
  incapacidadDias: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      '#854D0E',
  },
  cierreFormula: {
    marginTop:      10,
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-end',
    paddingTop:     10,
    borderTopWidth: 1,
    borderTopColor: COLOR.grisLinea,
  },
  selloBox: {
    backgroundColor: COLOR.azulPale,
    borderRadius:    6,
    padding:         8,
    width:           '45%',
  },
  selloTexto: {
    fontSize:   7,
    color:      COLOR.grisMuted,
    lineHeight: 1.5,
  },
  firmaBox: {
    alignItems: 'flex-end',
    width:      '45%',
  },
  firmaLineaF: {
    width:             140,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.azulMedio,
    marginBottom:      4,
  },
  firmaNombreF: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      COLOR.azulPrimario,
    textAlign:  'right',
  },
  firmaDatoF: {
    fontSize:  8,
    color:     COLOR.grisMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  advertenciaFormula: {
    marginTop:       8,
    backgroundColor: '#FEF2F2',
    borderRadius:    4,
    padding:         6,
  },
  advertenciaTexto: {
    fontSize:  7,
    color:     '#991B1B',
    textAlign: 'center',
    lineHeight: 1.4,
  },
});

export function PlantillaFormulaPDF({ historia }) {
  if (!historia) return null;

  const medTexto     = extraerTextoMedicamentos(historia.medicamentos_recetados);
  const edad         = calcularEdad(historia.paciente_fecha_nac);
  const fechaEmision = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  if (!medTexto && !historia.ordenes_medicas) return null;

  return (
    <Document
      title={`Formula-${historia.id} — ${historia.paciente_nombre} ${historia.paciente_apellido}`}
      author="MELIKA Salud Digital"
      subject="Fórmula Médica"
      creator="MELIKA — Resolución 1995/1999"
    >
      <Page size="LETTER" style={estilosFormula.pagina}>

        {/* Banner verde */}
        <View style={estilosFormula.bannerFormula}>
          <View>
            <Text style={estilosFormula.bannerTitulo}>Fórmula Médica</Text>
            <Text style={estilosFormula.bannerSub}>
              Caldas, Antioquia · Emitida: {fechaEmision}
            </Text>
            <Text style={estilosFormula.bannerSub}>
              Consecutivo: FM-{String(historia.id).padStart(6, '0')}
            </Text>
          </View>
          <Text style={estilosFormula.bannerLogo}>
            <Text style={estilosFormula.bannerLogoAccento}>M</Text>ELIKA
          </Text>
        </View>

        {/* Datos del médico */}
        <View style={estilosFormula.pacienteBox}>
          <Text style={estilosFormula.pacienteTitulo}>Médico Prescriptor</Text>
          <Campo
            etiqueta="Médico"
            valor={historia.medico_nombre_firma
              || `Dr(a). ${historia.medico_nombre} ${historia.medico_apellido}`}
          />
          <Campo etiqueta="Especialidad" valor={historia.especialidad} />
          <Campo etiqueta="C.C."         valor={historia.medico_cedula_firma} />
          <Campo etiqueta="ReTHUS"       valor={historia.medico_rethus_firma} />
        </View>

        {/* Datos del paciente */}
        <View style={estilosFormula.pacienteBox}>
          <Text style={estilosFormula.pacienteTitulo}>Paciente</Text>
          <View style={base.grid2}>
            <View style={base.grid2Item}>
              <Campo
                etiqueta="Nombre"
                valor={`${historia.paciente_nombre} ${historia.paciente_apellido}`}
              />
            </View>
            <View style={base.grid2Item}>
              <Campo
                etiqueta="Documento"
                valor={`${historia.paciente_tipo_doc || 'CC'} ${historia.paciente_num_doc}`}
              />
            </View>
            <View style={base.grid2Item}>
              <Campo etiqueta="Edad" valor={edad !== null ? `${edad} años` : null} />
            </View>
            <View style={base.grid2Item}>
              <Campo etiqueta="EPS" valor={historia.eps_aseguradora} />
            </View>
          </View>
        </View>

        {/* Diagnóstico de referencia */}
        {historia.diagnostico_cie10 && (
          <View style={[base.cie10Fila, { marginBottom: 10 }]}>
            <Text style={base.cie10Codigo}>{historia.diagnostico_cie10}</Text>
            <Text style={base.cie10Desc}>
              {historia.descripcion_diagnostico || 'Diagnóstico de referencia'}
            </Text>
          </View>
        )}

        {/* Medicamentos */}
        {medTexto && (
          <View style={estilosFormula.medBox}>
            <View style={estilosFormula.medBoxHeader}>
              <Text style={estilosFormula.medBoxHeaderTexto}>
                Medicamentos Recetados — Rx
              </Text>
            </View>
            <View style={estilosFormula.medBoxCuerpo}>
              <Text style={estilosFormula.medTextoContenido}>{medTexto}</Text>
            </View>
          </View>
        )}

        {/* Órdenes médicas */}
        {historia.ordenes_medicas && (
          <View style={estilosFormula.ordenBox}>
            <View style={estilosFormula.ordenHeader}>
              <Text style={estilosFormula.ordenHeaderTexto}>
                Órdenes Médicas — Exámenes de Laboratorio / Imágenes
              </Text>
            </View>
            <View style={estilosFormula.ordenCuerpo}>
              <Text style={estilosFormula.ordenTexto}>{historia.ordenes_medicas}</Text>
            </View>
          </View>
        )}

        {/* Recomendaciones */}
        {historia.recomendaciones && (
          <View style={estilosFormula.recomBox}>
            <Text style={estilosFormula.recomTitulo}>
              Recomendaciones y Signos de Alarma
            </Text>
            <Text style={estilosFormula.recomTexto}>{historia.recomendaciones}</Text>
          </View>
        )}

        {/* Incapacidad */}
        {historia.incapacidad_dias > 0 && (
          <View style={estilosFormula.incapacidadFormula}>
            <Text style={estilosFormula.incapacidadBadge}>INCAPACIDAD</Text>
            <Text style={estilosFormula.incapacidadDias}>
              {historia.incapacidad_dias} día(s) a partir del{' '}
              {formatFecha(historia.fecha_cita)}
            </Text>
          </View>
        )}

        {/* Cierre legal */}
        <View style={estilosFormula.cierreFormula}>
          <View style={estilosFormula.selloBox}>
            <Text style={estilosFormula.selloTexto}>
              Documento generado por MELIKA Salud Digital.{'\n'}
              Válido únicamente con firma del médico prescriptor.{'\n'}
              Res. 1995/1999 · Ley 2015/2020 · Colombia.{'\n'}
              No válido para medicamentos de control especial sin sello físico.
            </Text>
          </View>
          <View style={estilosFormula.firmaBox}>
            <View style={estilosFormula.firmaLineaF} />
            <Text style={estilosFormula.firmaNombreF}>
              {historia.medico_nombre_firma
                || `Dr(a). ${historia.medico_nombre} ${historia.medico_apellido}`}
            </Text>
            {historia.especialidad && (
              <Text style={estilosFormula.firmaDatoF}>{historia.especialidad}</Text>
            )}
            {historia.medico_rethus_firma && (
              <Text style={estilosFormula.firmaDatoF}>
                ReTHUS: {historia.medico_rethus_firma}
              </Text>
            )}
          </View>
        </View>

        {/* Advertencia legal */}
        <View style={estilosFormula.advertenciaFormula}>
          <Text style={estilosFormula.advertenciaTexto}>
            Este documento es de uso médico confidencial y tiene reserva legal (Ley 23/1981 · Art. 34).
            Su divulgación no autorizada está prohibida. Conserve este documento en lugar seguro.
          </Text>
        </View>

        <PiePagina />

      </Page>
    </Document>
  );
}
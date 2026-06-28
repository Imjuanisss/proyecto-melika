
--                   MELIKA — SCHEMAv2 CON ARQUITECTURA DE DATOS ADVANCED
-- Integracion de LOGS and TRIGGERS para auditoría y seguridad, con enfoque en integridad transaccional y prevención de conflictos de concurrencia.

-- 1. DROP EN ORDEN INVERSO A DEPENDENCIAS (Para recreación limpia)
--DROP TABLE IF EXISTS logs_citas              CASCADE;
--DROP TABLE IF EXISTS historias_clinicas      CASCADE;
--DROP TABLE IF EXISTS citas                   CASCADE;
--DROP TABLE IF EXISTS franjas_horarias        CASCADE;
--DROP TABLE IF EXISTS medicos                 CASCADE;
--DROP TABLE IF EXISTS medicamentos            CASCADE;
--DROP TABLE IF EXISTS especialidades          CASCADE;
--DROP TABLE IF EXISTS tokens_invitacion       CASCADE;
--DROP TABLE IF EXISTS codigos_verificacion    CASCADE;
--DROP TABLE IF EXISTS usuarios                CASCADE;


-- 2. DEFINICIÓN DE TABLAS BASE INDEPENDIENTES Y DE AUTENTICACIÓN

CREATE TABLE usuarios (
  id               SERIAL        PRIMARY KEY,
  nombre           VARCHAR(100)  NOT NULL,
  primer_apellido  VARCHAR(100)  NOT NULL,
  segundo_apellido VARCHAR(100),
  email            VARCHAR(255)  NOT NULL UNIQUE,
  telefono         VARCHAR(20),
  password_hash    VARCHAR(255)  NOT NULL,
  rol              VARCHAR(20)   NOT NULL DEFAULT 'paciente' CHECK (rol IN ('paciente','medico','admin')),
  activo           BOOLEAN       NOT NULL DEFAULT FALSE,
  verificado       BOOLEAN       NOT NULL DEFAULT FALSE,
  fecha_nacimiento DATE,
  genero           VARCHAR(20),
  direccion        VARCHAR(255),
  ciudad           VARCHAR(100),
  tipo_documento   VARCHAR(20)   NOT NULL  DEFAULT 'CC' CHECK (tipo_documento IN ('CC','CE','PASAPORTE')),
  numero_documento VARCHAR(50)   NOT NULL UNIQUE,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE codigos_verificacion (
  id         SERIAL       PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  codigo     VARCHAR(6)   NOT NULL,
  tipo       VARCHAR(20)  NOT NULL CHECK (tipo IN ('registro','recuperacion')),
  expira_en  TIMESTAMP    NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tokens_invitacion (
  id         SERIAL       PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  token      VARCHAR(255) NOT NULL UNIQUE,
  rol        VARCHAR(20)  NOT NULL CHECK (rol IN ('medico','admin')),
  usado      BOOLEAN      NOT NULL DEFAULT FALSE,
  expira_en  TIMESTAMP    NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 3. TABLAS DEL CATÁLOGO MÉDICO Y CLÍNICO
-- =============================================================================

CREATE TABLE especialidades (
  id          SERIAL        PRIMARY KEY,
  nombre      VARCHAR(100)  NOT NULL UNIQUE,
  descripcion TEXT,
  precio_base NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  imagen_url  VARCHAR(255),
  activa      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medicamentos (
  id                SERIAL       PRIMARY KEY,
  nombre_comercial  VARCHAR(150) NOT NULL,
  principio_activa  VARCHAR(150), -- Se preserva el typo original del modelo base para no alterar mapeos
  principio_activo  VARCHAR(150), 
  laboratorio       VARCHAR(100),
  categoria         VARCHAR(100),
  tipo              VARCHAR(10)  NOT NULL CHECK (tipo IN ('OTC','Rx')),
  descripcion       TEXT,
  indicaciones      TEXT,
  posologia         TEXT,
  contraindicaciones TEXT,
  presentaciones    TEXT,
  registro_invima   VARCHAR(50),
  imagen_url        VARCHAR(255),
  activo            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medicos (
  id                  SERIAL        PRIMARY KEY,
  id_usuario          INT           NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  id_especialidad     INT           NOT NULL REFERENCES especialidades(id),
  numero_registro     VARCHAR(50)   NOT NULL UNIQUE,
  tarifa              NUMERIC(10,2) NOT NULL,
  calificacion        NUMERIC(3,2)  DEFAULT 5.00,
  acepta_teleconsulta BOOLEAN       NOT NULL DEFAULT TRUE,
  acepta_presencial   BOOLEAN       NOT NULL DEFAULT TRUE,
  biografia           TEXT,
  anos_experiencia    INT           DEFAULT 0,
  activo              BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE franjas_horarias (
  id          SERIAL    PRIMARY KEY,
  id_medico   INT       NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  fecha       DATE      NOT NULL,
  hora_inicio TIME      NOT NULL,
  hora_fin    TIME      NOT NULL,
  disponible  BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT  chk_horas_orden CHECK (hora_inicio < hora_fin)
);

-- =============================================================================
-- 4. TABLA CORE DEL SISTEMA: CITAS
-- =============================================================================

-- =============================================================================
-- 4. TABLA CORE DEL SISTEMA: CITAS (ACTUALIZADA)
-- =============================================================================

CREATE TABLE citas (
  id              SERIAL        PRIMARY KEY,
  id_paciente     INT           NOT NULL REFERENCES usuarios(id),
  id_medico       INT           NOT NULL REFERENCES medicos(id),
  id_especialidad INT           NOT NULL REFERENCES especialidades(id),
  id_franja       INT           NOT NULL REFERENCES franjas_horarias(id),
  fecha           DATE          NOT NULL,
  hora_inicio     TIME          NOT NULL,
  tipo_consulta   VARCHAR(20)   NOT NULL DEFAULT 'presencial' CHECK (tipo_consulta IN ('presencial','teleconsulta')),
  estado          VARCHAR(20)   NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','completada','cancelada','no_asistio')),
  motivo          TEXT,
  razon_cancelacion TEXT,        
  tarifa          NUMERIC(10,2) NOT NULL,
  notas_medicas   TEXT,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE historias_clinicas (
  id                      SERIAL    PRIMARY KEY,
  id_paciente             INT       NOT NULL REFERENCES usuarios(id),
  id_medico               INT       NOT NULL REFERENCES medicos(id),
  id_cita                 INT       NOT NULL UNIQUE REFERENCES citas(id),
  motivo_consulta         TEXT      NOT NULL,
  anamnesis               TEXT,
  examen_fisico           TEXT,
  diagnostico_cie10       VARCHAR(10),
  descripcion_diagnostico TEXT,
  plan_tratamiento        TEXT,
  medicamentos_recetados  JSONB,
  observaciones           TEXT,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 5. NUEVA CAPA DE SEGURIDAD Y AUDITORÍA: LOGS DE CITAS (JSONB)
-- =============================================================================

CREATE TABLE logs_citas (
    id               SERIAL        PRIMARY KEY,
    id_cita          INT           NOT NULL,
    accion           VARCHAR(20)   NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    estado_anterior  VARCHAR(50),
    estado_nuevo     VARCHAR(50),
    datos_anteriores JSONB,                  -- Snapshot de la fila antes del cambio
    datos_nuevos     JSONB,                  -- Snapshot de la fila posterior al cambio
    usuario_db       VARCHAR(100)  DEFAULT CURRENT_USER,
    fecha_registro   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Índices de optimización arquitectónica para búsquedas analíticas en auditoría
CREATE INDEX idx_logs_citas_id_cita ON logs_citas(id_cita);
CREATE INDEX idx_logs_citas_gin_nuevos ON logs_citas USING gin (datos_nuevos);

-- =============================================================================
-- 6. PROGRAMACIÓN DE LÓGICA REACTIVA DE DATOS: TRIGGERS & PROCEDURES (PL/pgSQL)
-- =============================================================================

-- ── TRIGGER 1: AUDITORÍA TRANSPARENTE E INMUTABLE ───────────────────────────
CREATE OR REPLACE FUNCTION fn_auditar_citas()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO logs_citas (id_cita, accion, estado_anterior, estado_nuevo, datos_anteriores, datos_nuevos)
        VALUES (NEW.id, 'INSERT', NULL, NEW.estado, NULL, to_jsonb(NEW));
        RETURN NEW;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.* IS DISTINCT FROM NEW.*) THEN
            INSERT INTO logs_citas (id_cita, accion, estado_anterior, estado_nuevo, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'UPDATE', OLD.estado, NEW.estado, to_jsonb(OLD), to_jsonb(NEW));
        END IF;
        RETURN NEW;
        
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO logs_citas (id_cita, accion, estado_anterior, estado_nuevo, datos_anteriores, datos_nuevos)
        VALUES (OLD.id, 'DELETE', OLD.estado, NULL, to_jsonb(OLD), NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditoria_citas
AFTER INSERT OR UPDATE OR DELETE ON citas
FOR EACH ROW
EXECUTE FUNCTION fn_auditar_citas();


-- ── TRIGGER 2: BLINDAJE DE CONCURRENCIA ATÓMICA (PREVENCIÓN DE DOBLE AGENDAMIENTO) ──
CREATE OR REPLACE FUNCTION fn_verificar_disponibilidad_critica()
RETURNS TRIGGER AS $$
DECLARE
    v_disponible BOOLEAN;
BEGIN
    -- Bloqueo pesimista mitigado consultando el estado de la franja horaria
    SELECT disponible INTO v_disponible 
    FROM franjas_horarias 
    WHERE id = NEW.id_franja;

    IF v_disponible IS NULL THEN
        RAISE EXCEPTION 'ERR_FRANJA_INEXISTENTE: La franja horaria especificada no existe en los registros.'
            USING ERRCODE = '45001';
    ELSIF v_disponible = FALSE THEN
        RAISE EXCEPTION 'ERR_FRANJA_OCUPADA: Conflicto de concurrencia. La franja horaria ya ha sido reservada.'
            USING ERRCODE = '45002';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seguridad_reserva_critica
BEFORE INSERT ON citas
FOR EACH ROW
EXECUTE FUNCTION fn_verificar_disponibilidad_critica();


-- ── TRIGGER 3: CONTROL DE ESTADO REACTIVO AUTOMATIZADO ──────────────────────
CREATE OR REPLACE FUNCTION fn_sincronizar_franja_horaria()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserción exitosa -> Marcar franja como OCUPADA de inmediato
    IF (TG_OP = 'INSERT') THEN
        UPDATE franjas_horarias SET disponible = FALSE WHERE id = NEW.id_franja;
        RETURN NEW;
        
    -- Cambio transaccional a Cancelado -> LIBERAR franja de inmediato
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.estado <> 'cancelada' AND NEW.estado = 'cancelada') THEN
            UPDATE franjas_horarias SET disponible = TRUE WHERE id = NEW.id_franja;
        END IF;
        RETURN NEW;
        
    -- Eliminación física preventiva -> LIBERAR franja de inmediato
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE franjas_horarias SET disponible = TRUE WHERE id = OLD.id_franja;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sincronizacion_automatica_franja
AFTER INSERT OR UPDATE OR DELETE ON citas
FOR EACH ROW
EXECUTE FUNCTION fn_sincronizar_franja_horaria();



-- Ejecutar en PostgreSQL para optimizar las queries de disponibilidad por rango
-- Archivo: server/scripts/indices_disponibilidad.sql

-- Índice compuesto para búsqueda de franjas por médico + fecha + disponibilidad
CREATE INDEX IF NOT EXISTS idx_franjas_medico_fecha_disponible
  ON franjas_horarias (id_medico, fecha, disponible)
  WHERE disponible = TRUE;

-- Índice para el endpoint de calendario de citas del paciente
CREATE INDEX IF NOT EXISTS idx_citas_paciente_fecha
  ON citas (id_paciente, fecha)
  WHERE estado != 'cancelada';

-- Índice para joins frecuentes en las queries de citas
CREATE INDEX IF NOT EXISTS idx_citas_medico_fecha
  ON citas (id_medico, fecha);


-- PASO 4: Migración de datos históricos de medicamentos_recetados a la nueva estructura JSONB
UPDATE historias_clinicas
SET medicamentos_recetados = jsonb_build_object(
      'texto',
      medicamentos_recetados #>> '{}'   -- extrae el valor como texto si es un scalar JSON
    )
WHERE
  medicamentos_recetados IS NOT NULL
  AND jsonb_typeof(medicamentos_recetados) = 'string';
 
-- Caso B: El valor es un objeto pero NO tiene la clave "texto"
--         (podría ser un objeto arbitrario de versiones anteriores)
--         → lo convertimos a representación textual dentro del wrapper.
UPDATE historias_clinicas
SET medicamentos_recetados = jsonb_build_object(
      'texto',
      medicamentos_recetados::text
    )
WHERE
  medicamentos_recetados IS NOT NULL
  AND jsonb_typeof(medicamentos_recetados) = 'object'
  AND NOT (medicamentos_recetados ? 'texto');
 
-- Caso C: El valor es un array JSON
--         → lo convertimos a representación textual.
UPDATE historias_clinicas
SET medicamentos_recetados = jsonb_build_object(
      'texto',
      medicamentos_recetados::text
    )
WHERE
  medicamentos_recetados IS NOT NULL
  AND jsonb_typeof(medicamentos_recetados) = 'array';
 
-- ─── Verificación post-migración ─────────────────────────────
-- Ejecuta esto manualmente para confirmar que todos los registros
-- tienen la forma { "texto": "..." } o son NULL:
--
-- SELECT id, medicamentos_recetados
-- FROM historias_clinicas
-- WHERE medicamentos_recetados IS NOT NULL
-- AND NOT (medicamentos_recetados ? 'texto');
--
-- Debe devolver 0 filas.
SELECT * FROM usuarios;

--MIGRACIÓN v2: MÓDULO INTEGRAL DE HISTORIAS CLÍNICAS
-- PASO 1: Ampliar la tabla historias_clinicas con todos los bloques normativos
-- Se usa ALTER TABLE para no romper datos ni relaciones existentes
-- -----------------------------------------------------------------------------
 
-- Bloque 1 — Identificación administrativa del paciente (datos complementarios)
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS tipo_consulta       VARCHAR(20)  DEFAULT 'presencial',
  ADD COLUMN IF NOT EXISTS eps_aseguradora     VARCHAR(150),
  ADD COLUMN IF NOT EXISTS contacto_responsable_nombre   VARCHAR(150),
  ADD COLUMN IF NOT EXISTS contacto_responsable_telefono VARCHAR(30);
 
-- Bloque 2 — Anamnesis expandida (campos separados por tipo de antecedente)
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS antecedentes_patologicos      TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_quirurgicos      TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_alergicos        TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_familiares       TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_ginecoobstetricos TEXT,
  ADD COLUMN IF NOT EXISTS habitos                       TEXT;
 
-- Bloque 3 — Examen físico con signos vitales numéricos (Res. 1995/1999)
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS tension_arterial_sistolica    FLOAT,
  ADD COLUMN IF NOT EXISTS tension_arterial_diastolica   FLOAT,
  ADD COLUMN IF NOT EXISTS frecuencia_cardiaca           INT,
  ADD COLUMN IF NOT EXISTS frecuencia_respiratoria       INT,
  ADD COLUMN IF NOT EXISTS temperatura_corporal          FLOAT,
  ADD COLUMN IF NOT EXISTS peso_kg                       FLOAT,
  ADD COLUMN IF NOT EXISTS talla_cm                      FLOAT,
  ADD COLUMN IF NOT EXISTS imc                           FLOAT,
  ADD COLUMN IF NOT EXISTS exploracion_por_sistemas      TEXT;
 
-- Bloque 4 — Diagnóstico CIE-10 ya estaba como diagnostico_cie10 + descripcion_diagnostico
 
-- Bloque 5 — Plan de manejo separado por tipo
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS ordenes_medicas  TEXT,
  ADD COLUMN IF NOT EXISTS recomendaciones  TEXT,
  ADD COLUMN IF NOT EXISTS incapacidad_dias INT;
 
-- Bloque 6 — Cierre legal con datos del médico firmante
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS medico_nombre_firma    VARCHAR(200),
  ADD COLUMN IF NOT EXISTS medico_cedula_firma    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS medico_rethus_firma    VARCHAR(50);
 
-- Estado del documento (activo | anulado_por_aclaracion)
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS estado VARCHAR(30) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'anulado_por_aclaracion'));
 
-- ID de la historia original (para notas de aclaración/evolución)
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS id_historia_original INT REFERENCES historias_clinicas(id);
 
-- Tipo de documento: historia principal o aclaración/nota de evolución
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS tipo_registro VARCHAR(30) NOT NULL DEFAULT 'historia_principal'
    CHECK (tipo_registro IN ('historia_principal', 'nota_aclaracion', 'nota_evolucion'));
 

-- PASO 2: Tabla de documentos adjuntos (fórmulas, exámenes, documentos externos)
-- Lógica append-only: nunca se borra un documento médico generado

 
CREATE TABLE IF NOT EXISTS documentos_clinicos (
  id              SERIAL        PRIMARY KEY,
  id_historia     INT           REFERENCES historias_clinicas(id),
  id_paciente     INT           NOT NULL REFERENCES usuarios(id),
  id_medico       INT           REFERENCES medicos(id),
  tipo_documento  VARCHAR(30)   NOT NULL CHECK (tipo_documento IN (
                    'historia_clinica',
                    'formula_medica',
                    'orden_examen',
                    'documento_externo'
                  )),
  origen          VARCHAR(20)   NOT NULL CHECK (origen IN ('medico', 'paciente')),
  nombre_archivo  VARCHAR(255),
  url_pdf         TEXT,
  descripcion     VARCHAR(500),
  -- Solo el paciente puede "ocultar" un documento externo que él mismo subió
  -- Un documento médico NUNCA se elimina (inmutabilidad legal)
  oculto_paciente BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
 
-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_docs_clinicos_paciente ON documentos_clinicos(id_paciente);
CREATE INDEX IF NOT EXISTS idx_docs_clinicos_historia ON documentos_clinicos(id_historia);
CREATE INDEX IF NOT EXISTS idx_docs_clinicos_medico   ON documentos_clinicos(id_medico);
 

-- PASO 3: Índices de optimización sobre historias_clinicas existentes

 
CREATE INDEX IF NOT EXISTS idx_historias_paciente   ON historias_clinicas(id_paciente);
CREATE INDEX IF NOT EXISTS idx_historias_medico      ON historias_clinicas(id_medico);
CREATE INDEX IF NOT EXISTS idx_historias_original    ON historias_clinicas(id_historia_original);
CREATE INDEX IF NOT EXISTS idx_historias_tipo        ON historias_clinicas(tipo_registro);
 

-- VERIFICACIÓN: Consultas de control post-migración
-- Ejecutar manualmente para confirmar que la migración fue exitosa:
--
 SELECT column_name, data_type FROM information_schema.columns
 WHERE table_name = 'historias_clinicas' ORDER BY ordinal_position;

SELECT COUNT(*) FROM documentos_clinicos;
SELECT COUNT(*) FROM historias_clinicas WHERE tipo_registro IS NOT NULL;


-- MELIKA — Migración v3: columna notas_medicas en citas
-- Ejecutar en Railway/PostgreSQL antes de desplegar el backend actualizado.
-- Es seguro ejecutarlo múltiples veces (usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

-- El campo notas_medicas permite al médico registrar observaciones de cierre
-- visibles en la agenda sin necesidad de abrir la historia clínica completa.
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS notas_medicas TEXT;

-- Verificación post-migración
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'citas'
  AND column_name = 'notas_medicas';
-- Debe retornar una fila: notas_medicas | text

-- Bloque 1 — Datos administrativos complementarios
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS tipo_consulta                  VARCHAR(20)  DEFAULT 'presencial',
  ADD COLUMN IF NOT EXISTS eps_aseguradora                VARCHAR(150),
  ADD COLUMN IF NOT EXISTS contacto_responsable_nombre    VARCHAR(150),
  ADD COLUMN IF NOT EXISTS contacto_responsable_telefono  VARCHAR(30);

-- Bloque 2 — Anamnesis expandida
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS antecedentes_patologicos        TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_quirurgicos        TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_alergicos          TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_familiares         TEXT,
  ADD COLUMN IF NOT EXISTS antecedentes_ginecoobstetricos  TEXT,
  ADD COLUMN IF NOT EXISTS habitos                         TEXT;

-- Bloque 3 — Signos vitales numéricos
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS tension_arterial_sistolica   FLOAT,
  ADD COLUMN IF NOT EXISTS tension_arterial_diastolica  FLOAT,
  ADD COLUMN IF NOT EXISTS frecuencia_cardiaca          INT,
  ADD COLUMN IF NOT EXISTS frecuencia_respiratoria      INT,
  ADD COLUMN IF NOT EXISTS temperatura_corporal         FLOAT,
  ADD COLUMN IF NOT EXISTS peso_kg                      FLOAT,
  ADD COLUMN IF NOT EXISTS talla_cm                     FLOAT,
  ADD COLUMN IF NOT EXISTS imc                          FLOAT,
  ADD COLUMN IF NOT EXISTS exploracion_por_sistemas     TEXT;

-- Bloque 5 — Plan de manejo detallado
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS ordenes_medicas   TEXT,
  ADD COLUMN IF NOT EXISTS recomendaciones   TEXT,
  ADD COLUMN IF NOT EXISTS incapacidad_dias  INT;

-- Bloque 6 — Cierre legal
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS medico_nombre_firma VARCHAR(200),
  ADD COLUMN IF NOT EXISTS medico_cedula_firma VARCHAR(50),
  ADD COLUMN IF NOT EXISTS medico_rethus_firma VARCHAR(50);

-- Control de versiones (inmutabilidad legal)
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS estado VARCHAR(30) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'anulado_por_aclaracion')),
  ADD COLUMN IF NOT EXISTS id_historia_original INT REFERENCES historias_clinicas(id),
  ADD COLUMN IF NOT EXISTS tipo_registro VARCHAR(30) NOT NULL DEFAULT 'historia_principal'
    CHECK (tipo_registro IN ('historia_principal', 'nota_aclaracion', 'nota_evolucion'));

-- Tabla de documentos clínicos adjuntos
CREATE TABLE IF NOT EXISTS documentos_clinicos (
  id              SERIAL        PRIMARY KEY,
  id_historia     INT           REFERENCES historias_clinicas(id),
  id_paciente     INT           NOT NULL REFERENCES usuarios(id),
  id_medico       INT           REFERENCES medicos(id),
  tipo_documento  VARCHAR(30)   NOT NULL CHECK (tipo_documento IN (
                    'historia_clinica','formula_medica','orden_examen','documento_externo')),
  origen          VARCHAR(20)   NOT NULL CHECK (origen IN ('medico','paciente')),
  nombre_archivo  VARCHAR(255),
  url_pdf         TEXT,
  descripcion     VARCHAR(500),
  oculto_paciente BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices de optimización
CREATE INDEX IF NOT EXISTS idx_historias_paciente  ON historias_clinicas(id_paciente);
CREATE INDEX IF NOT EXISTS idx_historias_medico    ON historias_clinicas(id_medico);
CREATE INDEX IF NOT EXISTS idx_historias_original  ON historias_clinicas(id_historia_original);
CREATE INDEX IF NOT EXISTS idx_historias_tipo      ON historias_clinicas(tipo_registro);
CREATE INDEX IF NOT EXISTS idx_docs_clinicos_pac   ON documentos_clinicos(id_paciente);
CREATE INDEX IF NOT EXISTS idx_docs_clinicos_his   ON documentos_clinicos(id_historia);


-- MELIKA — Migración v4: Fix constraint UNIQUE en historias_clinicas
-- Permite múltiples filas por id_cita (historia principal + aclaraciones/evoluciones)
-- Se reemplaza el UNIQUE simple por un índice parcial que solo aplica a historia_principal

-- 1. Identificar y eliminar el constraint UNIQUE existente en id_cita
-- (el nombre puede variar; Railway lo genera como historias_clinicas_id_cita_key)
ALTER TABLE historias_clinicas
  DROP CONSTRAINT IF EXISTS historias_clinicas_id_cita_key;

-- 2. Crear índice parcial ÚNICO solo para historia_principal
--    Esto garantiza: una sola historia principal por cita
--    pero permite N aclaraciones/notas vinculadas al mismo id_cita
CREATE UNIQUE INDEX IF NOT EXISTS uq_historia_principal_por_cita
  ON historias_clinicas (id_cita)
  WHERE tipo_registro = 'historia_principal';

-- 3. Verificación: debe retornar el índice parcial creado
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'historias_clinicas'
  AND indexname = 'uq_historia_principal_por_cita';

nuevos datos para meter 

  ALTER TABLE franjas_horarias 
ADD COLUMN estado VARCHAR(20) DEFAULT 'disponible';

-- 1. Tabla para las Fórmulas Médicas (Recetas)
CREATE TABLE recetas_medicas (
    id SERIAL PRIMARY KEY,
    id_historia INTEGER REFERENCES historias_clinicas(id) ON DELETE CASCADE,
    medicamento VARCHAR(150) NOT NULL,
    dosis VARCHAR(100) NOT NULL,       -- ej: '500 mg'
    frecuencia VARCHAR(100) NOT NULL,  -- ej: 'Cada 8 horas'
    duracion VARCHAR(100) NOT NULL,    -- ej: 'Por 5 días'
    via_administracion VARCHAR(50),    -- ej: 'Oral', 'Intravenosa'
    indicaciones TEXT,                 -- ej: 'Tomar después de las comidas'
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla para las Órdenes de Exámenes Médicos
CREATE TABLE ordenes_examenes (
    id SERIAL PRIMARY KEY,
    id_historia INTEGER REFERENCES historias_clinicas(id) ON DELETE CASCADE,
    tipo_examen VARCHAR(100) NOT NULL,   -- ej: 'Laboratorio', 'Imagenología'
    nombre_examen VARCHAR(150) NOT NULL, -- ej: 'Cuadro Hemático', 'Radiografía de Tórax'
    justificacion_clinica TEXT,          -- Razón por la que se pide el examen
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  
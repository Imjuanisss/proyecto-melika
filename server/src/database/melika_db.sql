
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

  -- 1. Asegurarnos de que exista la especialidad de Cardiología (ID = 1)
INSERT INTO especialidades (id, nombre, descripcion, precio_base, activa)
VALUES (1, 'Cardiología', 'Especialidad médica encargada del estudio, diagnóstico y tratamiento de las enfermedades del corazón.', 0.00, TRUE)
ON CONFLICT (id) DO NOTHING;
-- Nota: Si el ID 1 ya existe, el 'DO NOTHING' evitará un error.

-- 2. Crear el Usuario para el Médico
-- Necesitamos cumplir con los campos NOT NULL (como tipo_documento y numero_documento)
INSERT INTO usuarios (nombre, primer_apellido, email, password_hash, rol, activo, verificado, tipo_documento, numero_documento) 
VALUES ('Alejandro', 'Gómez', 'dr.gomez@melika.com', 'hash_simulado_123', 'medico', TRUE, TRUE, 'CC', '1020304050')
RETURNING id; 
-- ⚠️ ATENCIÓN: Mira qué ID devuelve esta consulta. Supongamos que devuelve el ID 1.

-- 3. Crear el Perfil Médico
-- Reemplaza el "1" en id_usuario por el número que te devolvió el paso anterior.
INSERT INTO medicos (id_usuario, id_especialidad, numero_registro, tarifa, calificacion, acepta_teleconsulta, acepta_presencial, biografia, anos_experiencia, activo)
VALUES (1, 1, 'RM-778899', 150000.00, 4.9, TRUE, TRUE, 'Cardiólogo clínico con enfoque en prevención y tratamiento de arritmias.', 12, TRUE)
RETURNING id;
-- ⚠️ ATENCIÓN: Mira qué ID devuelve esta consulta. Supongamos que devuelve el ID 1.

-- 4. Crear Franjas Horarias Disponibles (Para que podamos probar el agendamiento luego)
-- Reemplaza el "1" en id_medico por el número que te devolvió el paso 3.
INSERT INTO franjas_horarias (id_medico, fecha, hora_inicio, hora_fin, disponible)
VALUES 
(1, CURRENT_DATE + INTERVAL '1 day', '08:00:00', '08:30:00', TRUE),
(1, CURRENT_DATE + INTERVAL '1 day', '08:30:00', '09:00:00', TRUE),
(1, CURRENT_DATE + INTERVAL '1 day', '09:00:00', '09:30:00', TRUE);
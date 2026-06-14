--                    MELIKA — SCHEMAv2 CON ARQUITECTURA DE DATOS ADVANCED
-- Integracion de LOGS and TRIGGERS para auditoría y seguridad, con enfoque en integridad transaccional.

-- =============================================================================
-- 1. DROP EN ORDEN INVERSO A DEPENDENCIAS (Para recreación limpia)
-- =============================================================================
DROP TABLE IF EXISTS logs_citas            CASCADE;
DROP TABLE IF EXISTS historias_clinicas    CASCADE;
DROP TABLE IF EXISTS citas                 CASCADE;
DROP TABLE IF EXISTS franjas_horarias      CASCADE;
DROP TABLE IF EXISTS medicos               CASCADE;
DROP TABLE IF EXISTS medicamentos          CASCADE;
DROP TABLE IF EXISTS especialidades        CASCADE;
DROP TABLE IF EXISTS tokens_invitacion     CASCADE;
DROP TABLE IF EXISTS codigos_verificacion  CASCADE;
DROP TABLE IF EXISTS usuarios              CASCADE;


-- =============================================================================
-- 2. DEFINICIÓN DE TABLAS BASE INDEPENDIENTES Y DE AUTENTICACIÓN
-- =============================================================================
CREATE TABLE usuarios (
  id               SERIAL        PRIMARY KEY,
  nombre           VARCHAR(100)  NOT NULL,
  primer_apellido  VARCHAR(100)  NOT NULL,
  segundo_apellido VARCHAR(100),
  email            VARCHAR(255)  NOT NULL UNIQUE,
  telefono         VARCHAR(50),  -- Integrado desde el inicio
  password_hash    VARCHAR(255)  NOT NULL,
  rol              VARCHAR(20)   NOT NULL DEFAULT 'paciente' CHECK (rol IN ('paciente','medico','admin')),
  activo           BOOLEAN       NOT NULL DEFAULT FALSE,
  verificado       BOOLEAN       NOT NULL DEFAULT FALSE,
  fecha_nacimiento DATE,
  genero           VARCHAR(20),
  direccion        VARCHAR(255),
  ciudad           VARCHAR(100), -- Integrado desde el inicio
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
  id                 SERIAL        PRIMARY KEY,
  nombre_comercial   VARCHAR(150)  NOT NULL,
  principio_activa   VARCHAR(150), 
  principio_activo   VARCHAR(150), 
  laboratorio        VARCHAR(100),
  id_especialidad    INTEGER       REFERENCES especialidades(id), -- Integrado como FK
  tipo               VARCHAR(10)   NOT NULL CHECK (tipo IN ('OTC','Rx')),
  descripcion        TEXT,
  indicaciones       TEXT,
  posologia          TEXT,
  contraindicaciones TEXT,
  presentaciones     TEXT,
  registro_invima    VARCHAR(50),
  imagen_url         VARCHAR(255), -- Integrado desde el inicio
  activo             BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
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
-- 4. TABLA CORE DEL SISTEMA: CITAS Y CLINICA
-- =============================================================================
CREATE TABLE citas (
  id                SERIAL        PRIMARY KEY,
  id_paciente       INT           NOT NULL REFERENCES usuarios(id),
  id_medico         INT           NOT NULL REFERENCES medicos(id),
  id_especialidad   INT           NOT NULL REFERENCES especialidades(id),
  id_franja         INT           NOT NULL REFERENCES franjas_horarias(id),
  fecha             DATE          NOT NULL,
  hora_inicio       TIME          NOT NULL,
  tipo_consulta     VARCHAR(20)   NOT NULL DEFAULT 'presencial' CHECK (tipo_consulta IN ('presencial','teleconsulta')),
  estado            VARCHAR(20)   NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','completada','cancelada','no_asistio')),
  motivo            TEXT,
  razon_cancelacion TEXT,        
  tarifa            NUMERIC(10,2) NOT NULL,
  notas_medicas     TEXT,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
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
-- 5. CAPA DE SEGURIDAD Y AUDITORÍA: LOGS DE CITAS (JSONB)
-- =============================================================================
CREATE TABLE logs_citas (
    id               SERIAL        PRIMARY KEY,
    id_cita          INT           NOT NULL,
    accion           VARCHAR(20)   NOT NULL,
    estado_anterior  VARCHAR(50),
    estado_nuevo     VARCHAR(50),
    datos_anteriores JSONB,                  
    datos_nuevos     JSONB,                  
    usuario_db       VARCHAR(100)  DEFAULT CURRENT_USER,
    fecha_registro   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_citas_id_cita ON logs_citas(id_cita);
CREATE INDEX idx_logs_citas_gin_nuevos ON logs_citas USING gin (datos_nuevos);


-- =============================================================================
-- 6. PROGRAMACIÓN DE LÓGICA REACTIVA DE DATOS: TRIGGERS & PROCEDURES (PL/pgSQL)
-- =============================================================================

-- ── TRIGGER 1: AUDITORÍA TRANSPARENTE E INMUTABLE ──
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


-- ── TRIGGER 2: BLINDAJE DE CONCURRENCIA ATÓMICA ──
CREATE OR REPLACE FUNCTION fn_verificar_disponibilidad_critica()
RETURNS TRIGGER AS $$
DECLARE
    v_disponible BOOLEAN;
BEGIN
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


-- ── TRIGGER 3: CONTROL DE ESTADO REACTIVO AUTOMATIZADO ──
CREATE OR REPLACE FUNCTION fn_sincronizar_franja_horaria()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE franjas_horarias SET disponible = FALSE WHERE id = NEW.id_franja;
        RETURN NEW;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.estado <> 'cancelada' AND NEW.estado = 'cancelada') THEN
            UPDATE franjas_horarias SET disponible = TRUE WHERE id = NEW.id_franja;
        END IF;
        RETURN NEW;
        
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

-- ── ÍNDICES DE OPTIMIZACIÓN ──
CREATE INDEX IF NOT EXISTS idx_franjas_medico_fecha_disponible ON franjas_horarias (id_medico, fecha, disponible) WHERE disponible = TRUE;
CREATE INDEX IF NOT EXISTS idx_citas_paciente_fecha ON citas (id_paciente, fecha) WHERE estado != 'cancelada';
CREATE INDEX IF NOT EXISTS idx_citas_medico_fecha ON citas (id_medico, fecha);


-- =============================================================================
-- 7. SEED DATA: DATOS SEMILLA (ESPECIALIDADES Y MÉDICOS DEMO)
-- =============================================================================

-- Insertar o actualizar las 12 especialidades oficiales
INSERT INTO especialidades (id, nombre, descripcion, precio_base, imagen_url, activa)
VALUES 
  (1, 'Cardiología', 'Evaluación, prevención y tratamiento de enfermedades del corazón y del sistema cardiovascular.', 80000.00, '/imagenes/especialidades/cardiologia.jpg', TRUE),
  (2, 'Dermatología', 'Diagnóstico y cuidado integral de patologías de la piel, pelo, uñas y tratamientos estéticos médicos.', 70000.00, '/imagenes/especialidades/dermatologia.jpg', TRUE),
  (3, 'Pediatría', 'Atención médica integral, control de crecimiento y desarrollo para bebés, niños y adolescentes.', 65000.00, '/imagenes/especialidades/pediatria.jpg', TRUE),
  (4, 'Neurología', 'Especialistas en trastornos complejos del cerebro, la médula espinal, los nervios y el sistema muscular.', 90000.00, '/imagenes/especialidades/neurologia.jpg', TRUE),
  (5, 'Ginecología', 'Cuidado integral de la salud del sistema reproductor femenino, control prenatal y maternidad.', 75000.00, '/imagenes/especialidades/ginecologia.jpg', TRUE),
  (6, 'Medicina General', 'Tu primer punto de contacto médico. Diagnóstico primario, remisiones y chequeos preventivos.', 45000.00, '/imagenes/especialidades/medicina-general.jpg', TRUE),
  (7, 'Ortopedia y Traumatología', 'Tratamiento de lesiones óseas, fracturas, problemas articulares, musculares y correcciones de postura.', 80000.00, '/imagenes/especialidades/ortopedia.jpg', TRUE),
  (8, 'Oftalmología', 'Cuidado avanzado de la visión, diagnóstico de enfermedades oculares y prescripción médica de lentes.', 70000.00, '/imagenes/especialidades/oftalmologia.jpg', TRUE),
  (9, 'Psiquiatría', 'Evaluación médica y terapéutica de la salud mental, trastornos del ánimo, ansiedad y bienestar emocional.', 85000.00, '/imagenes/especialidades/psiquiatria.jpg', TRUE),
  (10, 'Otorrinolaringología', 'Especialistas en el diagnóstico y tratamiento de oído, nariz, garganta y estructuras del cuello.', 75000.00, '/imagenes/especialidades/otorrino.jpg', TRUE),
  (11, 'Urología', 'Atención del sistema urinario en ambos sexos y patologías del sistema reproductor masculino.', 75000.00, '/imagenes/especialidades/urologia.jpg', TRUE),
  (12, 'Nutrición y Dietética', 'Planes alimenticios personalizados para control de peso, rendimiento deportivo o manejo de patologías.', 55000.00, '/imagenes/especialidades/nutricion.jpg', TRUE)
ON CONFLICT (id) DO UPDATE 
SET nombre = EXCLUDED.nombre, 
    descripcion = EXCLUDED.descripcion, 
    precio_base = EXCLUDED.precio_base,
    imagen_url = EXCLUDED.imagen_url;

-- Sincronizar el contador de IDs para que cuando crees nuevas especialidades desde un panel de admin no haya errores
SELECT setval('especialidades_id_seq', (SELECT MAX(id) FROM especialidades));

-- BUCLE DE CREACIÓN DE 24 MÉDICOS CON FRANJAS HORARIAS
DO $$
DECLARE
    v_usr_id INT;
    v_med_id INT;
    v_nombres TEXT[] := ARRAY['Camila', 'Juan Fernando', 'Liliana', 'Mauricio', 'Carlos', 'Andrea', 'Andrés', 'Diana Marcela', 'Diana', 'Laura', 'Valeria Sofía', 'Jorge Iván', 'Mauricio', 'Felipe', 'Natalia', 'Gabriel', 'Ricardo', 'Amalia', 'Santiago', 'Clara Inés', 'Fernando', 'Juliana', 'Carolina', 'Esteban'];
    v_apellidos TEXT[] := ARRAY['Restrepo', 'Medina', 'Pérez', 'Tobón', 'Mendoza', 'Zuluaga', 'Jaramillo', 'Ríos', 'Ospina', 'Castillo', 'Plata', 'Cardona', 'Bermúdez', 'Suárez', 'Castellanos', 'Muñoz', 'Tobón', 'Herrera', 'Vásquez', 'Beltrán', 'Echeverry', 'Patiño', 'Sanz', 'Villarreal'];
    v_especialidades INT[] := ARRAY[1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12];
    v_tarifas NUMERIC[] := ARRAY[90000, 110000, 85000, 95000, 80000, 75000, 120000, 115000, 95000, 90000, 45000, 45000, 100000, 95000, 85000, 90000, 110000, 100000, 90000, 95000, 105000, 95000, 65000, 60000];
    v_bios TEXT[] := ARRAY[
        'Especialista en cardiología preventiva y cuidado cardiovascular.', 'Experto en cardiología intervencionista y falla cardíaca.',
        'Experta en dermatología clínica y estética funcional.', 'Dermatólogo oncólogo enfocado en prevención y mapeo.',
        'Pediatra dedicado al desarrollo integral y nutrición.', 'Especialista en neonatología y crecimiento infantil.',
        'Especialista en trastornos del sueño, migrañas y patologías.', 'Neuróloga clínica con énfasis en el manejo de epilepsia.',
        'Gineco-obstetra con amplia trayectoria en control prenatal.', 'Especialista en ginecología endocrinológica y salud de la mujer.',
        'Atención médica primaria orientada a la prevención familiar.', 'Médico general enfocado en el control de hipertensión.',
        'Ortopedista enfocado en lesiones deportivas y articulares.', 'Especialista en cirugía de mano y ortopedia infantil.',
        'Especialista en cirugía refractiva y diagnóstico visual.', 'Oftalmólogo clínico enfocado en enfermedades de la retina.',
        'Psiquiatra clínico enfocado en trastornos del ánimo y ansiedad.', 'Especialista en psiquiatría de enlace y terapia conductual.',
        'Tratamiento avanzado de patologías de oído, nariz y garganta.', 'Otorrinolaringóloga con subespecialidad en otología o vértigo.',
        'Urólogo certificado. Tratamiento de cálculos y próstata.', 'Especialista en urología femenina y suelo pélvico.',
        'Nutricionista clínica experta en planes metabólicos.', 'Asesoría nutricional orientada a control metabólico.'
    ];
    i INT;
BEGIN
    FOR i IN 1..array_length(v_nombres, 1) LOOP
        -- Crear Usuario
        INSERT INTO usuarios (nombre, primer_apellido, email, password_hash, rol, activo, verificado, tipo_documento, numero_documento)
        VALUES (
            v_nombres[i], 
            v_apellidos[i], 
            'dr.demo' || i || '@melika.com', 
            'hash_12345', 
            'medico', 
            TRUE, 
            TRUE, 
            'CC', 
            (1020304000 + i)::TEXT
        ) RETURNING id INTO v_usr_id;

        -- Crear Perfil Médico
        INSERT INTO medicos (id_usuario, id_especialidad, numero_registro, tarifa, calificacion, acepta_teleconsulta, acepta_presencial, biografia, anos_experiencia, activo)
        VALUES (
            v_usr_id, 
            v_especialidades[i], 
            'RM-' || (778800 + i), 
            v_tarifas[i], 
            ROUND((4.5 + random() * 0.5)::numeric, 1),
            TRUE, 
            TRUE, 
            v_bios[i], 
            (5 + random() * 10)::INT, 
            TRUE
        ) RETURNING id INTO v_med_id;

        -- Crear Franjas Horarias Disponibles
        INSERT INTO franjas_horarias (id_medico, fecha, hora_inicio, hora_fin, disponible)
        VALUES 
        (v_med_id, CURRENT_DATE + INTERVAL '1 day', '08:00:00', '08:30:00', TRUE),
        (v_med_id, CURRENT_DATE + INTERVAL '1 day', '08:30:00', '09:00:00', TRUE),
        (v_med_id, CURRENT_DATE + INTERVAL '1 day', '09:00:00', '09:30:00', TRUE),
        (v_med_id, CURRENT_DATE + INTERVAL '2 day', '10:00:00', '10:30:00', TRUE);

    END LOOP;
END $$;


-- 1. Limpieza total del catálogo de medicamentos para evitar duplicados
DELETE FROM medicamentos;

-- 2. Inserción masiva de medicamentos reales para habilitar TODAS las especialidades
INSERT INTO medicamentos 
  (nombre_comercial, principio_activo, laboratorio, id_especialidad, tipo, descripcion, presentaciones, imagen_url, activo)
VALUES 
  -- 1. Cardiología
  ('Losartán Potásico', 'Losartán 50mg', 'Genfar', 1, 'Rx', 'Tratamiento de primera línea para el manejo de la hipertensión arterial.', 'Caja x 30 tabletas', '/imagenes/medicamentos/losartan.jpg', TRUE),
  ('Aspirina 100', 'Ácido Acetilsalicílico', 'Bayer', 1, 'OTC', 'Prevención de eventos cardiovasculares y antitrombótico.', 'Caja x 28 tabletas', '/imagenes/medicamentos/aspirina.jpg', TRUE),

  -- 2. Dermatología
  ('Roaccutan', 'Isotretinoína 20mg', 'Roche', 2, 'Rx', 'Tratamiento para acné nodular severo o quístico recalcitrante.', 'Caja x 30 cápsulas', '/imagenes/medicamentos/roaccutan.jpg', TRUE),
  ('Betametasona', 'Betametasona 0.1%', 'Mk', 2, 'Rx', 'Crema tópica con potente acción antiinflamatoria y antipruriginosa.', 'Tubo x 40g', '/imagenes/medicamentos/betametasona.jpg', TRUE),

  -- 3. Pediatría
  ('Dolex Niños Jarabe', 'Acetaminofén 160mg/5ml', 'Haleon', 3, 'OTC', 'Alivio rápido del dolor y la fiebre en niños, con agradable sabor a fresa.', 'Frasco x 90ml', '/imagenes/medicamentos/dolex-ninos.jpg', TRUE),
  ('Pedialyte 60', 'Electrólitos + Zinc', 'Abbott', 3, 'OTC', 'Solución de hidratación oral ideal para la reposición de líquidos y sales minerales.', 'Frasco x 500ml', '/imagenes/medicamentos/pedialyte.jpg', TRUE),

  -- 4. Neurología
  ('Adorlan', 'Tramadol + Acetaminofén', 'Grunenthal', 4, 'Rx', 'Analgésico central indicado para el tratamiento del dolor moderado a severo.', 'Caja x 30 tabletas', '/imagenes/medicamentos/adorlan.jpg', TRUE),
  ('Sertralina', 'Sertralina 50mg', 'Mk', 4, 'Rx', 'Inhibidor selectivo de la recaptación de serotonina para trastornos neurológicos y del ánimo.', 'Caja x 30 tabletas', '/imagenes/medicamentos/sertralina.jpg', TRUE),

  -- 5. Ginecología
  ('Yaz', 'Drospirenona / Etinilestradiol', 'Bayer', 5, 'Rx', 'Anticonceptivo oral combinado con beneficios para el SPM y control de acné.', 'Caja x 28 comprimidos', '/imagenes/medicamentos/yaz.jpg', TRUE),
  ('Gynocanesten', 'Clotrimazol Crema 2%', 'Bayer', 5, 'OTC', 'Tratamiento eficaz de uso óvulo-vaginal para infecciones micóticas.', 'Tubo x 20g con aplicadores', '/imagenes/medicamentos/gynocanesten.jpg', TRUE),

  -- 6. Medicina General
  ('Dolex Forte', 'Acetaminofén + Cafeína', 'Haleon', 6, 'OTC', 'Alivio potente del dolor de cabeza, migraña, dolores musculares y fiebre.', 'Caja x 14 tabletas', '/imagenes/medicamentos/dolex.jpg', TRUE),
  ('Apronax', 'Naproxeno Sódico 550mg', 'Bayer', 6, 'OTC', 'Analgésico y antiinflamatorio prolongado para dolores intensos musculares y articulares.', 'Caja x 20 tabletas', '/imagenes/medicamentos/apronax.jpg', TRUE),

  -- 7. Ortopedia y Traumatología
  ('Voltaren Emulgel', 'Diclofenaco Dietilamonio', 'Novartis', 7, 'OTC', 'Gel antiinflamatorio tópico para aliviar el dolor de golpes, esguinces y torceduras.', 'Tubo x 50g', '/imagenes/medicamentos/voltaren.jpg', TRUE),
  ('Colágeno Hidrolizado', 'Colágeno + Magnesio', 'Healthy America', 7, 'OTC', 'Suplemento nutricional enfocado en la salud articular y regeneración de cartílagos.', 'Frasco x 60 cápsulas', '/imagenes/medicamentos/colageno.jpg', TRUE),

  -- 8. Oftalmología
  ('Nafazolina Gotas', 'Nafazolina Clorhidrato', 'Tecnoquímicas', 8, 'OTC', 'Solución oftálmica vasoconstrictora para aliviar el enrojecimiento y la irritación ocular.', 'Frasco x 15ml', '/imagenes/medicamentos/nafazolina.jpg', TRUE),
  ('Fresh Tears', 'Carboximetilcelulosa 0.5%', 'Allergan', 8, 'OTC', 'Lágrimas artificiales indicadas para el alivio temporal del ojo seco e irritación.', 'Frasco x 15ml', '/imagenes/medicamentos/freshtears.jpg', TRUE),

  -- 9. Psiquiatría
  ('Prozac', 'Fluoxetina 20mg', 'Eli Lilly', 9, 'Rx', 'Antidepresivo indicado para el tratamiento de la depresión y trastornos de ansiedad.', 'Caja x 14 cápsulas', '/imagenes/medicamentos/prozac.jpg', TRUE),
  ('Clonazepam', 'Clonazepam 2mg', 'Tecnoquímicas', 9, 'Rx', 'Ansiolítico de acción prolongada utilizado bajo estricto control médico.', 'Caja x 30 tabletas', '/imagenes/medicamentos/clonazepam.jpg', TRUE),

  -- 10. Otorrinolaringología
  ('Afrin Adultos', 'Oximetazolina 0.05%', 'Bayer', 10, 'OTC', 'Descongestionante nasal de acción rápida para procesos gripales y sinusitis.', 'Frasco Spray x 15ml', '/imagenes/medicamentos/afrin.jpg', TRUE),
  ('Amoxicilina', 'Amoxicilina 500mg', 'Genfar', 10, 'Rx', 'Antibiótico de amplio espectro para infecciones bacterianas en oído y garganta.', 'Caja x 30 cápsulas', '/imagenes/medicamentos/amoxicilina.jpg', TRUE),

  -- 11. Urología
  ('Secotex', 'Tamsulosina Clorhidrato 0.4mg', 'Boehringer', 11, 'Rx', 'Tratamiento para los síntomas urinarios asociados a la hiperplasia prostática benigna.', 'Caja x 30 tamsulosinas', '/imagenes/medicamentos/secotex.jpg', TRUE),
  ('Ciprofloxacino', 'Ciprofloxacino 500mg', 'Mk', 11, 'Rx', 'Antibiótico fluoroquinolona altamente eficaz para infecciones del tracto urinario.', 'Caja x 10 tabletas', '/imagenes/medicamentos/ciprofloxacino.jpg', TRUE),

  -- 12. Nutrición y Dietética
  ('Centrum Adultos', 'Vitaminas y Minerales', 'Haleon', 12, 'OTC', 'Multivitamínico completo balanceado para complementar las necesidades nutricionales.', 'Frasco x 30 tabletas', '/imagenes/medicamentos/centrum.jpg', TRUE),
  ('Ensure Clinical', 'Nutrición Especializada', 'Abbott', 12, 'OTC', 'Suplemento hipercalórico e hiperproteico para fuerza, masa muscular y vitalidad.', 'Lata x 400g', '/imagenes/medicamentos/ensure.jpg', TRUE),

  -- 13. Veterinaria (¡La especialidad que creaste tú!)
  ('Apoquel', 'Oclacitinib 5.4mg', 'Zoetis', 13, 'Rx', 'Tratamiento de vanguardia para el control del prurito y la dermatitis alérgica en perros.', 'Caja x 20 tabletas', '/imagenes/medicamentos/apoquel.jpg', TRUE),
  ('NexGard', 'Afoxolaner Masticable', 'Boehringer', 13, 'OTC', 'Pastilla masticable antiparasitaria externa altamente efectiva contra pulgas y garrapatas.', 'Caja x 3 tabletas', '/imagenes/medicamentos/nexgard.jpg', TRUE);

  INSERT INTO especialidades (id, nombre, descripcion, precio_base, imagen_url, activa)
VALUES (13, 'Veterinaria', 'Cuidado y bienestar integral para mascotas y animales de compañía.', 50000.00, '/imagenes/especialidades/veterinaria.jpg', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Sincronizamos el contador interno por si agregas más desde el panel después
SELECT setval('especialidades_id_seq', (SELECT MAX(id) FROM especialidades));

ALTER TABLE medicos ADD COLUMN foto_url VARCHAR(255);
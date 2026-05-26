-- MELIKA — Schema de Base de Datos
-- Ejecutar en pgAdmin 4 con la base de datos melika_db seleccionada

--DROP TABLE IF EXISTS historias_clinicas CASCADE;
--DROP TABLE IF EXISTS citas               CASCADE;
--DROP TABLE IF EXISTS franjas_horarias    CASCADE;
--DROP TABLE IF EXISTS medicos             CASCADE;
--DROP TABLE IF EXISTS medicamentos        CASCADE;
--DROP TABLE IF EXISTS especialidades      CASCADE;
--DROP TABLE IF EXISTS usuarios            CASCADE;


-- 1. USUARIOS
CREATE TABLE usuarios (
  id               SERIAL        PRIMARY KEY,
  nombre           VARCHAR(100)  NOT NULL,
  primer_apellido  VARCHAR(100)  NOT NULL,
  segundo_apellido VARCHAR(100),
  email            VARCHAR(255)  NOT NULL UNIQUE,
  telefono         VARCHAR(20),
  password_hash    VARCHAR(255)  NOT NULL,
  rol              VARCHAR(20)   NOT NULL DEFAULT 'paciente' CHECK (rol IN ('paciente', 'medico', 'admin')),
  activo           BOOLEAN       NOT NULL DEFAULT FALSE,
  verificado       BOOLEAN       NOT NULL DEFAULT FALSE,
  fecha_nacimiento DATE,
  genero           VARCHAR(20),
  direccion        VARCHAR(255),
  ciudad           VARCHAR(100)  DEFAULT 'Medellín',
  tipo_documento   VARCHAR(20)   DEFAULT 'CC',
  numero_documento VARCHAR(30)   UNIQUE,
  foto_url         VARCHAR(500),
  created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);


-- 2. ESPECIALIDADES
CREATE TABLE especialidades (
  id          SERIAL        PRIMARY KEY,
  nombre      VARCHAR(150)  NOT NULL UNIQUE,
  descripcion TEXT,
  precio_base NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  imagen_url  VARCHAR(500),
  activa      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);


-- 3. MEDICOS
CREATE TABLE medicos (
  id                  SERIAL        PRIMARY KEY,
  id_usuario          INTEGER       NOT NULL UNIQUE REFERENCES usuarios(id),
  id_especialidad     INTEGER       NOT NULL REFERENCES especialidades(id),
  numero_registro     VARCHAR(50)   NOT NULL UNIQUE,
  tarifa              NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  biografia           TEXT,
  anos_experiencia    SMALLINT      DEFAULT 0,
  calificacion        NUMERIC(3,1)  DEFAULT 0.0,
  acepta_teleconsulta BOOLEAN       NOT NULL DEFAULT FALSE,
  acepta_presencial   BOOLEAN       NOT NULL DEFAULT TRUE,
  activo              BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP     NOT NULL DEFAULT NOW()
);


-- 4. FRANJAS HORARIAS
CREATE TABLE franjas_horarias (
  id          SERIAL    PRIMARY KEY,
  id_medico   INTEGER   NOT NULL REFERENCES medicos(id),
  fecha       DATE      NOT NULL,
  hora_inicio TIME      NOT NULL,
  hora_fin    TIME      NOT NULL,
  disponible  BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (id_medico, fecha, hora_inicio)
);


-- 5. CITAS
CREATE TABLE citas (
  id                SERIAL        PRIMARY KEY,
  id_paciente       INTEGER       NOT NULL REFERENCES usuarios(id),
  id_medico         INTEGER       NOT NULL REFERENCES medicos(id),
  id_especialidad   INTEGER       NOT NULL REFERENCES especialidades(id),
  id_franja         INTEGER       NOT NULL UNIQUE REFERENCES franjas_horarias(id),
  fecha             DATE          NOT NULL,
  hora_inicio       TIME          NOT NULL,
  tipo_consulta     VARCHAR(20)   NOT NULL DEFAULT 'presencial' CHECK (tipo_consulta IN ('presencial', 'teleconsulta')),
  motivo            TEXT,
  estado            VARCHAR(20)   NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'completada', 'cancelada')),
  razon_cancelacion TEXT,
  tarifa_cobrada    NUMERIC(10,2) DEFAULT 0.00,
  created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP     NOT NULL DEFAULT NOW()
);


-- 6. MEDICAMENTOS
CREATE TABLE medicamentos (
  id                  SERIAL        PRIMARY KEY,
  nombre_comercial    VARCHAR(255)  NOT NULL,
  principio_activo    VARCHAR(255)  NOT NULL,
  laboratorio         VARCHAR(150),
  categoria           VARCHAR(100),
  tipo                VARCHAR(10)   NOT NULL DEFAULT 'OTC' CHECK (tipo IN ('OTC', 'Rx')),
  descripcion         TEXT,
  indicaciones        TEXT,
  contraindicaciones  TEXT,
  presentaciones      TEXT,
  registro_invima     VARCHAR(100)  UNIQUE,
  imagen_url          VARCHAR(500),
  activo              BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP     NOT NULL DEFAULT NOW()
);


-- 7. HISTORIAS CLINICAS
CREATE TABLE historias_clinicas (
  id                      SERIAL    PRIMARY KEY,
  id_cita                 INTEGER   NOT NULL UNIQUE REFERENCES citas(id),
  id_paciente             INTEGER   NOT NULL REFERENCES usuarios(id),
  id_medico               INTEGER   NOT NULL REFERENCES medicos(id),
  motivo_consulta         TEXT      NOT NULL,
  anamnesis               TEXT,
  examen_fisico           TEXT,
  diagnostico_cie10       VARCHAR(10),
  descripcion_diagnostico TEXT,
  plan_tratamiento        TEXT,
  medicamentos_recetados  TEXT,
  observaciones           TEXT,
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);


-- DATOS DE PRUEBA

INSERT INTO usuarios (nombre, primer_apellido, email, password_hash, rol, activo, verificado)
VALUES ('Administrador', 'MELIKA', 'admin@melika.com.co', 'CAMBIAR_POR_HASH', 'admin', TRUE, TRUE);

INSERT INTO especialidades (nombre, descripcion, precio_base, imagen_url) VALUES
  ('Medicina General',  'Atención primaria y consulta general.',               45000.00, '/imagenes/especialidades/medicina-general.jpg'),
  ('Cardiología',       'Enfermedades del corazón y sistema cardiovascular.',  80000.00, '/imagenes/especialidades/cardiologia.jpg'),
  ('Dermatología',      'Cuidado integral de la piel, cabello y uñas.',        70000.00, '/imagenes/especialidades/dermatologia.jpg'),
  ('Pediatría',         'Atención médica para niños y adolescentes.',          65000.00, '/imagenes/especialidades/pediatria.jpg'),
  ('Ginecología',       'Salud integral de la mujer.',                         75000.00, '/imagenes/especialidades/ginecologia.jpg'),
  ('Neurología',        'Enfermedades del sistema nervioso.',                  90000.00, '/imagenes/especialidades/neurologia.jpg'),
  ('Ortopedia',         'Lesiones del sistema musculoesquelético.',            85000.00, '/imagenes/especialidades/ortopedia.jpg'),
  ('Oftalmología',      'Salud visual y enfermedades de los ojos.',            75000.00, '/imagenes/especialidades/oftalmologia.jpg'),
  ('Psiquiatría',       'Diagnóstico y tratamiento de trastornos mentales.',   90000.00, '/imagenes/especialidades/psiquiatria.jpg'),
  ('Endocrinología',    'Diabetes, tiroides y enfermedades hormonales.',       85000.00, '/imagenes/especialidades/endocrinologia.jpg');

INSERT INTO medicamentos (nombre_comercial, principio_activo, laboratorio, tipo, indicaciones, contraindicaciones, presentaciones, registro_invima) VALUES
  ('Acetaminofén 500mg', 'Acetaminofén',           'Genfar',          'OTC', 'Dolor leve a moderado, fiebre.',   'Insuficiencia hepática grave.',     'Tabletas 500mg, Jarabe 150mg/5ml',     'INVIMA2020M-0012345'),
  ('Ibuprofeno 400mg',   'Ibuprofeno',             'Pfizer',          'OTC', 'Dolor muscular, articular.',       'Úlcera péptica, insuf. renal.',      'Tabletas 200mg, 400mg',                'INVIMA2019M-0023456'),
  ('Amoxicilina 500mg',  'Amoxicilina trihidrato', 'Novartis',        'Rx',  'Infecciones bacterianas.',         'Alergia a penicilinas.',             'Cápsulas 500mg, Suspensión 250mg/5ml', 'INVIMA2018M-0034567'),
  ('Loratadina 10mg',    'Loratadina',             'MK',              'OTC', 'Rinitis alérgica, urticaria.',     'Hipersensibilidad a loratadina.',    'Tabletas 10mg, Jarabe 5mg/5ml',        'INVIMA2021M-0045678'),
  ('Omeprazol 20mg',     'Omeprazol',              'Tecnoquímicas',   'Rx',  'Úlcera gástrica, reflujo.',        'Hipersensibilidad a omeprazol.',     'Cápsulas 10mg, 20mg, 40mg',            'INVIMA2017M-0056789'),
  ('Metformina 850mg',   'Metformina clorhidrato', 'Lafrancol',       'Rx',  'Diabetes mellitus tipo 2.',        'Insuficiencia renal severa.',        'Tabletas 500mg, 850mg, 1000mg',        'INVIMA2016M-0067890'),
  ('Salbutamol 100mcg',  'Salbutamol sulfato',     'GlaxoSmithKline', 'Rx',  'Broncoespasmo en asma y EPOC.',   'Hipersensibilidad a salbutamol.',    'Inhalador 100mcg/dosis',               'INVIMA2019M-0078901');

  --  Extensión para columna verificado en usuarios 
-- (solo si no existe ya)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT FALSE;

--  Tabla de códigos de verificación y recuperación 
CREATE TABLE IF NOT EXISTS codigos_verificacion (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(150) NOT NULL,
  codigo     VARCHAR(6)   NOT NULL,
  tipo       VARCHAR(20)  NOT NULL DEFAULT 'registro',
  -- tipo: 'registro' | 'recuperacion'
  expira_en  TIMESTAMP    NOT NULL,
  created_at TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_codigos_email_tipo
  ON codigos_verificacion(email, tipo);

--  Limpiar códigos expirados (ejecutar como job periódico o en cada login) ─
-- DELETE FROM codigos_verificacion WHERE expira_en < NOW();
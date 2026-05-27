
-- MELIKA — Schema completo v2



-- 1. DROP en orden inverso a dependencias
--DROP TABLE IF EXISTS historias_clinicas   CASCADE;
--DROP TABLE IF EXISTS citas                CASCADE;
--DROP TABLE IF EXISTS franjas_horarias     CASCADE;
--DROP TABLE IF EXISTS medicos              CASCADE;
--DROP TABLE IF EXISTS medicamentos         CASCADE;
--DROP TABLE IF EXISTS especialidades       CASCADE;
--DROP TABLE IF EXISTS tokens_invitacion    CASCADE;
--DROP TABLE IF EXISTS codigos_verificacion CASCADE;
--DROP TABLE IF EXISTS usuarios             CASCADE;



-- TABLA: usuarios

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
  ciudad           VARCHAR(100)  DEFAULT 'Medellín',
  tipo_documento   VARCHAR(20)   DEFAULT 'CC',
  numero_documento VARCHAR(30)   UNIQUE,
  foto_url         VARCHAR(500),
  created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol   ON usuarios(rol);



-- TABLA: codigos_verificacion
-- Uso: verificación de cuenta y recuperación de contraseña

CREATE TABLE codigos_verificacion (
  id         SERIAL       PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  codigo     VARCHAR(6)   NOT NULL,
  tipo       VARCHAR(20)  NOT NULL DEFAULT 'registro' CHECK (tipo IN ('registro','recuperacion')),
  expira_en  TIMESTAMP    NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_codigos_email_tipo ON codigos_verificacion(email, tipo);



-- TABLA: tokens_invitacion
-- Uso: el Admin invita a un médico; el médico activa su cuenta

CREATE TABLE tokens_invitacion (
  id          SERIAL       PRIMARY KEY,
  id_usuario  INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token       VARCHAR(128) NOT NULL UNIQUE,
  expira_en   TIMESTAMP    NOT NULL,
  usado       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tokens_token ON tokens_invitacion(token);



-- TABLA: especialidades

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



-- TABLA: medicos
-- Perfil extendido del usuario con rol='medico'

CREATE TABLE medicos (
  id                  SERIAL        PRIMARY KEY,
  id_usuario          INTEGER       NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE RESTRICT,
  id_especialidad     INTEGER       NOT NULL REFERENCES especialidades(id) ON DELETE RESTRICT,
  numero_registro     VARCHAR(50)   NOT NULL UNIQUE,
  tarifa              NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  biografia           TEXT,
  anos_experiencia    SMALLINT      NOT NULL DEFAULT 0,
  calificacion        NUMERIC(3,1)  NOT NULL DEFAULT 0.0,
  acepta_teleconsulta BOOLEAN       NOT NULL DEFAULT FALSE,
  acepta_presencial   BOOLEAN       NOT NULL DEFAULT TRUE,
  activo              BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medicos_especialidad ON medicos(id_especialidad);
CREATE INDEX idx_medicos_activo       ON medicos(activo);



-- TABLA: franjas_horarias
-- Las crea el médico (o el admin en su nombre)

CREATE TABLE franjas_horarias (
  id          SERIAL    PRIMARY KEY,
  id_medico   INTEGER   NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  fecha       DATE      NOT NULL,
  hora_inicio TIME      NOT NULL,
  hora_fin    TIME      NOT NULL,
  disponible  BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (id_medico, fecha, hora_inicio)
);

CREATE INDEX idx_franjas_medico_fecha ON franjas_horarias(id_medico, fecha);
CREATE INDEX idx_franjas_disponible   ON franjas_horarias(disponible);



-- TABLA: citas

CREATE TABLE citas (
  id                SERIAL        PRIMARY KEY,
  id_paciente       INTEGER       NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  id_medico         INTEGER       NOT NULL REFERENCES medicos(id)  ON DELETE RESTRICT,
  id_especialidad   INTEGER       NOT NULL REFERENCES especialidades(id) ON DELETE RESTRICT,
  id_franja         INTEGER       NOT NULL UNIQUE REFERENCES franjas_horarias(id) ON DELETE RESTRICT,
  fecha             DATE          NOT NULL,
  hora_inicio       TIME          NOT NULL,
  tipo_consulta     VARCHAR(20)   NOT NULL DEFAULT 'presencial' CHECK (tipo_consulta IN ('presencial','teleconsulta')),
  motivo            TEXT,
  estado            VARCHAR(20)   NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmada','completada','cancelada')),
  razon_cancelacion TEXT,
  tarifa_cobrada    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_citas_paciente ON citas(id_paciente);
CREATE INDEX idx_citas_medico   ON citas(id_medico);
CREATE INDEX idx_citas_fecha    ON citas(fecha);
CREATE INDEX idx_citas_estado   ON citas(estado);



-- TABLA: medicamentos

CREATE TABLE medicamentos (
  id                 SERIAL        PRIMARY KEY,
  nombre_comercial   VARCHAR(255)  NOT NULL,
  principio_activo   VARCHAR(255)  NOT NULL,
  laboratorio        VARCHAR(150),
  categoria          VARCHAR(100),
  tipo               VARCHAR(10)   NOT NULL DEFAULT 'OTC' CHECK (tipo IN ('OTC','Rx')),
  descripcion        TEXT,
  indicaciones       TEXT,
  contraindicaciones TEXT,
  presentaciones     TEXT,
  registro_invima    VARCHAR(100)  UNIQUE,
  imagen_url         VARCHAR(500),
  activo             BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP     NOT NULL DEFAULT NOW()
);



-- TABLA: historias_clinicas
-- Estructura profesional con campos CIE-10 y plan de tratamiento

CREATE TABLE historias_clinicas (
  id                      SERIAL    PRIMARY KEY,
  id_cita                 INTEGER   NOT NULL UNIQUE REFERENCES citas(id) ON DELETE RESTRICT,
  id_paciente             INTEGER   NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  id_medico               INTEGER   NOT NULL  REFERENCES medicos(id) ON DELETE RESTRICT,
  -- Campos clínicos estructurados
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

CREATE INDEX idx_historias_paciente ON historias_clinicas(id_paciente);
CREATE INDEX idx_historias_medico   ON historias_clinicas(id_medico);



-- DATOS SEMILLA


INSERT INTO especialidades (nombre, descripcion, precio_base, imagen_url) VALUES
  ('Medicina General',  'Atención primaria y consulta general.',              45000.00, '/imagenes/especialidades/medicina-general.jpg'),
  ('Cardiología',       'Enfermedades del corazón y sistema cardiovascular.', 80000.00, '/imagenes/especialidades/cardiologia.jpg'),
  ('Dermatología',      'Cuidado integral de la piel, cabello y uñas.',       70000.00, '/imagenes/especialidades/dermatologia.jpg'),
  ('Pediatría',         'Atención médica para niños y adolescentes.',         65000.00, '/imagenes/especialidades/pediatria.jpg'),
  ('Ginecología',       'Salud integral de la mujer.',                        75000.00, '/imagenes/especialidades/ginecologia.jpg'),
  ('Neurología',        'Enfermedades del sistema nervioso.',                 90000.00, '/imagenes/especialidades/neurologia.jpg'),
  ('Ortopedia',         'Lesiones del sistema musculoesquelético.',           85000.00, '/imagenes/especialidades/ortopedia.jpg'),
  ('Oftalmología',      'Salud visual y enfermedades de los ojos.',           75000.00, '/imagenes/especialidades/oftalmologia.jpg'),
  ('Psiquiatría',       'Diagnóstico y tratamiento de trastornos mentales.',  90000.00, '/imagenes/especialidades/psiquiatria.jpg'),
  ('Endocrinología',    'Diabetes, tiroides y enfermedades hormonales.',      85000.00, '/imagenes/especialidades/endocrinologia.jpg');

INSERT INTO medicamentos (nombre_comercial, principio_activo, laboratorio, tipo, indicaciones, contraindicaciones, presentaciones, registro_invima) VALUES
  ('Acetaminofén 500mg', 'Acetaminofén',           'Genfar',          'OTC', 'Dolor leve a moderado, fiebre.',  'Insuficiencia hepática grave.',    'Tabletas 500mg, Jarabe 150mg/5ml',     'INVIMA2020M-0012345'),
  ('Ibuprofeno 400mg',   'Ibuprofeno',             'Pfizer',          'OTC', 'Dolor muscular, articular.',      'Úlcera péptica, insuf. renal.',    'Tabletas 200mg, 400mg',                'INVIMA2019M-0023456'),
  ('Amoxicilina 500mg',  'Amoxicilina trihidrato', 'Novartis',        'Rx',  'Infecciones bacterianas.',        'Alergia a penicilinas.',           'Cápsulas 500mg, Suspensión 250mg/5ml', 'INVIMA2018M-0034567'),
  ('Loratadina 10mg',    'Loratadina',             'MK',              'OTC', 'Rinitis alérgica, urticaria.',    'Hipersensibilidad a loratadina.',  'Tabletas 10mg, Jarabe 5mg/5ml',        'INVIMA2021M-0045678'),
  ('Omeprazol 20mg',     'Omeprazol',              'Tecnoquímicas',   'Rx',  'Úlcera gástrica, reflujo.',       'Hipersensibilidad a omeprazol.',   'Cápsulas 10mg, 20mg, 40mg',            'INVIMA2017M-0056789'),
  ('Metformina 850mg',   'Metformina clorhidrato', 'Lafrancol',       'Rx',  'Diabetes mellitus tipo 2.',       'Insuficiencia renal severa.',      'Tabletas 500mg, 850mg, 1000mg',        'INVIMA2016M-0067890'),
  ('Salbutamol 100mcg',  'Salbutamol sulfato',     'GlaxoSmithKline', 'Rx',  'Broncoespasmo en asma y EPOC.',  'Hipersensibilidad a salbutamol.', 'Inhalador 100mcg/dosis',               'INVIMA2019M-0078901');
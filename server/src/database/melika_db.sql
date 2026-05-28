
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



-- MELIKA — Migración: categorías para medicamentos seed
-- Ejecutar una sola vez después del seed inicial.


-- 1. Asignar categoría a cada medicamento sembrado
UPDATE medicamentos SET categoria = 'Analgésicos y Antipiréticos'
  WHERE nombre_comercial = 'Acetaminofén 500mg';

UPDATE medicamentos SET categoria = 'Antiinflamatorios (AINEs)'
  WHERE nombre_comercial = 'Ibuprofeno 400mg';

UPDATE medicamentos SET categoria = 'Antibióticos'
  WHERE nombre_comercial = 'Amoxicilina 500mg';

UPDATE medicamentos SET categoria = 'Antihistamínicos'
  WHERE nombre_comercial = 'Loratadina 10mg';

UPDATE medicamentos SET categoria = 'Gastrointestinal'
  WHERE nombre_comercial = 'Omeprazol 20mg';

UPDATE medicamentos SET categoria = 'Antidiabéticos'
  WHERE nombre_comercial = 'Metformina 850mg';

UPDATE medicamentos SET categoria = 'Respiratorio'
  WHERE nombre_comercial = 'Salbutamol 100mcg';


-- 2. Medicamentos adicionales para un catálogo más robusto (opcional)
INSERT INTO medicamentos
  (nombre_comercial, principio_activo, laboratorio, categoria, tipo,
   descripcion, indicaciones, contraindicaciones, presentaciones, registro_invima)
VALUES
  ('Azitromicina 500mg',  'Azitromicina dihidrato',  'Genfar',          'Antibióticos',
   'Rx',
   'Antibiótico macrólido de amplio espectro. Usado en infecciones respiratorias, de piel y tejidos blandos.',
   'Tomar 1 tableta al día por 3 días o según pauta médica. Puede tomarse con o sin alimentos.',
   'Hipersensibilidad a macrólidos, arritmias cardiacas (prolongación QT), insuficiencia hepática grave.',
   'Cápsulas 500mg, Suspensión 200mg/5mL', 'INVIMA2020M-0091234'),

  ('Cetirizina 10mg',     'Cetirizina clorhidrato',  'Pfizer',          'Antihistamínicos',
   'OTC',
   'Antihistamínico de segunda generación con escasa sedación. Indicado en rinitis alérgica y urticaria crónica.',
   'Tomar 1 tableta por día, preferiblemente por la noche.',
   'Hipersensibilidad a la cetirizina o hidroxizina, insuficiencia renal grave.',
   'Tabletas 10mg, Solución 5mg/5mL', 'INVIMA2018M-0082345'),

  ('Pantoprazol 40mg',    'Pantoprazol sódico',      'Tecnoquímicas',   'Gastrointestinal',
   'Rx',
   'Inhibidor de la bomba de protones. Reduce la producción de ácido gástrico.',
   'Tomar 1 tableta en ayunas 30 minutos antes del desayuno. Tragar entera sin masticar.',
   'Hipersensibilidad al pantoprazol o benzimidazoles sustituidos.',
   'Tabletas gastrorresistentes 20mg y 40mg', 'INVIMA2019M-0073456'),

  ('Losartán 50mg',       'Losartán potásico',       'MK',              'Cardiovascular',
   'Rx',
   'Antagonista del receptor de angiotensina II. Tratamiento de hipertensión arterial y protección renal en diabéticos.',
   'Tomar 1 tableta al día a la misma hora. La dosis puede ajustarse a criterio médico.',
   'Embarazo (2.° y 3.° trimestre), hipersensibilidad, hiperpotasemia severa.',
   'Tabletas 25mg, 50mg y 100mg', 'INVIMA2017M-0064567'),

  ('Atorvastatina 20mg',  'Atorvastatina cálcica',   'Lafrancol',       'Cardiovascular',
   'Rx',
   'Estatina para reducción de colesterol LDL y prevención de eventos cardiovasculares.',
   'Tomar 1 tableta cada noche junto con dieta baja en grasas saturadas.',
   'Hepatopatía activa, embarazo, lactancia, miopatía preexistente.',
   'Tabletas recubiertas 10mg, 20mg, 40mg, 80mg', 'INVIMA2016M-0055678'),

  ('Betametasona crema 0.05%', 'Betametasona dipropionato', 'Tecnoquímicas', 'Dermatología',
   'Rx',
   'Corticoide tópico de alta potencia para dermatosis inflamatorias como psoriasis y eccema.',
   'Aplicar capa delgada en área afectada 1-2 veces al día. Uso máximo 2 semanas continuas.',
   'Infecciones cutáneas virales, bacterianas o fúngicas no tratadas, rosácea, acné.',
   'Crema 0.05% tubo x 40g, Ungüento 0.05% tubo x 40g', 'INVIMA2021M-0046789'),

  ('Ácido Fólico 5mg',    'Ácido fólico (vitamina B9)', 'Sanofi',        'Vitaminas y Suplementos',
   'OTC',
   'Vitamina B9 esencial para síntesis de ADN y división celular. Prevención de defectos del tubo neural.',
   'Tomar 1 tableta diaria, preferiblemente antes del desayuno. En embarazo iniciar al menos 1 mes antes de la concepción.',
   'Anemia perniciosa no tratada, hipersensibilidad al ácido fólico.',
   'Tabletas 1mg y 5mg', 'INVIMA2022M-0037890'),

  ('Gabapentina 300mg',   'Gabapentina',             'Procaps',         'Neurología',
   'Rx',
   'Antiepiléptico y analgésico neuropático. Indicado en neuropatía diabética, neuralgia postherpética y epilepsia parcial.',
   'Iniciar con dosis baja (300mg/día) e incrementar según tolerancia según esquema médico.',
   'Hipersensibilidad, antecedente de pancreatitis. No suspender abruptamente.',
   'Cápsulas 100mg, 300mg, 400mg', 'INVIMA2019M-0028901');

-- Verificación rápida
SELECT categoria, COUNT(*) AS total, string_agg(tipo, ', ') AS tipos
FROM medicamentos
WHERE activo = TRUE
GROUP BY categoria
ORDER BY categoria;
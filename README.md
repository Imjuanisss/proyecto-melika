# MELIKA

**Plataforma web para la gestión de citas médicas e historias clínicas.**

Melika es un sistema full-stack que conecta pacientes, médicos y personal
administrativo en un solo lugar: agendamiento de citas, historias clínicas
digitales, gestión de especialidades y médicos, y generación de documentos
clínicos en PDF (historias, fórmulas médicas, órdenes de exámenes).

Desarrollado en un contexto académico, con estándares de calidad y
documentación orientados a un producto de uso real.

---

## Tabla de contenido

- [MELIKA](#melika)
  - [Tabla de contenido](#tabla-de-contenido)
  - [Características](#características)
  - [Arquitectura](#arquitectura)
  - [Stack tecnológico](#stack-tecnológico)
  - [Estructura del repositorio](#estructura-del-repositorio)
  - [Puesta en marcha](#puesta-en-marcha)
    - [Requisitos previos](#requisitos-previos)
    - [1. Clonar el repositorio](#1-clonar-el-repositorio)
    - [2. Backend](#2-backend)
    - [3. Frontend](#3-frontend)
    - [4. Base de datos](#4-base-de-datos)
  - [Variables de entorno](#variables-de-entorno)
  - [Pruebas](#pruebas)
  - [Despliegue](#despliegue)
  - [Roles de usuario](#roles-de-usuario)
  - [Licencia](#licencia)
  - [Autores](#autores)

---

## Características

**Gestión de citas médicas**
- Agendamiento, consulta, reprogramación y cancelación de citas.
- Vista de horarios y disponibilidad por médico y especialidad.

**Historias clínicas**
- Registro y consulta de historias clínicas por parte del personal médico.
- Módulo de aclaraciones clínicas, con notificación en tiempo real dentro de
  la interfaz cuando se registra una nueva aclaración.
- Generación de historias, fórmulas médicas y órdenes de examen en PDF
  (`@react-pdf/renderer`), visualizables directamente en el navegador sin
  necesidad de descarga (`@pdfslick/react`).

**Administración**
- Gestión de médicos y especialidades desde un panel administrativo.
- Flujo de invitación y activación de cuentas médicas.

**Autenticación y seguridad**
- Registro e inicio de sesión con verificación por código de 6 dígitos.
- Recuperación de contraseña.
- Autenticación basada en JWT y control de acceso por rol a nivel de rutas
  de la API.

**Infraestructura**
- Backend en Node.js/Express con PostgreSQL (`pg.Pool` para *connection
  pooling*).
- Frontend en React + Vite, con sistema de diseño propio en CSS puro
  (variables `--melika-*`, estética glassmorphism) — sin frameworks de UI
  como Tailwind o Bootstrap.
- Despliegue unificado en Railway (frontend, backend y base de datos).

---

## Arquitectura

```
┌─────────────┐        HTTPS / JWT        ┌──────────────┐        SQL        ┌────────────┐
│   Cliente    │ ────────────────────────▶ │   Servidor    │ ─────────────────▶ │ PostgreSQL │
│  React + Vite│ ◀──────────────────────── │ Node + Express│ ◀───────────────── │            │
└─────────────┘                            └──────────────┘                    └────────────┘
```

- El cliente consume la API mediante un cliente HTTP centralizado
  (`client/src/lib/apiClient.js`), configurado con la variable de entorno
  `VITE_API_URL`.
- El servidor separa la definición de la app Express (`server/src/app.js`)
  del arranque del servidor (`server/src/server.js`) para permitir pruebas
  de integración con Supertest sin levantar un puerto real.
- La sesión del usuario se persiste en `localStorage` bajo las claves
  `melika_token` y `melika_usuario`, gestionadas desde `AuthContext.jsx`.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite, React Router 7, CSS puro |
| Componentes clínicos | `@react-pdf/renderer`, `@pdfslick/react` |
| Calendario y horarios | FullCalendar (`@fullcalendar/react`) |
| Backend | Node.js, Express 5 |
| Base de datos | PostgreSQL (`pg`) |
| Autenticación | JWT (`jsonwebtoken`), `bcrypt` |
| Correo | Nodemailer |
| Pruebas | Jest, Supertest |
| Despliegue | Railway (Nixpacks) |

---

## Estructura del repositorio

```
proyecto-melika/
├── client/                  # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/      # Componentes reutilizables (historias, horarios, layout, ui)
│   │   ├── pages/            # Vistas por módulo (admin, agendar, dashboard, login, etc.)
│   │   ├── context/           # AuthContext (JWT + estado de sesión)
│   │   ├── lib/                # Cliente HTTP centralizado
│   │   ├── services/           # Llamadas a la API por dominio
│   │   ├── utils/               # Validaciones clínicas
│   │   └── styles/               # Design tokens (--melika-*)
│   └── vite.config.js
├── server/                  # Backend (Node + Express)
│   └── src/
│       ├── controllers/       # Lógica de negocio por dominio
│       ├── routes/             # Definición de endpoints
│       ├── middleware/          # Autenticación / autorización
│       ├── services/             # Envío de correos, integraciones externas
│       ├── database/               # Esquema SQL de PostgreSQL
│       └── utils/                   # Validaciones de historias y registro
├── LICENSE
├── CHANGELOG.md
└── README.md
```

---

## Puesta en marcha

### Requisitos previos

- Node.js `>= 20`
- PostgreSQL en ejecución (local o remoto)

### 1. Clonar el repositorio

```bash
git clone https://github.com/Imjuanisss/proyecto-melika.git
cd proyecto-melika
```

### 2. Backend

```bash
cd server
npm install
# configura tu archivo .env (ver sección de Variables de entorno)
npm run dev
```

El servidor arranca por defecto en `http://localhost:3000`.

### 3. Frontend

```bash
cd client
npm install
# configura tu archivo .env (ver sección de Variables de entorno)
npm run dev
```

El cliente arranca por defecto en `http://localhost:5173`.

### 4. Base de datos

Ejecuta el script de esquema en tu instancia de PostgreSQL:

```bash
psql -U <usuario> -d <nombre_bd> -f server/src/database/melika_db.sql
```

---

## Variables de entorno

**Servidor (`server/.env`)**

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (por defecto `3000`) |
| `FRONTEND_URL` | URL del frontend permitida por CORS |
| `DATABASE_URL` / credenciales de `pg` | Conexión a PostgreSQL |
| `JWT_SECRET` | Clave de firma para los tokens JWT |
| Credenciales SMTP | Configuración de Nodemailer para envío de correos |

**Cliente (`client/.env`)**

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API del backend |

> Todas las variables del cliente deben ir prefijadas con `VITE_`, requisito
> de Vite para exponerlas al bundle del navegador.

---

## Pruebas

El backend incluye pruebas unitarias y de integración con Jest y Supertest:

```bash
cd server
npm test              # ejecuta la suite de pruebas
npm run test:coverage # ejecuta las pruebas con reporte de cobertura
```

---

## Despliegue

El proyecto está preparado para desplegarse en **Railway**:

- **Backend:** `npm start` levanta el servidor Express directamente.
- **Frontend:** se construye con `npm run build` y se sirve el contenido
  estático de `dist/` mediante `serve` (`npm start` → `serve -s dist -l $PORT`).

Cada servicio (frontend, backend, base de datos) se administra como un
servicio independiente dentro del mismo proyecto de Railway.

---

## Roles de usuario

Melika distingue tres roles con permisos y vistas diferenciadas:

| Rol | Descripción |
|---|---|
| **Paciente** | Agenda y consulta sus propias citas, revisa su historia clínica y descarga sus documentos en PDF. |
| **Médico** | Gestiona su agenda, registra historias clínicas y aclaraciones, y emite fórmulas y órdenes de examen. |
| **Administrador** | Gestiona médicos, especialidades e invitaciones de acceso al sistema. |

---

## Licencia

Este proyecto está licenciado bajo los términos de la
[**PolyForm Noncommercial License 1.0.0**](./LICENSE).

En resumen: el código puede usarse, estudiarse y modificarse libremente con
fines **no comerciales** (personales, educativos, de investigación). Cualquier
uso comercial requiere autorización expresa de los titulares del proyecto.

Copyright © 2026 Juan Olarte y Faber Osorio.

---

## Autores

- **Juan Olarte** — [@Imjuanisss](https://github.com/Imjuanisss)
- **Faber Osorio**

Proyecto desarrollado en un contexto académico, Caldas, Antioquia, Colombia.
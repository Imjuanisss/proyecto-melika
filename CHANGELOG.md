# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato sigue las convenciones de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/) (`MAJOR.MINOR.PATCH`).

---

## [1.0.0] - 2026-07-03

Primera versión estable del sistema **Melika**, plataforma web para la gestión de historias
clínicas, orientada a pacientes y personal médico.

### Added — Funcionalidades

**Gestión de historias clínicas**
- Registro, consulta y actualización de historias clínicas por parte del personal médico.
- Panel diferenciado por rol: vista de **paciente** y vista de **médico**, cada una con permisos
  y flujos de trabajo propios.

**Citas médicas**
- Solicitud, consulta y gestión del ciclo de vida de citas médicas entre paciente y médico.

**Aclaraciones clínicas**
- Módulo de aclaraciones (`FormularioAclaracion`) para que el personal médico registre
  precisiones sobre una historia clínica o atención.
- Notificación en tiempo real dentro de la interfaz mediante evento personalizado
  (`melika:aclaracion-creada`) al crear una nueva aclaración.

**Documentos en PDF**
- Generación de documentos clínicos (historias, fórmulas, aclaraciones) en formato PDF
  mediante `@react-pdf/renderer`, disponibles tanto para pacientes como para médicos.
- Visualización de documentos PDF embebida en la aplicación mediante `@pdfslick/react` (v4),
  sin necesidad de descargar el archivo para consultarlo.

**Autenticación y roles**
- Registro e inicio de sesión de usuarios.
- Control de acceso basado en roles (paciente / médico) a nivel de rutas de la API.

**Infraestructura**
- Backend construido sobre Node.js y Express, con acceso a PostgreSQL mediante *connection
  pooling* (`pg.Pool`) para optimizar el manejo concurrente de consultas.
- Frontend construido con React y Vite, estilizado con CSS puro (sin frameworks de UI).
- Despliegue unificado en Railway: frontend, backend y base de datos administrados sobre la
  misma plataforma.

### Fixed — Correcciones previas al release

Estas correcciones surgieron de la auditoría integral realizada sobre el proyecto antes de este
lanzamiento:

- **Cancelación de citas:** se corrigió una ruta rota en el flujo de cancelación que impedía
  completar la operación desde el cliente.
- **`FormularioAclaracion` no se montaba:** el componente existía en el código pero nunca se
  renderizaba en el árbol de React, dejando la funcionalidad inaccesible para el usuario final.
  Se corrigió su montaje en el flujo correspondiente.
- **Evento `melika:aclaracion-creada` sin listener:** el evento se emitía correctamente al crear
  una aclaración, pero ningún listener lo capturaba, por lo que la interfaz no se actualizaba
  automáticamente. Se añadió el listener correspondiente para refrescar la UI en tiempo real.

### Known limitations — Limitaciones conocidas

Se documentan de forma transparente para dar contexto a este primer release:

- No existe todavía una suite de pruebas automatizadas (unitarias o E2E) integrada al flujo de
  desarrollo.
- El manejo de errores y logs en el backend no está centralizado (por ejemplo, con Winston u
  otra herramienta equivalente).
- No se ha implementado *rate limiting* en los endpoints de autenticación.

### Security — Seguridad

- Dado que el sistema procesa información clínica sensible, se recomienda validar antes de
  producción: políticas de CORS restringidas a dominios autorizados, variables de entorno
  (`.env`) excluidas del control de versiones, y cumplimiento de la Ley 1581 de 2012 sobre
  protección de datos personales en Colombia.

---

## [Unreleased]

Sección reservada para cambios que aún no forman parte de una versión publicada.

### Planned
- Suite de pruebas automatizadas (Jest + Playwright).
- Logs centralizados en el backend.
- Rate limiting en endpoints de autenticación.
- Migración del almacenamiento de PDF a un proveedor externo (S3 / Cloudinary).
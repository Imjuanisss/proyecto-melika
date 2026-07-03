# Requerimientos No Funcionales - Proyecto MELIKA

## 1. Requerimientos No Funcionales - Interfaz de Usuario

| Código | Nombre | Descripción |
|--------|--------|-------------|
| RNF001 | Perceptible | La información se muestra al usuario en forma clara y teniendo en cuenta que entiendan los contenidos, proporciona texto alterno para que el contenido no sea solamente textual y de tal forma que pueda ser transformado en formatos necesarios para usuarios con discapacidades. El contenido debe ser adaptable, para ser presentado en diferentes formas sin perder información ni estructura. Debe permitir a los usuarios ver y escuchar el contenido incluyendo la distinción entre lo menos y más importante. |
| RNF002 | Operable | Los componentes de la interfaz de usuario y su navegabilidad deben ser manejables. El teclado debe contener todas las funciones activas, el tiempo debe ser suficiente para que los usuarios puedan leer y utilizar el contenido, tener en cuenta que el contenido debe estar diseñado para evitar ataques epilépticos, debe proporcionar ayudas y búsquedas para los usuarios. |
| RNF003 | Comprensible | Tanto las operaciones como la información contenida en la interfaz debe ser comprensible por los usuarios. Legible, previsible y debe evitar y corregir errores de ingreso de datos. |
| RNF004 | Robustez | El contenido de las interfaces debe ser interpretado por diferentes usuarios de acuerdo con su rol en la aplicación, adicionalmente debe ser compatible con los actuales y futuros usuarios. |

---

## 2. Requerimientos No Funcionales - Desarrollo, Desempeño y Seguridad

| Código | Nombre | Descripción |
|--------|--------|-------------|
| RNF009 | Escalabilidad | En el desarrollo del producto se tiene que tener en cuenta la escalabilidad de la aplicación puesto que está sujeta a cambios de acuerdo a las necesidades de los actores del proceso y modificación de las normas internas y externas. |
| RNF010 | Mantenibilidad | El sistema de información debe permitir el mantenimiento de las bases de datos y de los procesos de forma sencilla sin que altere el desempeño general de la aplicación. |
| RNF011 | Rendimiento | La respuesta de la aplicación a la hora de ejecutarse alguno de sus requerimientos funcionales no debe alargarse en el tiempo, las respuestas a los eventos deben ser rápidos. |
| RNF012 | Espacio de Almacenamiento | El sistema completo deberá ser posible almacenarlo en el mismo equipo y en dispositivos externos. |
| RNF013 | Fiabilidad | El sistema debe ser fiable, puesto que un error de la aplicación puede causar penalizaciones a los usuarios y costos adicionales a la empresa. |
| RNF014 | Seguridad | El acceso a la aplicación está restringido de acuerdo al rol que desempeñe el usuario. Cada uno debe tener un usuario y clave de acceso que le permite ingresar a su sesión y realizar únicamente las tareas permitidas. Las demás seguridades están de acuerdo con la norma ISO/IEC 27003. |

---

## 3. Requerimientos No Funcionales - Hardware y Software

| Código | Nombre | Descripción |
|--------|--------|-------------|
| RNF015 | Impresora Láser | Para cumplir con los requerimientos funcionales RF001, RF003, RF005. Impresora de alta calidad para generación de reportes y documentos. |
| RNF016 | Impresora de Etiquetas | Impresora de etiquetas tipo desktop, 4.13" de ancho, 203 DPI, transferencia térmica o térmica directa, puertos USB y Serial, códigos 1D, 2D y gráficos; velocidad 4pps. |
| RNF017 | Hardware | Hardware indicado en el inventario tecnológico de la empresa. La aplicación se debe poder ejecutar en los equipos existentes para cada usuario. |
| RNF018 | Software - Lenguaje de Programación | La aplicación se desarrolla principalmente en JavaScript (Node.js/React) por ser un lenguaje moderno, orientado a la web, de uso libre y multiplataforma. Con MySQL como gestor de bases de datos. |
| RNF019 | Software - Herramientas Adicionales | Deben estar disponibles los plugins necesarios para generación de informes y exportación a Excel para reportes de análisis. |
| RNF020 | Sistema Operativo | La aplicación puede ser desarrollada y ejecutada en cualquier plataforma (Windows, Linux, macOS). |
| RNF021 | Navegadores Soportados | La aplicación se debe ejecutar en cualquiera de los siguientes navegadores en sus últimas versiones: Google Chrome, Mozilla Firefox, Microsoft Edge/Explorer. |

---

## Notas de Implementación

- Estos requerimientos no funcionales deben validarse durante todas las fases del desarrollo.
- Se recomienda realizar pruebas de accesibilidad (WCAG 2.1) para cumplir con RNF001-RNF004.
- Las pruebas de rendimiento deben ejecutarse regularmente para cumplir con RNF011.
- La seguridad debe ser auditada según ISO/IEC 27003 (RNF014).
- Se debe mantener compatibilidad con navegadores actuales y futuros (RNF021).


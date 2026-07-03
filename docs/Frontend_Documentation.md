# 📚 Documentación Frontend - Proyecto MELIKA

## Índice
1. [Descripción General](#descripción-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
4. [Estructura de Directorios](#estructura-de-directorios)
5. [Componentes Principales](#componentes-principales)
6. [Guía de Estilos](#guía-de-estilos)
7. [Sistema de Rutas](#sistema-de-rutas)
8. [Flujo de Datos](#flujo-de-datos)
9. [Integración API](#integración-api)
10. [Seguridad](#seguridad)
11. [Pruebas y Control de Calidad](#pruebas-y-control-de-calidad)
12. [Despliegue](#despliegue)
13. [Convenciones de Código](#convenciones-de-código)
14. [Resolución de Problemas](#resolución-de-problemas)

---

## 📖 Descripción General

### 1.1 Propósito del Frontend

El frontend de **MELIKA** es la interfaz de usuario responsable de la presentación visual y la interacción con los usuarios. Se desarrolla como una aplicación web moderna, escalable y accesible que cumple con los estándares WCAG 2.1 y las normativas de seguridad ISO/IEC 27003.

### 1.2 Objetivos Principales

- ✅ Proporcionar una interfaz intuitiva y responsive
- ✅ Garantizar accesibilidad para todos los usuarios (RNF001-RNF004)
- ✅ Mantener rendimiento óptimo (RNF011)
- ✅ Implementar seguridad mediante roles de usuario (RNF014)
- ✅ Asegurar compatibilidad multiplataforma (RNF020-RNF021)
- ✅ Facilitar mantenibilidad y escalabilidad (RNF009-RNF010)

### 1.3 Público Objetivo

- Administradores del sistema
- Gestores de inventario
- Supervisores de ventas
- Usuarios finales del sistema MELIKA

---

## 🛠️ Stack Tecnológico

### 2.1 Lenguajes y Frameworks

| Tecnología | Versión | Propósito |
|-----------|---------|----------|
| **HTML5** | 5.0+ | Estructura semántica de vistas |
| **CSS3** | 3.0+ | Estilos responsivos con Flexbox y Grid |
| **JavaScript** | ES6+ | Lógica de aplicación y manipulación del DOM |
| **React** | 18.x | Librería de componentes y gestión de estado |
| **Vue.js** (opcional) | 3.x | Framework alternativo progresivo |

### 2.2 Herramientas y Librerías

| Herramienta | Descripción | Funcionalidad |
|-----------|-----------|-------------|
| **Iconografía** | Font Awesome 6.1 | Ícones escalables en SVG |
| **Tipografía** | Google Fonts | Fuentes variables optimizadas |
| **Lógica de Cliente** | JavaScript ES6+ | Módulos independientes por ruta |
| **Comunicación API** | Fetch API / Axios | Peticiones asincrónicas HTTP/HTTPS |
| **Almacenamiento Local** | sessionStorage / localStorage | Persistencia segura en navegador |
| **Herramientas de Desarrollo** | Webpack / Vite | Bundling y hot reload |
| **Testing** | Playwright 1.40+ | Automatización de pruebas E2E |
| **Despliegue** | Railway | Despliegue continuo desde repositorio GitHub |

### 2.3 Navegadores Soportados

| Navegador | Versión Mínima | Estado |
|-----------|----------------|--------|
| Google Chrome | 90+ | ✅ Completamente soportado |
| Mozilla Firefox | 88+ | ✅ Completamente soportado |
| Microsoft Edge | 90+ | ✅ Completamente soportado |
| Safari | 14+ | ⚠️ Soporte limitado |

---

## 🏗️ Arquitectura del Proyecto

### 3.1 Patrón Arquitectónico

MELIKA utiliza una arquitectura modular basada en **componentes** siguiendo el patrón MVC (Model-View-Controller) adaptado a la web moderna:

```
┌─────────────────────────────────────────┐
│         Capa de Presentación            │
│  (Componentes Vue/React, HTML, CSS)     │
├─────────────────────────────────────────┤
│         Capa de Lógica de Negocio       │
│  (JavaScript, gestión de estado, rutas) │
├─────────────────────────────────────────┤
│     Capa de Integración (API Layer)     │
│  (Fetch, Axios, manejo de respuestas)   │
├─────────────────────────────────────────┤
│         Backend - API REST               │
│  (Node.js/Express, datos, seguridad)    │
└─────────────────────────────────────────┘
```

### 3.2 Principios de Diseño

1. **Separación de Responsabilidades**: Cada módulo tiene una función específica
2. **Reutilización de Componentes**: Componentes genéricos y específicos
3. **Escalabilidad Horizontal**: Fácil agregar nuevas funcionalidades
4. **Mantenibilidad**: Código limpio y bien documentado
5. **Accesibilidad**: WCAG 2.1 AA compliance

---

## 📁 Estructura de Directorios

```
proyecto-melika/
├── docs/
│   ├── Frontend_Documentation.md
│   ├── Requerimientos_No_Funcionales.md
│   └── API_Reference.md
│
├── public/
│   ├── index.html              # Página principal HTML5
│   ├── favicon.ico
│   └── manifest.json           # PWA manifest
│
├── src/
│   ├── index.js                # Punto de entrada
│   ├── styles/
│   │   ├── global.css          # Estilos globales
│   │   ├── variables.css       # Variables CSS (colores, tipografía)
│   │   ├── reset.css           # Reset de estilos del navegador
│   │   └── responsive.css      # Media queries y breakpoints
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.js       # Encabezado principal
│   │   │   ├── Navbar.js       # Barra de navegación
│   │   │   ├── Footer.js       # Pie de página
│   │   │   ├── Modal.js        # Componente modal reutilizable
│   │   │   └── Toast.js        # Notificaciones emergentes
│   │   │
│   │   ├── auth/
│   │   │   ├── Login.js        # Formulario de inicio de sesión
│   │   │   ├── Register.js     # Formulario de registro
│   │   │   └── AuthGuard.js    # Protección de rutas
│   │   │
│   │   ├── products/
│   │   │   ├── ProductList.js
│   │   │   ├── ProductDetail.js
│   │   │   ├── ProductForm.js
│   │   │   └── ProductCard.js
│   │   │
│   │   ├── users/
│   │   │   ├── UserProfile.js
│   │   │   ├── UserList.js
│   │   │   └── UserForm.js
│   │   │
│   │   └── dashboard/
│   │       ├── Dashboard.js
│   │       ├── Analytics.js
│   │       └── Reports.js
│   │
│   ├── pages/
│   │   ├── HomePage.js
│   │   ├── LoginPage.js
│   │   ├── DashboardPage.js
│   │   ├── ProductsPage.js
│   │   ├── UsersPage.js
│   │   └── NotFoundPage.js
│   │
│   ├── services/
│   │   ├── api.js              # Configuración base de API
│   │   ├── auth.js             # Servicio de autenticación
│   │   ├── products.js         # Servicio de productos
│   │   ├── users.js            # Servicio de usuarios
│   │   └── storage.js          # Servicio de almacenamiento local
│   │
│   ├── utils/
│   │   ├── validators.js       # Validadores de formularios
│   │   ├── formatters.js       # Formateo de datos
│   │   ├── constants.js        # Constantes de aplicación
│   │   ├── helpers.js          # Funciones de utilidad
│   │   └── error-handler.js    # Manejo centralizado de errores
│   │
│   ├── store/
│   │   ├── state.js            # Estado global
│   │   ├── actions.js          # Acciones (llamadas a API)
│   │   ├── mutations.js        # Mutaciones de estado
│   │   └── getters.js          # Selectores de estado
│   │
│   ├── middleware/
│   │   ├── auth.js             # Middleware de autenticación
│   │   ├── logging.js          # Logging de eventos
│   │   └── error-handler.js    # Manejo de errores global
│   │
│   ├── router/
│   │   └── routes.js           # Definición de rutas
│   │
│   └── assets/
│       ├── images/
│       ├── icons/
│       └── fonts/
│
├── tests/
│   ├── unit/
│   │   ├── components.test.js
│   │   ├── services.test.js
│   │   └── utils.test.js
│   │
│   ├── e2e/
│   │   ├── auth.spec.js
│   │   ├── products.spec.js
│   │   └── users.spec.js
│   │
│   └── integration/
│       └── api.test.js
│
├── .env.example                # Variables de entorno de ejemplo
├── .env.development            # Desarrollo
├── .env.production             # Producción
├── .eslintrc.json              # Configuración ESLint
├── .prettierrc                 # Configuración Prettier
├── webpack.config.js           # Configuración Webpack
├── package.json                # Dependencias del proyecto
├── package-lock.json
└── README.md
```

---

## 🧩 Componentes Principales

### 4.1 Estructura de Componentes

Cada componente sigue la siguiente estructura estándar:

```javascript
// components/ExampleComponent.js
/**
 * ExampleComponent
 * 
 * Descripción breve del propósito del componente
 * 
 * @component
 * @example
 * const args = { title: 'Ejemplo', onClick: () => {} }
 * return <ExampleComponent {...args} />
 */

import React, { useState, useEffect } from 'react';
import './ExampleComponent.css';

function ExampleComponent({ 
  title = 'Título por defecto',
  onClick,
  disabled = false,
  children 
}) {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Lógica de inicialización
  }, []);

  const handleClick = () => {
    // Lógica del manejador
    onClick?.();
  };

  return (
    <div className="example-component" role="region" aria-label={title}>
      <h2>{title}</h2>
      <button 
        onClick={handleClick}
        disabled={disabled}
        aria-disabled={disabled}
      >
        {children}
      </button>
    </div>
  );
}

export default ExampleComponent;
```

### 4.2 Componentes Principales por Módulo

#### **4.2.1 Componentes de Autenticación**

- **Login.js**: Formulario de inicio de sesión con validación
- **Register.js**: Registro de nuevos usuarios
- **AuthGuard.js**: Protección de rutas requiere autenticación
- **ProfileDropdown.js**: Menú desplegable del usuario

#### **4.2.2 Componentes de Productos**

- **ProductList.js**: Listado paginado con filtros
- **ProductCard.js**: Tarjeta individual de producto
- **ProductDetail.js**: Vista detallada con especificaciones
- **ProductForm.js**: Formulario CRUD de productos
- **ProductFilters.js**: Panel de filtros avanzados

#### **4.2.3 Componentes de Usuarios**

- **UserProfile.js**: Perfil de usuario con edición
- **UserList.js**: Tabla de usuarios con búsqueda
- **UserForm.js**: Formulario de gestión de usuarios
- **PermissionsPanel.js**: Asignación de roles y permisos

#### **4.2.4 Componentes Comunes (Reutilizables)**

- **Header.js**: Encabezado con logo y navegación
- **Navbar.js**: Barra lateral de navegación
- **Footer.js**: Pie de página con información
- **Modal.js**: Modal genérico para diálogos
- **Toast.js**: Notificaciones tipo toast (éxito, error, info)
- **Button.js**: Botón genérico con variantes
- **Input.js**: Campo de entrada con validación
- **Dropdown.js**: Selector desplegable
- **Table.js**: Tabla con paginación y ordenamiento
- **Spinner.js**: Indicador de carga

---

## 🎨 Guía de Estilos

### 5.1 Variables CSS

```css
/* styles/variables.css */
:root {
  /* Colores Primarios */
  --color-primary: #0066cc;
  --color-primary-dark: #0052a3;
  --color-primary-light: #e6f0ff;

  /* Colores Secundarios */
  --color-secondary: #ff6b35;
  --color-secondary-dark: #cc5528;
  --color-secondary-light: #ffe6d9;

  /* Estados */
  --color-success: #28a745;
  --color-warning: #ffc107;
  --color-danger: #dc3545;
  --color-info: #17a2b8;

  /* Escala de Grises */
  --color-dark: #2c3e50;
  --color-light: #ecf0f1;
  --color-gray-1: #f8f9fa;
  --color-gray-2: #e9ecef;
  --color-gray-3: #dee2e6;
  --color-gray-4: #adb5bd;
  --color-gray-5: #6c757d;

  /* Tipografía */
  --font-family-base: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-family-mono: 'Courier New', Courier, monospace;

  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;  /* 14px */
  --font-size-base: 1rem;    /* 16px */
  --font-size-lg: 1.125rem;  /* 18px */
  --font-size-xl: 1.25rem;   /* 20px */
  --font-size-2xl: 1.5rem;   /* 24px */
  --font-size-3xl: 1.875rem; /* 30px */

  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Espaciado */
  --spacing-xs: 0.25rem;  /* 4px */
  --spacing-sm: 0.5rem;   /* 8px */
  --spacing-md: 1rem;     /* 16px */
  --spacing-lg: 1.5rem;   /* 24px */
  --spacing-xl: 2rem;     /* 32px */
  --spacing-2xl: 3rem;    /* 48px */

  /* Bordes y Sombras */
  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.5rem;
  --border-radius-lg: 1rem;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  /* Transiciones */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 300ms ease-in-out;
  --transition-slow: 500ms ease-in-out;

  /* Breakpoints */
  --breakpoint-xs: 320px;
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}
```

### 5.2 Paleta de Colores

| Nombre | Valor | Uso |
|--------|-------|-----|
| Primary | #0066cc | Botones principales, vínculos |
| Secondary | #ff6b35 | Acciones secundarias |
| Success | #28a745 | Mensajes de éxito |
| Warning | #ffc107 | Advertencias |
| Danger | #dc3545 | Errores, destructivo |
| Info | #17a2b8 | Información |

### 5.3 Tipografía

- **Encabezados**: Segoe UI, peso 700
- **Cuerpo**: Segoe UI, peso 400
- **Código**: Courier New, peso 400

### 5.4 Espaciado y Layouts

- Espaciado base: 16px (1rem)
- Grid de 12 columnas para layouts responsivos
- Flexbox para alineación flexible
- CSS Grid para layouts complejos

---

## 🛣️ Sistema de Rutas

### 6.1 Definición de Rutas

```javascript
// router/routes.js
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { requiresAuth: false }
  },
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardPage,
    meta: { requiresAuth: true, role: ['admin', 'supervisor'] }
  },
  {
    path: '/products',
    name: 'products',
    component: ProductsPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/products/:id',
    name: 'product-detail',
    component: ProductDetailPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/users',
    name: 'users',
    component: UsersPage,
    meta: { requiresAuth: true, role: ['admin'] }
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfilePage,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundPage
  }
];

export default routes;
```

### 6.2 Mapa de Rutas

| Ruta | Componente | Autenticación | Roles Permitidos |
|------|-----------|----------------|------------------|
| `/` | HomePage | No | Todos |
| `/login` | LoginPage | No | Anónimo |
| `/register` | RegisterPage | No | Anónimo |
| `/dashboard` | DashboardPage | Sí | Admin, Supervisor |
| `/products` | ProductsPage | Sí | Todos autenticados |
| `/products/:id` | ProductDetailPage | Sí | Todos autenticados |
| `/products/new` | ProductFormPage | Sí | Admin |
| `/users` | UsersPage | Sí | Admin |
| `/users/:id` | UserDetailPage | Sí | Admin |
| `/profile` | ProfilePage | Sí | Todos autenticados |
| `/settings` | SettingsPage | Sí | Todos autenticados |
| `/*` | NotFoundPage | No | Todos |

---

## 🔄 Flujo de Datos

### 7.1 Ciclo de Vida de Datos

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │ (Interacción)
       ▼
┌─────────────────────────┐
│  Componente Vue/React   │
└──────┬──────────────────┘
       │ (Acción)
       ▼
┌─────────────────────────┐
│  Store/Estado Global    │
└──────┬──────────────────┘
       │ (Commit)
       ▼
┌─────────────────────────┐
│   Servicio API          │
└──────┬──────────────────┘
       │ (HTTP Request)
       ▼
┌─────────────────────────┐
│   Backend API/DB        │
└──────┬──────────────────┘
       │ (Response)
       ▼
┌─────────────────────────┐
│  Servicio API           │
└──────┬──────────────────┘
       │ (Dispatch)
       ▼
┌─────────────────────────┐
│   Store/Estado Global   │
└──────┬──────────────────┘
       │ (Propiedades actualizadas)
       ▼
┌─────────────────────────┐
│  Componente Vue/React   │
└──────┬──────────────────┘
       │ (Re-render)
       ▼
┌─────────────┐
│   Usuario   │
└─────────────┘
```

### 7.2 Gestión de Estado

```javascript
// store/state.js
export const state = {
  user: {
    id: null,
    name: '',
    email: '',
    role: '',
    avatar: null,
    isAuthenticated: false
  },
  products: {
    items: [],
    filters: {
      search: '',
      category: '',
      minPrice: 0,
      maxPrice: 999999
    },
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0
    }
  },
  ui: {
    loading: false,
    errors: [],
    notifications: []
  }
};

// store/mutations.js
export const mutations = {
  SET_USER(state, user) {
    state.user = { ...state.user, ...user };
  },
  SET_PRODUCTS(state, products) {
    state.products.items = products;
  },
  SET_LOADING(state, loading) {
    state.ui.loading = loading;
  }
};

// store/actions.js
export const actions = {
  async fetchProducts({ commit }, filters) {
    commit('SET_LOADING', true);
    try {
      const response = await api.get('/products', { params: filters });
      commit('SET_PRODUCTS', response.data.items);
    } catch (error) {
      commit('ADD_ERROR', error.message);
    } finally {
      commit('SET_LOADING', false);
    }
  }
};
```

---

## 🔌 Integración API

### 8.1 Configuración Base de API

```javascript
// services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para autenticación
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejo de errores
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirigir a login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 8.2 Servicios de API

```javascript
// services/products.js
import api from './api';

export const productsService = {
  // Obtener todos los productos
  getAll(filters = {}) {
    return api.get('/products', { params: filters });
  },

  // Obtener producto por ID
  getById(id) {
    return api.get(`/products/${id}`);
  },

  // Crear nuevo producto
  create(productData) {
    return api.post('/products', productData);
  },

  // Actualizar producto
  update(id, productData) {
    return api.put(`/products/${id}`, productData);
  },

  // Eliminar producto
  delete(id) {
    return api.delete(`/products/${id}`);
  },

  // Buscar productos
  search(query) {
    return api.get('/products/search', { params: { q: query } });
  }
};
```

### 8.3 Endpoints Disponibles

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|----------------|
| GET | `/products` | Listar productos | Requerida |
| GET | `/products/:id` | Obtener producto | Requerida |
| POST | `/products` | Crear producto | Requerida (Admin) |
| PUT | `/products/:id` | Actualizar producto | Requerida (Admin) |
| DELETE | `/products/:id` | Eliminar producto | Requerida (Admin) |
| GET | `/users` | Listar usuarios | Requerida (Admin) |
| GET | `/users/:id` | Obtener usuario | Requerida (Admin) |
| POST | `/auth/login` | Iniciar sesión | No requerida |
| POST | `/auth/logout` | Cerrar sesión | Requerida |

---

## 🔐 Seguridad

### 9.1 Autenticación y Autorización

```javascript
// middleware/auth.js
export const checkAuth = (to, from, next) => {
  const token = localStorage.getItem('auth_token');
  const user = JSON.parse(localStorage.getItem('user_data') || '{}');

  if (to.meta.requiresAuth) {
    if (!token || !user.id) {
      next('/login');
    } else if (to.meta.role && !to.meta.role.includes(user.role)) {
      next('/unauthorized');
    } else {
      next();
    }
  } else {
    next();
  }
};
```

### 9.2 Protección de Datos

1. **Tokens JWT**: Almacenados en localStorage con expiración
2. **HTTPS/SSL**: Todas las comunicaciones encriptadas
3. **CSRF Protection**: Tokens CSRF en formularios
4. **Input Validation**: Validación en cliente y servidor
5. **XSS Prevention**: Sanitización de entrada de usuario
6. **Role-Based Access Control (RBAC)**: Control granular por rol

### 9.3 Manejo de Secrets

```javascript
// .env.example
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_ENVIRONMENT=development
REACT_APP_LOG_LEVEL=debug

// .env.production
REACT_APP_API_URL=https://api.melika.com
REACT_APP_ENVIRONMENT=production
REACT_APP_LOG_LEVEL=error
```

---

## ✅ Pruebas y Control de Calidad

### 10.1 Estrategia de Pruebas

```
┌──────────────────────┐
│   Pruebas E2E        │  (Playwright, Cypress)
│  (Flujos completos)  │
└──────┬───────────────┘
       │
┌──────▼──────────────────┐
│  Pruebas de Integración │  (API + Componentes)
└──────┬───────────────────┘
       │
┌──────▼──────────────────┐
│   Pruebas Unitarias    │  (Jest, Vitest)
│  (Funciones, utilidades)│
└──────────────────────────┘
```

### 10.2 Configuración de Pruebas

```javascript
// tests/unit/components.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from '../../components/auth/Login';

describe('LoginForm Component', () => {
  it('debe renderizar el formulario de login', () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it('debe validar el email', async () => {
    render(<LoginForm />);
    const submitButton = screen.getByRole('button', { name: /enviar/i });
    fireEvent.click(submitButton);
    expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
  });
});
```

### 10.3 Pruebas E2E

```javascript
// tests/e2e/auth.spec.js
import { test, expect } from '@playwright/test';

test.describe('Flujo de autenticación', () => {
  test('debe permitir login exitoso', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    expect(page.url()).toContain('/dashboard');
  });
});
```

### 10.4 Métricas de Calidad

- **Cobertura de código**: Mínimo 80%
- **Performance**: Lighthouse score > 90
- **Accesibilidad**: WCAG 2.1 AA compliance
- **SEO**: Meta tags, sitemap.xml, robots.txt

---

## 🚀 Despliegue

### 11.1 Entornos

| Entorno | URL | Rama | Actualización |
|---------|-----|------|---------------|
| Desarrollo | http://localhost:3000 | develop | Manual |
| Staging | https://staging.melika.com | staging | Automática |
| Producción | https://melika.com | main | Automática |

### 11.2 Despliegue Continuo (CD)

```yaml
# .github/workflows/deploy.yml
name: Deploy Frontend

on:
  push:
    branches: [main, staging]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### 11.3 Checklist de Despliegue

- [ ] Pasar todas las pruebas unitarias
- [ ] Pasar pruebas E2E
- [ ] Validar score Lighthouse > 90
- [ ] Revisar cobertura de código
- [ ] Validar WCAG compliance
- [ ] Aprobar code review
- [ ] Actualizar variables de entorno
- [ ] Ejecutar smoke tests en producción
- [ ] Monitorear logs por 1 hora
- [ ] Notificar al equipo

---

## 📝 Convenciones de Código

### 12.1 Nomenclatura

```javascript
// Componentes: PascalCase
function UserProfile() { }
export default UserProfile;

// Funciones y variables: camelCase
const getUserData = () => { };
let userEmail = '';

// Constantes: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_TIMEOUT = 5000;

// Clases: PascalCase
class AuthService { }

// Archivos
// Componentes: UserProfile.js
// Servicios: auth.js
// Utilidades: validators.js
// Estilos: UserProfile.css
```

### 12.2 Estructura de Componentes

```javascript
import React, { useState, useEffect } from 'react';
import './Component.css';
import Icon from '../../assets/Icon';

/**
 * Descripción del componente
 * @component
 * @param {string} title - Título del componente
 * @param {function} onSubmit - Callback al enviar
 * @returns {JSX.Element}
 */
function Component({ title, onSubmit }) {
  // Estado
  const [state, setState] = useState(null);

  // Efectos
  useEffect(() => {
    // Lógica
  }, []);

  // Handlers
  const handleClick = () => {};

  // Render
  return (
    <div className="component">
      <h1>{title}</h1>
    </div>
  );
}

export default Component;
```

### 12.3 Comentarios y Documentación

```javascript
/**
 * Calcula el total con impuestos
 * @param {number} subtotal - Subtotal en dólares
 * @param {number} taxRate - Tasa de impuesto (0-1)
 * @returns {number} Total con impuestos
 * @throws {Error} Si los parámetros no son válidos
 */
function calculateTotal(subtotal, taxRate) {
  if (subtotal < 0 || taxRate < 0 || taxRate > 1) {
    throw new Error('Parámetros inválidos');
  }
  return subtotal * (1 + taxRate);
}
```

---

## 🔧 Resolución de Problemas

### 13.1 Problemas Comunes

#### **Problema: Página en blanco después del despliegue**

**Soluciones**:
1. Limpiar caché del navegador (Ctrl+Shift+Delete)
2. Verificar la consola para errores JavaScript
3. Revisar las variables de entorno en producción
4. Validar que el servidor backend está disponible

#### **Problema: Componentes no se actualizan**

**Soluciones**:
1. Verificar dependencias en hooks useEffect
2. Revisar que el estado se actualiza correctamente
3. Validar que no hay componentes memorizados innecesarios
4. Usar React DevTools para debuggear estado

#### **Problema: Lentitud en la aplicación**

**Soluciones**:
1. Ejecutar Lighthouse para identificar cuellos de botella
2. Implementar lazy loading de componentes
3. Optimizar imágenes con WebP
4. Implementar virtualización de listas largas
5. Revisar network tab para peticiones innecesarias

#### **Problema: Errores de CORS**

**Soluciones**:
1. Verificar que el backend permite CORS
2. Revisar headers de la petición
3. Usar proxy en desarrollo si es necesario
4. Validar que la URL del API es correcta

### 13.2 Herramientas de Debug

```javascript
// Habilitar logging en desarrollo
if (process.env.REACT_APP_ENVIRONMENT === 'development') {
  window.__DEBUG__ = true;
  console.log('Debug mode enabled');
}

// Logger helper
const logger = {
  log: (msg, data) => window.__DEBUG__ && console.log(`[LOG] ${msg}`, data),
  error: (msg, error) => console.error(`[ERROR] ${msg}`, error),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data)
};

export default logger;
```

### 13.3 Contacto y Soporte

- **GitHub Issues**: [Reportar bugs](https://github.com/Imjuanisss/proyecto-melika/issues)
- **Email**: olartemejiajuanesteban@gmail.com
- **Documentación**: Ver carpeta `/docs`

---

## 📚 Referencias Adicionales

- [React Documentation](https://react.dev)
- [MDN Web Docs](https://developer.mozilla.org)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [HTTP Status Codes](https://httpwg.org/specs/rfc9110.html#status.codes)
- [ISO/IEC 27003](https://www.iso.org/standard/42103.html)

---

## 📋 Changelog

### Versión 1.0.0 - Julio 2026
- ✅ Documentación inicial del frontend
- ✅ Estructura de componentes definida
- ✅ Guía de estilos completa
- ✅ Sistema de rutas implementado

---

**Última actualización**: Julio 3, 2026  
**Autor**: Equipo MELIKA  
**Estado**: 🟢 Activo


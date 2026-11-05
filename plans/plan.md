# Anime Web App — Spec Driven Development (SDD)

Versión: 1.0  
Arquitectura: Feature First + Component Driven  
Framework Frontend: Angular  
Paradigma UI: Minimalista profesional elegante, sin tanto color neon o brillo excesivo 
Estrategia de Renderizado: SPA  
Estrategia de Componentes: Web Components con Angular Elements

---

# 1. VISIÓN GENERAL DEL PROYECTO

## Objetivo

Crear una aplicación web moderna de catálogo de anime utilizando Angular y Web Components.

La aplicación debe permitir a los usuarios:

- Explorar animes recientes y populares
- Buscar animes usando la API de Jikan
- Ver detalles de un anime
- Gestionar una lista personal de animes:
  - Viendo
  - Visto
  - Por ver

El proyecto debe estar preparado para desarrollo asistido por IA utilizando la metodología Spec Driven Development.

---

# 2. TECNOLOGÍAS OBLIGATORIAS

## Frontend

- Angular (última versión estable)
- TypeScript
- Angular Standalone Components
- Angular Signals
- Angular Elements
- RxJS
- SCSS

---

# 3. PRINCIPIOS DEL PROYECTO

## Principios Arquitectónicos

- Arquitectura feature-first
- Componentes reutilizables
- Web Components encapsulados
- Código fuertemente tipado
- UI minimalista pero profesional y atractivo sin tanto color neon
- Responsive design
- Código preparado para IA
- Separación de responsabilidades
- Escalabilidad
- Componentes desacoplados

---

# 4. MÓDULOS PRINCIPALES

## Módulos

### 1. Anime Catalog

Catálogo principal de anime.

### 2. Anime Details

Página de detalles de anime.

### 3. Search System

Sistema de búsqueda y filtros.

### 4. My Animes

Sistema de seguimiento personal.

### 5. Shared UI

Componentes reutilizables y Web Components.

---

# 5. ESPECIFICACIONES FUNCIONALES

---

# FEATURE 001 — ANIME CATALOG

## Objetivo

Mostrar listas de anime obtenidas desde la API de Jikan.

---

## Requisitos Funcionales

### Home

La página principal debe mostrar:

- Animes recientes
- Top animes
- Temporada actual
- Animes populares

---

## Requisitos UI

- Diseño minimalista, pero profesional y atractivo sin tanto color neon
- Grid de tarjetas
- Diseño responsive
- Infinite scrolling
- Skeleton loading

---

## Requisitos Técnicos

- Lazy loading
- Caché de API
- Paginación
- Manejo de errores
- Estados de carga

---

## Criterios de Aceptación

- La lista carga en menos de 2 segundos
- El infinite scroll funciona correctamente
- La UI sigue siendo fluida durante la carga
- Los errores se muestran correctamente

---

# FEATURE 002 — SEARCH SYSTEM

## Objetivo

Permitir buscar animes dinámicamente.

---

## Requisitos Funcionales

### Búsqueda

El usuario puede:

- Buscar por título
- Filtrar por género
- Filtrar por puntuación
- Filtrar por año
- Filtrar por temporada
- Filtrar por estado

---

## Requisitos Técnicos

- Debounced input
- Query params sincronizados
- Caché de peticiones
- Estado reactivo

---

## Criterios de Aceptación

- La búsqueda se actualiza en tiempo real
- El debounce evita exceso de llamadas
- Los filtros permanecen en la URL

---

# FEATURE 003 — ANIME DETAILS

## Objetivo

Mostrar información detallada de un anime.

---

## Requisitos Funcionales

La página de detalle debe incluir:

- Portada
- Banner
- Título
- Sinopsis
- Episodios
- Géneros
- Puntuación
- Trailer
- Estado

---

## Acciones del Usuario

El usuario puede:

- Añadir anime a su lista
- Cambiar estado
- Guardar progreso de episodios

---

## Criterios de Aceptación

- Los detalles cargan correctamente
- El estado se actualiza instantáneamente
- La UI es responsive

---

# FEATURE 004 — MY ANIMES

## Objetivo

Permitir gestionar la lista personal de anime.

---

## Estados de Anime

```ts
enum AnimeStatus {
  WATCHING,
  WATCHED,
  PLAN_TO_WATCH,
}
```

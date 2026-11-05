# 🎬 AnimeHub

> **AnimeHub** es una aplicación web moderna (SPA) para explorar, descubrir y gestionar tu lista personal de animes favoritos. Construida con **Angular 19**, utiliza la API GraphQL de **AniList** para información actualizada y **Supabase** para la autenticación y sincronización de colecciones en la nube, con soporte para modo local/offline.

---

## 📑 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Vistas y Funcionalidades](#-vistas-y-funcionalidades)
- [Stack Tecnológico](#-stack-tecnológico)
- [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
- [Servicios e Integraciones](#-servicios-e-integraciones)
  - [AniList GraphQL API & Sistema de Caché](#anilist-graphql-api--sistema-de-caché)
  - [Supabase Auth & Persistencia Híbrida](#supabase-auth--persistencia-híbrida)
  - [Gestión de Estado Reactivo](#gestión-de-estado-reactivo)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Scripts Disponibles](#-scripts-disponibles)
- [Buenas Prácticas y Decisiones de Diseño](#-buenas-prácticas-y-decisiones-de-diseño)

---

## ✨ Características Principales

- **🔥 Exploración Completa y Actualizada**: Consulta animes en emisión, las series más populares de todos los tiempos, los estrenos de la temporada actual y los próximos lanzamientos.
- **🔍 Búsqueda y Filtrado Avanzado**: Buscador en tiempo real con debounce integrado y filtros combinables por **múltiples géneros**, **puntuación mínima** (sistema de estrellas), **año de emisión** y **estado**.
- **🎞️ Fichas de Detalle Enriquecidas**: Información exhaustiva con portada y banner en alta resolución, metadatos (formato, episodios, duración, clasificación, estudios), sinopsis completa, tráiler oficial interactivo de YouTube y elenco de personajes con sus respectivos actores de voz japoneses (*Seiyuus*).
- **📋 "Mi Lista" Personalizada**: Organiza tu catálogo personal clasificado por estados:
  - 🟢 **Viendo** (*Watching*)
  - 🔵 **Visto** (*Watched*)
  - 🟡 **Por Ver** (*Plan to Watch*)
- **⏱️ Seguimiento Interactivo de Episodios**: Incrementa o disminuye episodios vistos en un clic con cálculo dinámico de progreso. Si completas los episodios, el estado cambia automáticamente a "Visto".
- **👤 Autenticación y Perfil de Usuario**: Inicio de sesión y registro por correo electrónico o nombre de usuario, menú de perfil desplegable y personalización de avatar.
- **🛡️ Modo Local / Offline Resiliente**: Si el backend de Supabase no está configurado o hay problemas de red, la aplicación activa un fallback automático a almacenamiento local (`localStorage`), permitiendo utilizar todas las funciones sin interrupciones.
- **💎 Diseño UI "Ethereal Slate"**: Interfaz limpia, responsiva y adaptable a móviles, con animaciones fluidas, componentes skeleton mientras cargan los datos y tipografía cuidada (*Sora* y *Manrope*).

---

## 🖥️ Vistas y Funcionalidades

### 1. Catálogo / Explorador (`/`)
- **Sección Hero**: Presentación con barra de búsqueda instantánea.
- **Barra Lateral de Filtros**:
  - Tags dinámicos de géneros (Acción, Aventura, Comedia, Drama, Fantasía, Sci-Fi, Romance, etc.).
  - Selector de puntuación mínima (de 6+ a 9+ estrellas).
  - Selector de año de lanzamiento.
  - Botón para limpiar filtros aplicados.
- **Vistas por Secciones**: Listados rápidos de *Top Airing*, *Populares*, *Temporada Actual* y *Próximos*.
- **Paginación Reactiva**: Navegación fluida entre páginas de resultados.

### 2. Detalle de Anime (`/anime/:id`)
- Banner cinematográfico y carátula.
- Calificación media con componente visual de estrellas y popularidad.
- Lista de géneros con navegación directa.
- Reproductor de tráiler embebido de YouTube (con carga segura vía `DomSanitizer`).
- Grid de personajes principales y secundarios con sus actores de doblaje.
- Botones de acción directa para añadir a la lista o cambiar su estado y progreso.

### 3. Mi Lista (`/my-list`)
- Pestañas organizadas por estado: **Viendo**, **Visto** y **Por Ver**.
- Buscador interno para filtrar dentro de los animes guardados.
- Contadores dinámicos por cada pestaña y total de animes.
- Control de episodios interactivo (`+` / `-`) y opción para eliminar de la lista.
- Estados vacíos ilustrativos con accesos directos al catálogo.

---

## 🛠️ Stack Tecnológico

| Tecnología | Versión / Uso |
| :--- | :--- |
| **Angular** | `v19` — Standalone Components, Signals, Computed, Effects, New Control Flow (`@if`, `@for`, `@let`) |
| **TypeScript** | `v5.7` — Tipado estricto e interfaces de datos completas |
| **SCSS** | Arquitectura moderna con variables CSS nativas, glassmorphism y sistema de diseño responsivo |
| **AniList API** | GraphQL API oficial para consulta de datos, temporadas, personajes y trailers |
| **Supabase** | `supabase-js v2` — Autenticación de usuarios, base de datos PostgreSQL (`anime_lists`, `profiles`) y Storage para avatares |
| **RxJS** | `v7.8` — Programación reactiva, operadores (`debounceTime`, `distinctUntilChanged`, `shareReplay`) |
| **Google Fonts & Icons** | Tipografías *Sora* & *Manrope*, e iconos *Material Symbols Outlined* |

---

## 📂 Arquitectura del Proyecto

La estructura del código fuente sigue las directrices recomendadas de Angular basada en módulos por características (*feature-based*):

```text
src/
├── app/
│   ├── core/                        # Servicios globales y lógica de negocio
│   │   └── services/
│   │       ├── anilist.service.ts   # Conexión GraphQL con AniList + caché en memoria/sessionStorage
│   │       ├── supabase.service.ts  # Autenticación, perfiles y persistencia (con fallback local)
│   │       └── watchlist.service.ts # Lógica de la lista personal, estados y cálculo de episodios
│   │
│   ├── features/                    # Vistas principales de la aplicación (páginas)
│   │   ├── catalog/                 # Catálogo, buscador y panel de filtros
│   │   │   └── catalog.component.ts
│   │   ├── details/                 # Ficha completa del anime, trailer y personajes
│   │   │   └── details.component.ts
│   │   └── my-list/                 # Gestión de la lista personal del usuario
│   │       └── my-list.component.ts
│   │
│   ├── shared/                      # Componentes reutilizables y de presentación
│   │   └── components/
│   │       ├── anime-card/          # Tarjeta de anime con badges y hover interactivo
│   │       ├── auth-modal/          # Modal de inicio de sesión y registro
│   │       ├── navbar/              # Barra de navegación con menú móvil y avatar de usuario
│   │       ├── skeleton-card/       # Esqueleto de carga animado (shimmer)
│   │       ├── star-rating/         # Componente de valoración por estrellas
│   │       └── status-badge/        # Badge con indicador de estado (Viendo, Visto, etc.)
│   │
│   ├── app.component.ts             # Componente raíz de la aplicación
│   ├── app.config.ts                # Proveedores globales (Router, HttpClient)
│   └── app.routes.ts                # Definición de rutas del sistema
│
├── styles.scss                      # Tokens globales, variables de diseño y utilidades CSS
└── index.html                       # Documento principal y precargas de fuentes
```

---

## 🔌 Servicios e Integraciones

### AniList GraphQL API & Sistema de Caché
El servicio [`AnilistService`](file:///c:/Users/Allandryo/Desktop/Porfolio/MiPorfolio/AnimeHub/src/app/core/services/anilist.service.ts) consume el endpoint oficial `https://graphql.anilist.co`:
- **Consultas Optimizadas**: Utiliza GraphQL Fragments (`AnimeFields`) para recuperar únicamente la información requerida.
- **Caché en 2 Niveles**:
  1. **Nivel Memoria**: Con `Map<string, Observable<T>>` y el operador `shareReplay` para evitar solicitudes idénticas concurrentes.
  2. **Nivel Sesión (`sessionStorage`)**: Con clave hasheada y un tiempo de vida (TTL) de 30 minutos, acelerando las cargas de página y reduciendo llamadas innecesarias a la API.

### Supabase Auth & Persistencia Híbrida
El servicio [`SupabaseService`](file:///c:/Users/Allandryo/Desktop/Porfolio/MiPorfolio/AnimeHub/src/app/core/services/supabase.service.ts) gestiona el ciclo de vida del usuario y la sincronización:
- **Autenticación**: Registro e inicio de sesión seguro mediante correo y contraseña, con soporte de resolución de alias de usuario.
- **Storage**: Carga de imágenes de avatar directamente a un bucket de Supabase.
- **Modo Local Automático**: En caso de no haber conexión con el servicio remoto, cambia dinámicamente a modo local emulado mediante `localStorage`, garantizando que la aplicación siga siendo plenamente funcional en entornos de desarrollo o demostración sin configuración previa de backend.

### Gestión de Estado Reactivo
El servicio [`WatchlistService`](file:///c:/Users/Allandryo/Desktop/Porfolio/MiPorfolio/AnimeHub/src/app/core/services/watchlist.service.ts) aprovecha las ventajas de **Angular Signals**:
- Estado reactivo centralizado con `signal`, `computed` y `effect`.
- Filtrado dinámico por estado de visualización sin necesidad de suscripciones manuales o fugas de memoria.
- Persistencia automática de las colecciones por usuario.

---

## 🚀 Instalación y Configuración

### Prerrequisitos
- [Node.js](https://nodejs.org/) (versión 18.x o superior recomendada).
- [npm](https://www.npmjs.com/) (incluido con Node.js).
- [Angular CLI](https://angular.dev/tools/cli) (opcional, instalable vía `npm install -g @angular/cli`).

### Pasos para iniciar el proyecto

1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd AnimeHub
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo**:
   ```bash
   npm start
   # o bien:
   ng serve
   ```

4. **Abrir en el navegador**:
   Accede a [http://localhost:4200/](http://localhost:4200/). La aplicación se recargará automáticamente al realizar cambios en el código fuente.

---

## 📜 Scripts Disponibles

En el directorio del proyecto puedes ejecutar:

| Comando | Descripción |
| :--- | :--- |
| `npm start` | Inicia el servidor de desarrollo en `http://localhost:4200/`. |
| `npm run build` | Compila el proyecto y genera los archivos optimizados para producción en la carpeta `dist/`. |
| `npm run watch` | Compila el proyecto en modo desarrollo y se mantiene a la escucha de cambios. |
| `npm test` | Ejecuta las pruebas unitarias mediante Karma y Jasmine. |

---

## 💡 Buenas Prácticas y Decisiones de Diseño

- **Componentes Standalone**: Eliminación de `NgModule` en favor de la arquitectura moderna de Angular basada en componentes autónomos, aligerando el empaquetado final (*bundle size*).
- **Nuevo Control Flow de Angular**: Uso de sintaxis nativa `@if`, `@for`, `@let` y `@empty` que mejora la legibilidad de las plantillas y el rendimiento del renderizado frente a las directivas estructurales clásicas (`*ngIf`, `*ngFor`).
- **Angular Signals**: Reactividad granular y predecible que reduce la necesidad de detección de cambios de zona profunda.
- **Skeleton Loaders Shimmer**: Evitan saltos visuales bruscos en la interfaz (*CLS*) y proporcionan una experiencia fluida al usuario durante la carga asíncrona de datos.
- **CSS Variables & Design Tokens**: Paleta de colores consistente, sombras por capas y transiciones con curvas *cubic-bezier* que brindan una sensación nativa y moderna.

---

Desarrollado con ❤️ y pasión por el anime.

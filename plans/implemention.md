# Especificación de Implementación Unificada - AnimeHub

Este documento unifica y reemplaza las especificaciones previas contenidas en `plan.md` y `users.md`. Define tanto la arquitectura general de la aplicación de catálogo de anime como los requisitos del sistema de autenticación y persistencia de usuarios.

---

# 1. VISIÓN GENERAL & TECNOLOGÍAS

## Objetivo
Crear una aplicación web moderna de catálogo de anime utilizando Angular y Web Components.
La aplicación debe permitir a los usuarios explorar, buscar y gestionar una lista de seguimiento personal (Viendo, Visto, Por Ver), vinculada a sus cuentas individuales.

## Tecnologías Obligatorias
- **Frontend**: Angular 19+ (Standalone Components, Signals, RxJS, SCSS)
- **Renderizado**: Single Page Application (SPA)
- **Persistencia y Auth**: Supabase (Auth, PostgreSQL DB, Storage)
- **Diseño**: Tema "Ethereal Slate" de Stitch (Tipografías: Sora para títulos, Manrope para cuerpo)

---

# 2. SISTEMA DE USUARIOS Y AUTENTICACIÓN (SUPABASE)

## Roles de Usuario
- **Invitado (No Autenticado)**: Puede explorar catálogos, buscar anime y ver detalles. No puede guardar animes, crear listas ni puntuar.
- **Usuario Registrado**: Puede registrarse, iniciar sesión, gestionar su lista de animes personal, calificar animes, ver su perfil y cambiar su foto de perfil.

## Flujos de Autenticación
1. **Registro**:
   - Campos requeridos: Username, Email, Password, Confirm Password.
   - Validaciones:
     - Username: Obligatorio, de 3 a 20 caracteres, único, letras, números y "_"
     - Email: Obligatorio, formato de correo válido, único.
     - Password: Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número.
     - Confirm Password: Debe coincidir exactamente con la contraseña.
   - Flujo: Formulario -> Validación frontend -> `signUp` con Supabase Auth -> Correo de verificación -> Sesión creada -> Inserción automática en tabla `profiles`.
2. **Inicio de Sesión**:
   - Campos: Username o Email, Password.
   - Flujo: Buscar correo asociado -> `signIn` con Supabase Auth -> Sesión segura -> Redirigir.
3. **Cierre de Sesión**:
   - Elimina la sesión activa mediante Supabase Auth y redirige al estado de Invitado.
4. **Recuperación de Contraseña**:
   - Introducir email -> Enlace temporal por correo -> Restablecer nueva contraseña.

---

# 3. BASE DE DATOS Y SEGURIDAD

## Esquema de Base de Datos (PostgreSQL)

### Tabla: `public.profiles`
- `id` (UUID, Primary Key, referencias a `auth.users(id)` con eliminación en cascada)
- `username` (text, único, no nulo)
- `email` (text, no nulo)
- `avatar_url` (text, nulo por defecto)
- `created_at` (timestamp con zona horaria, por defecto `now()`)

### Tabla: `public.anime_lists`
- `id` (bigint, generado por defecto como identidad, Primary Key)
- `user_id` (UUID, referencias a `public.profiles(id)` con eliminación en cascada)
- `mal_id` (integer, ID del anime en MyAnimeList / Jikan, no nulo)
- `status` (text, valores válidos: `WATCHING`, `WATCHED`, `PLAN_TO_WATCH`)
- `score` (integer, rango 1-10 o nulo)
- `episodes_watched` (integer, por defecto 0)
- `created_at` (timestamp con zona horaria, por defecto `now()`)

## Seguridad (Row Level Security - RLS)
- **Triggers**: Crear una función y trigger en la base de datos para que al registrarse un usuario en `auth.users`, se inserte automáticamente su perfil en `public.profiles`.
- **Políticas de RLS**:
  - `profiles`: Los usuarios pueden leer perfiles públicos. Solo pueden modificar su propio perfil (`auth.uid() = id`).
  - `anime_lists`: Solo los propietarios pueden seleccionar, insertar, actualizar o eliminar sus propios registros de anime (`auth.uid() = user_id`).
- **Almacenamiento (Storage)**:
  - Crear un bucket público llamado `avatars`.
  - Política de lectura: Acceso público para ver avatares.
  - Política de escritura: Solo usuarios autenticados pueden subir/actualizar archivos en su carpeta personal en el bucket (ej. carpeta nombrada con su `user_id`).

---

# 4. ESPECIFICACIONES FUNCIONALES Y DISEÑO

## Características Principales (Features)

### FEATURE 001 — ANIME CATALOG
- Mostrar listas de anime (recientes, populares, temporada actual) desde la API de Jikan.
- UI: Rejilla de tarjetas, diseño responsivo, skeleton loading e infinite scroll.

### FEATURE 002 — SEARCH SYSTEM
- Búsqueda en tiempo real por título con debounce.
- Filtros por género, puntuación, año y estado. Sincronización de parámetros en la URL.

### FEATURE 003 — ANIME DETAILS
- Detalle del anime (portada, banner, título, sinopsis, episodios, trailer).
- Acciones de lista si está autenticado (añadir a lista, cambiar estado, guardar progreso de episodios).

### FEATURE 004 — MY ANIMES (USER SPACE)
- Vista privada para el usuario autenticado que muestra sus animes guardados y filtrados por estado.

## Diseño Visual: Ethereal Slate (Stitch)
- **Esquema de Colores**:
  - Fondo (`background`): `#11131c` (Deep Slate)
  - Color Primario (`primary`): `#ff6b6b` (Rich Coral)
  - Color Secundario (`secondary`): `#6c63ff` (Soft Indigo)
  - Color Terciario (`tertiary`): `#4ecdc4` (Mint Green)
  - Superficies (`surface`): `#1c1f2b`
  - Bordes (`border`): `#2d313f`
- **Tipografía**: Sora para títulos principales, Manrope para textos de interfaz y cuerpo.
- **Formas**: Base de 8px de redondeado (`radius-md`).
- **Efectos**: Glassmorphism sutil y tonalidades oscuras para una interfaz cinematográfica premium.

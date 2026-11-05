# Sistema de Usuarios - Anime Tracker

## Objetivo

Permitir el registro y autenticación segura de usuarios utilizando Supabase Auth.

Los usuarios no autenticados podrán navegar por el catálogo de animes pero no podrán guardar información personal ni crear listas.

---

# Registro

## Campos requeridos

- Username
- Email
- Password
- Confirm Password

## Validaciones

### Username

- Obligatorio
- Entre 3 y 20 caracteres
- Único
- Solo letras, números y "_"

### Email

- Obligatorio
- Formato válido
- Único

### Password

- Obligatoria
- Mínimo 8 caracteres
- Al menos:
  - 1 letra mayúscula
  - 1 letra minúscula
  - 1 número

### Confirm Password

- Debe coincidir con Password

---

# Flujo de Registro

1. Usuario completa formulario.
2. Frontend valida los datos.
3. Se ejecuta signUp mediante Supabase Auth.
4. Supabase envía email de verificación.
5. Usuario confirma email.
6. Se crea sesión.
7. Se genera automáticamente un registro en la tabla profiles.

---

# Inicio de Sesión

## Campos

- Username
- Password

## Flujo

1. Buscar email asociado al username.
2. Realizar autenticación mediante Supabase Auth.
3. Crear sesión segura.
4. Redirigir al dashboard.

---

# Recuperación de Contraseña

## Flujo

1. Usuario introduce email.
2. Supabase envía enlace temporal.
3. Usuario establece nueva contraseña.

---

# Base de Datos

## profiles

- id (UUID)
- username
- email
- avatar_url
- created_at

## anime_lists

- id
- user_id
- mal_id
- status
- score
- episodes_watched
- created_at

---

# Seguridad

## Autenticación

Utilizar exclusivamente Supabase Auth.

No almacenar contraseñas manualmente.

No implementar hash propio.

No almacenar tokens en base de datos.

---

## Protección de Datos

- HTTPS obligatorio.
- Cookies seguras.
- JWT gestionados por Supabase.
- Verificación de correo obligatoria.

---

## Row Level Security

Todo acceso a datos personales debe estar protegido mediante RLS.

Un usuario solo puede:

- Leer sus datos.
- Modificar sus datos.
- Eliminar sus datos.
- Gestionar su propia lista de animes.

Nunca podrá acceder a información privada de otros usuarios.

---

# Roles

## Invitado

Puede:

- Buscar animes.
- Ver detalles.

No puede:

- Guardar animes.
- Crear listas.
- Puntuar.

## Usuario Registrado

Puede:

- Guardar animes.
- Gestionar listas.
- Puntuar.
- Modificar perfil.

## Administrador (futuro)

Puede:

- Moderar contenido.
- Gestionar reportes.
- Gestionar usuarios.

# Sistema de Diseño: Light Ethereal Slate (AnimeHub)

Este documento define la dirección de diseño y las especificaciones visuales de la aplicación AnimeHub en su tema claro, aplicando los principios de las guías de diseño premium `impeccable` y `high-end-visual-design` para evitar clichés del diseño generado por IA.

## 1. Tema Visual y Atmósfera
- **Mood / Vibe**: Limpio, premium, espacioso e intuitivo. Inspirado en el estilo de diseño editorial contemporáneo y las interfaces modernas de alta gama (estilo Apple/Linear).
- **Evitación del "AI Beige Cliché"**: Se prohíbe el uso de fondos de lienzo color crema, pergamino o beige cálido saturado (los cuales delatan una maquetación automatizada). En su lugar, se opta por una paleta neutra y nítida basada en tonos pizarra claros y fríos.
- **Densidad de Contenido**: *Daily App Balanced* (5/10). Con un espaciado macro generoso que permite que la interfaz respire.
- **Varianza y Asimetría**: *Offset Asymmetric* (6/10). Maquetación asimétrica en la sección Hero y espaciados alternados.
- **Intensidad de Movimiento**: *Fluid Spring-Physics* (6/10). Animaciones controladas con curvas de aceleración personalizadas y físicas de resorte.

## 2. Paleta de Colores Calibrada (Amiable Alabaster/Slate)
Para lograr el contraste ideal y una estética premium, se establece la siguiente paleta exclusiva:

- **Fondo Principal de Lienzo (`--bg-deep`)**: `#f8fafc` (Clean Slate White - slate-50). Un blanco pizarra nítido y limpio.
- **Fondo Secundario (`--bg-dark`)**: `#f1f5f9` (Light Slate Gray - slate-100). Usado para contrastar zonas del lienzo.
- **Superficie Base (`--surface`)**: `#ffffff` (Pure White). Fondo para tarjetas, modales y paneles.
- **Tarjeta Translúcida (`--surface-card`)**: `rgba(255, 255, 255, 0.8)` con desenfoque de fondo (`backdrop-filter: blur(12px)`).
- **Tarjeta Hover (`--surface-card-hover`)**: `rgba(255, 255, 255, 0.95)`.
- **Texto Principal (`--text-primary`)**: `#0f172a` (Slate-900). Carbono pizarra oscuro para un contraste excepcional de ≥4.5:1.
- **Texto Secundario (`--text-secondary`)**: `#475569` (Slate-600). Para metadatos y subtítulos (contraste ≥4.5:1).
- **Texto de Metadatos / Desactivado (`--text-muted`)**: `#64748b` (Slate-500). Para información secundaria.
- **Borde Estructural (`--border`)**: `#e2e8f0` (Slate-200). Líneas finas y limpias de 1px.
- **Acento Primario (`--primary`)**: `#ff6b6b` (Rich Coral). Utilizado con moderación para botones de acción principal, estado activo de estrellas y llamadas clave.
- **Acento Secundario (`--secondary`)**: `#6c63ff` (Soft Indigo). Para botones secundarios, estados interactivos alternativos y badges.
- **Acento Terciario / Éxito (`--success`)**: `#0f766e` (Teal-700). Para estados positivos.

*Restricciones de Color*: Prohibido el uso de negros puros (`#000000`) y de resplandores neón artificiales.

## 3. Arquitectura Tipográfica
La tipografía prioriza el contraste y la estructura tipográfica de peso.

- **Títulos y Encabezados (Display / Headlines)**: `Sora` (Google Fonts)
  - Ajuste: `letter-spacing: -0.02em` en títulos estándar; `letter-spacing: -0.03em` (con un límite estricto de ≥ -0.04em) en Hero para evitar que los caracteres se colapsen.
  - Se aplica `text-wrap: balance` en todos los titulares principales (`h1` a `h3`) para garantizar cortes de línea lógicos y visualmente perfectos.
- **Cuerpo de Texto y Datos (Body & UI)**: `Manrope` (Google Fonts)
  - Ajuste: `line-height: 1.6` y un límite máximo de longitud de línea de `65ch` a `75ch` para descripciones de texto largo.
  - Se aplica `text-wrap: pretty` para evitar líneas huérfanas en textos descriptivos.
- **Tipografías Excluidas (Banned)**: Baneo de `Inter` y fuentes genéricas del sistema para titulares principales.

## 4. Estilos de Componentes Clave y Haptic Depth

### Botones (Buttons)
- **Botón Primario (`.btn-primary`)**: Sólido (`#ff6b6b`) con texto de alto contraste oscuro (`#0b0d11`). Al pasar el ratón, se desplaza `-1px` verticalmente con una sombra difusa y suave; al hacer clic, se escala ligeramente a `scale(0.97)`.
- **Botón Secundario / Outline (`.btn-outline`)**: Fondo transparente sutil (`rgba(0, 0, 0, 0.02)`), borde de 1px (`#e2e8f0`). En hover se aplica un fondo de `rgba(0, 0, 0, 0.05)`.

### Tarjetas de Anime (Cards)
- **Estructura y Profundidad Háptica**:
  - Esquinas redondeadas suaves (`--radius-md` = 8px).
  - Borde de 1px (`#e2e8f0`).
  - Sombra difusa suave (`box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05)`).
- **Prohibición Estricta de Animación de Imágenes**:
  - **Queda estrictamente prohibido aplicar transformaciones de escala (scale), rotación o traslación sobre el elemento `<img>` (póster) en estado hover.**
  - El feedback visual se implementa exclusivamente mediante la elevación de la tarjeta (`translateY(-4px)`), el cambio de color del borde y el aumento de la sombra del contenedor de la tarjeta, manteniendo la imagen estática.

### Entradas de Datos (Inputs / Forms)
- **Estructura**:
  - Fondo de cristal claro translúcido (`rgba(255, 255, 255, 0.7)`) con borde Slate-200.
  - Focus: El borde cambia al acento primario y se genera una sombra difusa (`box-shadow: 0 0 0 2px var(--primary-subtle)`).
  - Etiquetas siempre posicionadas de forma estática encima del input (sin etiquetas flotantes).

### Estados de Carga (Skeletons)
- **Shimmer de Carga**:
  - Animación de shimmer lineal muy sutil y suave. El gradiente se desplaza de `rgba(0, 0, 0, 0.03)` a `rgba(0, 0, 0, 0.08)` y vuelve a `rgba(0, 0, 0, 0.03)`, lo que previene el parpadeo agresivo y encaja a la perfección con la interfaz clara.

## 5. Principios de Maquetación y Layout

- **Estructura de Rejilla**: Uso exclusivo de CSS Grid para estructuras bidimensionales y Flexbox para componentes lineales. Las rejillas responsivas usan `repeat(auto-fit, minmax(200px, 1fr))` o similar.
- **Sección Hero Asimétrica**: Alineación a la izquierda con amplia presencia de espacios vacíos (macro-whitespace) para permitir que la interfaz respire y se sienta premium.
- **Colapso Responsive Móvil**: Por debajo de `768px`, todas las estructuras multi-columna colapsan a una sola columna (`w-full` y `px-4`). Los elementos táctiles interactivos respetan el estándar de touch target mínimo de `44px`.

## 6. Filosofía de Movimiento y Animación

- **Físicas de Resorte y Curvas**:
  - Se prohíben las transiciones lineales o `ease-in-out` estándar del navegador para movimientos estructurales.
  - Transiciones rápidas: `transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo).
  - Animaciones de componentes (modales, menús): `cubic-bezier(0.34, 1.56, 0.64, 1)` (curva con resorte suave).
- **Rendimiento**: Animaciones optimizadas por GPU limitadas exclusivamente a las propiedades `transform` y `opacity`.

## 7. Escala de Z-Index Semántica
Para evitar conflictos de apilamiento visual, se implementa la siguiente escala estricta:
1. Navegación Fija (Sticky Navbar): `100`
2. Menú Móvil / Capa de Fondo Móvil (Mobile links / Backdrop): `101` y `102`
3. Capa de Fondo de Modal (Modal Backdrop): `1000`
4. Contenedor de Modal (Modal Content): `1001`
5. Menús Desplegables / Tooltips: `1050`

## 8. Anti-Patrones Estrictos (Baneos de Diseño)
- **No emojis** en ningún texto de sistema, botones o etiquetas.
- **No negros puros (`#000000`)** en textos o elementos decorativos.
- **No bordes decorativos de más de 1px a un lado** (bordes izquierdos gruesos en tarjetas o alertas).
- **No textos con degradados (gradient text)** que dificulten la legibilidad.
- **No animaciones de escalado de imágenes en hover**.
- **No cursores de ratón personalizados**.

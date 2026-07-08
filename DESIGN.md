# Portafolio — Documento de diseño UX/UI (Fase 0)

**Luis Contreras · portafolio personal one-page**
Estilo minimalista / Suizo (Estilo Tipográfico Internacional). Referencia visual: mockup aprobado.
Este documento consolida el diseño antes de escribir código de producción. Versión visual: `Portafolio-Diseno.pdf`.

Proceso seguido: **contenido → wireframe → sistema visual → desarrollo**.

---

## 1. User flow & conversión

Visitante objetivo: **reclutador técnico / líder de equipo**. Llega por un link externo (LinkedIn, CV, correo), escanea en segundos y decide *"¿contacto o no?"*. Muchos saltan directo a Proyectos.

**Recorrido:** Entrada → Nav fija → 01 Hero → 02 Sobre mí → 03 Skills → 04 Proyectos → 05 Cómo trabajo → 06 Contacto.

**Puntos de conversión (por prioridad):**

| Prioridad | Acción | Ubicación | Por qué |
|-----------|--------|-----------|---------|
| ★ B (primaria) | Enviar correo (`mailto`) | 06 Contacto + Hero | Objetivo del sitio. Sin formulario: un reclutador no los llena. |
| ★ A (apoyo) | Ver proyecto (demo en vivo) | 04 Proyectos | Genera la confianza que empuja al contacto. |
| — (terciaria) | GitHub / LinkedIn | 06 + footer | Verificación de respaldo. |

La **nav fija** siempre visible permite el salto directo. El **riel de índices 01–06** orienta ("¿dónde voy?"), no navega.

---

## 2. Arquitectura de información

El scroll sigue un embudo: **atención → interés → credibilidad → deseo → acción**. Cada sección resuelve una objeción antes de pedir el clic.

| # | Sección | Rol | Jerarquía | Por qué |
|---|---------|-----|-----------|---------|
| 01 | Hero | Identidad instantánea | Nombre (gigante) > rol > estado > ubicación | La escala tipográfica *es* la jerarquía; el estado adelanta la conversión. |
| 02 | Sobre mí | Credibilidad | Narrativa (2 párrafos) \| ficha de datos | Doble columna: escanear datos **y** leer historia. Gestión→desarrollo diferencia. |
| 03 | Skills | Filtro técnico | Categoría > tags (Frontend primero) | Cruce stack × vacante en segundos; agrupar comunica capas de una app. Solo lo confirmado. |
| 04 | Proyectos | La prueba (núcleo) | Captura > título > descripción > stack > enlace | "Demuéstralo". El enlace es la conversión A. |
| 05 | Cómo trabajo | Madurez de proceso | Intro (meta-narrativa) > 4 pasos | Diferencia; la página siguió ese proceso, así que se auto-demuestra. |
| 06 | Contacto | Conversión | CTA gigante "Hablemos" > sociales | Cierre sin distracciones (conversión B). Sin formulario. |

---

## 3. Wireframes (resumen responsive)

Baja fidelidad, desktop (≥720px) + móvil (<720px). Ver PDF para los frames anotados.

Reglas responsive comunes (breakpoint **720px**):
- Riel de índice **90px → 48px**.
- Padding de contenido de sección **80/40 → 56/20px**.
- Todos los grids de 2 columnas colapsan a **1 columna**.

Por sección:
- **01 Hero** — contenido anclado al borde inferior (`align-items:end`), alto `100vh`. H1 escala con `clamp`. *Decisión abierta:* 5 links de nav a 375px pueden apretar → evaluar menú hamburguesa en Fase 3.
- **02 Sobre mí** — grid narrativa | ficha → apilado.
- **03 Skills** — fila categoría | tags → categoría encima de tags (wrap).
- **04 Proyectos** — proyecto captura | texto → captura arriba (ratio 16:10).
- **05 Cómo trabajo** — cuadrícula 2×2 de pasos → 1 columna.
- **06 Contacto** — CTA gigante domina; escala con `clamp`.

*Nota:* varias secciones son `min-height:60vh` y dejan aire; si "flota" mucho, ajustar en Fase 3 (maquetación), no en diseño.

---

## 4. Sistema de diseño

### 4.1 Color (tokens)

| Token | Hex | Uso |
|-------|-----|-----|
| `--paper` | `#FAFAF8` | Fondo base. |
| `--ink` | `#111110` | Texto principal, títulos, bordes fuertes. |
| `--ink-soft` | `#444440` | Párrafos de cuerpo largo (about, pasos). |
| `--gray` | `#8A8A85` | Texto secundario, metadatos, descripciones. |
| `--line` | `#E4E3DD` | Divisores, bordes de tarjetas/celdas. |
| `--accent` | `#E63312` | Enlaces, CTA, números de paso, `::selection`. **Único color.** |

**Regla de uso:** el acento se reserva para acciones y énfasis puntual. Nunca como fondo de bloques grandes ni decoración. Sin gradientes. Contraste tinta/papel ≈ 16:1 (AAA).

### 4.2 Tipografía

Familias (Google Fonts): **Space Grotesk** (display; 400/500/700) + **Inter** (cuerpo; 400/500). La jerarquía la marca la **escala**, no el color.

| Rol | Tamaño | Peso | Detalle |
|-----|--------|------|---------|
| Display XL — H1 (Hero) | `clamp(64px,14vw,160px)` | 700 | lh 0.92 · ls −0.04em |
| Display L — CTA (Contacto) | `clamp(36px,7vw,80px)` | 700 | ls −0.03em |
| Heading — H2 (secciones) | `clamp(32px,5vw,52px)` | 500 | ls −0.02em |
| Title — H3 (tarjeta proyecto) | 26px | 500 | |
| Subtitle — H3 (skills/pasos) | 15–17px | 500 | |
| Body — Inter | 16px (Hero 17px) | 400 | lh 1.6 |
| Overline / eyebrow | 12px | 400 | ls 2px · MAYÚSCULAS · gris |
| Caption / label | 12–13px | 400/500 | ls 1.5px · MAYÚSCULAS |

### 4.3 Espaciado

Ritmo en **múltiplos de 4px** (base 8):

`--space-1:4` · `-2:8` · `-3:12` · `-4:16` · `-6:24` · `-8:32` · `-10:40` · `-12:48` · `-16:64` · `-20:80`

Mapeo al mockup: padding de sección **80/40** (space-20/space-10) · separación entre proyectos **48** (space-12) · gaps internos **24–28** (space-6) · padding de celda de paso **28**.

### 4.4 Componentes

- **Tarjeta de proyecto** — grid 1fr/1fr (móvil: apilado). Thumb ratio 16:10. Hover: thumb sube 6px (transform .4s). Enlace en acento = conversión A.
- **Tag de skill** — borde 1px tinta, radio 999px, padding 6×16px. Hover: invierte a fondo tinta / texto papel.
- **Paso de proceso** — celda con borde `--line`. Número en acento (Space Grotesk 700). Grid 2×2 (móvil: 1 col).
- **Status "disponible"** — punto acento (pulso 2s) + texto 13px/500. Respeta `prefers-reduced-motion`.
- **Big link (mailto)** — Display L; hover → color acento. Sin formulario.

---

## 5. Especificación de animaciones

Stack: **GSAP + ScrollTrigger** (reemplazan al IntersectionObserver del mockup).
Principios: con propósito · sobria (distancias cortas, una dirección) · rápida (≤0.7s) · accesible.

### 5.1 Tokens

| Duración | | Easing | |
|----------|--|--------|--|
| `--dur-micro` | 0.2s (hover) | micro | `ease` / power1.out |
| `--dur-lift` | 0.4s (captura) | reveal | `power2.out` |
| `--dur-reveal` | 0.7s (scroll) | entrada | `power3.out` (Hero) |
| `--dur-hero` | 0.9s (H1) | pulso | `ease-in-out` (loop 2s) |

Stagger base: **0.08–0.12s** entre elementos de un mismo grupo.

### 5.2 Carga del Hero
Timeline GSAP al cargar, **tras `document.fonts.ready`** (evita que el nombre "salte" al cargar la fuente). Secuencia escalonada: eyebrow → nombre → párrafo → status (y:+16→0, opacity:0→1). Total ≈ 1.5s. El punto de estado inicia su pulso al terminar su entrada.

### 5.3 Reveals al scroll
`ScrollTrigger { trigger: .reveal, start: "top 85%", once: true }`. Cada elemento: `y:24, opacity:0 → y:0, opacity:1`, 0.7s, power2.out. Grupos (ficha, skills, tarjetas, pasos) con stagger 0.1s. El H2 abre cada sección.

### 5.4 Micro-interacciones (CSS)
Captura: `translateY(-6px)` 0.4s · Tag: invierte 0.2s · Nav/big-link: color→acento 0.2s (también `:focus-visible`) · Punto: pulso 2s loop.

### 5.5 `prefers-reduced-motion: reduce`
Se **desactiva** todo el movimiento: reveals (contenido visible de inmediato, sin ScrollTrigger), timeline del Hero (estado final directo), pulso, elevación de captura, y `scroll-behavior` pasa a `auto`. Se **conservan** los cambios de color en hover (son feedback, no movimiento). Implementar con `@media (prefers-reduced-motion: reduce)` + guarda en el JS de GSAP.

---

## Pendientes / placeholders (Fase 1)

- **Datos de contacto:** email y LinkedIn reales (hoy placeholder). GitHub: `github.com/Dre4merBoy`.
- **Portal N:** URL de la demo, stack y descripción final — los aporta Luis. No inventar.
- **Capturas** de proyectos (para thumbnails), a convertir a WebP en Fase 5.
- **Decisión abierta:** menú de navegación en móvil (5 links inline vs. hamburguesa) → resolver en Fase 3.

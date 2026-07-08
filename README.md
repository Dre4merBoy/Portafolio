# Portafolio — Luis Contreras

Portafolio web personal (one-page) de **Luis Edgar Contreras Juárez** — desarrollador web y soporte TI.
Diseño minimalista / Suizo (Estilo Tipográfico Internacional): paleta reducida, tipografía como protagonista y un solo color de acento.

🔗 **Demo:** _pendiente de deploy (Fase 6 · Vercel)_

## Tecnologías

| Tecnología | Uso |
|------------|-----|
| **HTML5 semántico** | Estructura del sitio |
| **CSS3** (custom properties) | Sistema de diseño y layout, sin frameworks |
| **JavaScript vanilla** | Reveals al scroll (GSAP + ScrollTrigger en Fase 4) |
| **Google Fonts** | Space Grotesk (display) + Inter (cuerpo) |
| **Vercel** | Deploy estático (Fase 6) |

Sin build step: es un sitio estático que se abre directamente en el navegador.

## Estructura

```
Portafolio Web/
├── index.html          # Página principal (one-page, 6 secciones)
├── css/
│   └── styles.css      # Sistema de diseño + layout
├── js/
│   └── main.js         # Reveals al scroll (IntersectionObserver)
├── assets/             # Imágenes / thumbnails (WebP en Fase 5)
├── DESIGN.md           # Documento de diseño UX/UI (Fase 0)
├── CONTENIDO.md        # Contenido real de referencia (Fase 1)
└── Portafolio-Diseno.pdf  # Documento maestro de diseño
```

## Secciones

`01` Hero · `02` Sobre mí · `03` Skills · `04` Proyectos · `05` Cómo trabajo · `06` Contacto

## Desarrollo local

Al no haber build step, basta abrir `index.html` en el navegador. Para servirlo con URLs limpias:

```bash
npx serve .
```

## Estado del proyecto (por fases)

- [x] Fase 0 — Diseño UX/UI
- [x] Fase 1 — Contenido real
- [x] Fase 2 — Estructura del repo
- [ ] Fase 3 — Maquetación (ajustes finos)
- [ ] Fase 4 — Animaciones (GSAP + ScrollTrigger)
- [ ] Fase 5 — Optimización (WebP, SEO, Lighthouse 90+)
- [ ] Fase 6 — Deploy (Vercel)
- [ ] Fase 7 — Verificación

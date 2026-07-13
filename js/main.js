/* =====================================================================
   Portafolio — Luis Contreras
   Interacciones (GSAP + ScrollTrigger) + tilt 3D.

   Regla clave (skill premium): las animaciones FUNCIONALES —reveals,
   hover, tilt, halo, marquee, cascada del hero— NO se condicionan a
   prefers-reduced-motion. En Windows esa preferencia viene activada a
   menudo y dejaba la página "muerta". Solo se gatea lo intrusivo.

   Progressive enhancement: el CSS nunca oculta contenido. Si GSAP no
   carga, la página se ve completa, solo sin animaciones de scroll.
   ===================================================================== */

(function () {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn('[' + name + ']', e); }
  }

  /* ---- Nav legible sobre el hero oscuro ----
     ANTES del guard de GSAP: el contraste del nav no puede depender de un CDN. */
  function initNavOverHero() {
    const nav = document.querySelector('nav');
    const hero = document.querySelector('.hero');
    if (!nav || !hero) return;
    const navH = nav.offsetHeight || 75;
    const update = () => {
      nav.classList.toggle('over-hero', window.scrollY < hero.offsetHeight - navH);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  }

  /* ---- Halo violeta que sigue al cursor ----
     Gateado SOLO por capacidad de puntero (no por reduced-motion): seguir
     el cursor no es intrusivo. Actualiza --mx/--my throttleado a un frame. */
  function initCursorHalo() {
    if (!canHover) return;
    let raf = 0;
    window.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--mx', e.clientX + 'px');
        document.documentElement.style.setProperty('--my', e.clientY + 'px');
        raf = 0;
      });
    }, { passive: true });
  }

  /* ---- Tilt 3D en tarjetas (proyectos) ----
     Elemento 3D pedido. Gateado por hover (táctil no aplica), NO por
     reduced-motion. Máx 8°, lerp suave, un rAF por tarjeta activa. */
  function initTilt() {
    if (!canHover) return;
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const MAX = 8;
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tx = -py * MAX; ty = px * MAX;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      card.addEventListener('pointerleave', () => {
        tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop);
      });
      function loop() {
        cx += (tx - cx) * 0.15; cy += (ty - cy) * 0.15;
        card.style.setProperty('--rx', cx.toFixed(2) + 'deg');
        card.style.setProperty('--ry', cy.toFixed(2) + 'deg');
        raf = (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05)
          ? requestAnimationFrame(loop) : null;
      }
    });
  }

  /* ---- Galería de proyectos: arrastrar para desplazar (solo ratón) ----
     En táctil se usa el scroll nativo con scroll-snap; el drag es para
     ratón. Si el usuario arrastró, se cancela el click del enlace. */
  function initDragScroll() {
    const g = document.querySelector('[data-drag]');
    if (!g) return;
    let down = false, startX = 0, startScroll = 0, moved = 0;
    g.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = 0; startX = e.clientX; startScroll = g.scrollLeft;
      g.classList.add('is-dragging');
      try { g.setPointerCapture(e.pointerId); } catch (_) {}
    });
    g.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved += Math.abs(dx);
      g.scrollLeft = startScroll - dx;
    });
    const end = (e) => {
      if (!down) return;
      down = false;
      g.classList.remove('is-dragging');
      try { g.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    g.addEventListener('pointerup', end);
    g.addEventListener('pointercancel', end);
    // si hubo arrastre real, no navegar al soltar sobre un panel
    g.addEventListener('click', (e) => {
      if (moved > 6) { e.preventDefault(); }
    }, true);
  }

  // --- Estas corren siempre (no dependen de GSAP) ---
  safe(initNavOverHero, 'navOverHero');
  safe(initCursorHalo, 'cursorHalo');
  safe(initTilt, 'tilt');
  safe(initDragScroll, 'dragScroll');

  // --- A partir de aquí, mejoras que dependen de GSAP ---
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  /* Nav vivo: marca la sección visible (indicador de estado). */
  function initScrollSpy() {
    document.querySelectorAll('nav a[href^="#"]').forEach((link) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      ScrollTrigger.create({
        trigger: target,
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => link.classList.toggle('active', self.isActive),
      });
    });
  }

  /* Barra de progreso de lectura, ligada 1:1 al scroll. */
  function initProgress() {
    gsap.to('.nav-progress', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: () => ScrollTrigger.maxScroll(window), scrub: true },
    });
  }

  /* Hero: cascada fade + lift tras cargar las fuentes. */
  function initHero() {
    const heroItems = gsap.utils.toArray('.hero .eyebrow, .hero h1, .hero p, .hero .status');
    if (!heroItems.length) return;
    gsap.set(heroItems, { opacity: 0, y: 30 });
    const play = () => gsap.to(heroItems, {
      opacity: 1, y: 0,
      duration: reduced ? 0.4 : 0.8,   // reducido = más corto, NO desactivado
      ease: 'power3.out',
      stagger: reduced ? 0.04 : 0.12,
    });
    document.fonts && document.fonts.ready ? document.fonts.ready.then(play) : play();

    /* Red de seguridad: si el ticker no arrancó (pestaña oculta al cargar,
       fallo de GSAP), setTimeout —que corre sin rAF— revela el hero igual.
       El contenido nunca queda invisible por depender de una animación. */
    setTimeout(() => {
      if (getComputedStyle(heroItems[0]).opacity === '0') {
        gsap.set(heroItems, { opacity: 1, y: 0 });
      }
    }, 4000);
  }

  /* Reveals por sección (siempre; solo se acortan con reduced-motion). */
  function initReveals() {
    document.querySelectorAll('section').forEach((section) => {
      const items = section.querySelectorAll('.reveal');
      if (!items.length) return;
      gsap.from(items, {
        opacity: 0,
        y: reduced ? 10 : 24,
        duration: reduced ? 0.4 : 0.7,
        ease: 'power2.out',
        stagger: reduced ? 0.04 : 0.1,
        scrollTrigger: { trigger: section, start: 'top 80%', once: true },
      });
    });
    // Red de seguridad: a los 6s revela lo que siga oculto sobre el fold
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach((el) => {
        if (getComputedStyle(el).opacity === '0' &&
            el.getBoundingClientRect().top < window.innerHeight) {
          gsap.set(el, { opacity: 1, y: 0 });
        }
      });
    }, 6000);
  }

  safe(initScrollSpy, 'scrollSpy');
  safe(initProgress, 'progress');
  safe(initHero, 'hero');
  safe(initReveals, 'reveals');
})();

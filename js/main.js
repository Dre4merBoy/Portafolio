/* =====================================================================
   Portafolio — Luis Contreras
   Animaciones con GSAP + ScrollTrigger (Fase 4).

   Progressive enhancement: el CSS nunca oculta contenido. Los estados
   iniciales los pone GSAP aquí; si GSAP no carga (CDN caído, JS
   bloqueado), la página se ve completa, solo sin animaciones.
   ===================================================================== */

(function () {
  'use strict';

  // Sin GSAP no hay nada que hacer: la página ya es visible por defecto.
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  // Todo el movimiento vive dentro de esta condición: quien prefiere
  // movimiento reducido ve la página estática desde el primer frame.
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    /* ---- 01 · Hero: cascada sobria (fade + lift) ----
       Se ocultan los elementos de inmediato (antes del primer paint,
       porque el script es defer) y se animan cuando las fuentes ya
       cargaron: así el H1 anima con Space Grotesk definitiva, sin
       salto de fuente a mitad de animación. */
    const heroItems = gsap.utils.toArray(
      '.hero .eyebrow, .hero h1, .hero p, .hero .status'
    );
    gsap.set(heroItems, { opacity: 0, y: 30 });

    document.fonts.ready.then(() => {
      gsap.to(heroItems, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.12,
      });
    });

    /* ---- 02–06 · Reveals por sección ----
       Cada sección anima sus .reveal en cascada (stagger 0.1s) cuando
       su borde superior alcanza el 75% del viewport. once: el reveal
       ocurre una sola vez; volver a subir no re-anima. */
    document.querySelectorAll('section').forEach((section) => {
      const items = section.querySelectorAll('.reveal');
      if (!items.length) return;

      gsap.from(items, {
        opacity: 0,
        y: 24,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.1,
        scrollTrigger: {
          trigger: section,
          start: 'top 75%',
          once: true,
        },
      });
    });
  });
})();

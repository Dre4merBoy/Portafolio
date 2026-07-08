/* =====================================================================
   Portafolio — Luis Contreras
   Reveal al hacer scroll (versión base con IntersectionObserver).
   En la Fase 4 se reemplaza por GSAP + ScrollTrigger.
   ===================================================================== */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const revealEls = document.querySelectorAll('.reveal');

  // Si el usuario prefiere menos movimiento, mostramos todo de inmediato.
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('in'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealEls.forEach((el) => observer.observe(el));
})();

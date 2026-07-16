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
  let galleryDragged = false; // compartido: distingue "arrastre" de "click" en la galería

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
    // NO usamos setPointerCapture: capturar el puntero se "tragaba" el click
    // del panel e impedía abrir el detalle. Escuchamos move/up en window.
    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx)); // desplazamiento MÁXIMO desde el inicio (no la suma)
      if (moved > 6) galleryDragged = true;
      g.scrollLeft = startScroll - dx;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      g.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    g.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      // en escritorio la galería es rejilla (no deslizable): nada que arrastrar
      if (g.scrollWidth <= g.clientWidth + 2) return;
      down = true; moved = 0; galleryDragged = false; startX = e.clientX; startScroll = g.scrollLeft;
      g.classList.add('is-dragging');
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
    // si hubo arrastre real, no dispares el click (ni navegación ni abrir detalle)
    g.addEventListener('click', (e) => {
      if (galleryDragged) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  /* ---- Nombre tecleado en el hero (línea de código) ----
     setTimeout (no rAF): se escribe aunque la pestaña esté oculta. Con
     reduced-motion aparece completo de inmediato. */
  function initHeroType() {
    const el = document.querySelector('.hero-name[data-name]');
    if (!el) return;
    const full = el.getAttribute('data-name') || '';
    if (reduced) { el.textContent = full; return; }
    let i = 0;
    const type = () => {
      i += 1;
      el.textContent = full.slice(0, i);
      if (i < full.length) setTimeout(type, 85);
    };
    setTimeout(type, 550); // arranca tras aparecer el hero
  }

  /* ---- Constelación 3D: el plano se inclina con el cursor + vaivén propio.
     Los nodos tienen --z (profundidad) → hacen parallax entre sí. Las líneas
     se redibujan cada frame hacia el centro PROYECTADO real de cada nodo
     (getBoundingClientRect ya refleja la transformación 3D), así jamás se
     desconectan. Solo corre mientras la sección está a la vista. ---- */
  function initConstel3D() {
    const box = document.querySelector('[data-constel]');
    const scene = document.querySelector('[data-scene]');
    const svg = document.querySelector('.constel-lines');
    if (!box || !scene || !svg) return;
    const nodes = [...scene.querySelectorAll('.constel-node')];
    const lines = [...svg.querySelectorAll('line')];
    if (!nodes.length || !lines.length) return;
    const pairs = lines.map((l) => [+l.dataset.a, +l.dataset.b]);

    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

    const paint = () => {
      const br = box.getBoundingClientRect();
      const pts = nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return [r.left + r.width / 2 - br.left, r.top + r.height / 2 - br.top];
      });
      lines.forEach((l, i) => {
        const a = pts[pairs[i][0]], b = pts[pairs[i][1]];
        if (!a || !b) return;
        l.setAttribute('x1', a[0].toFixed(1)); l.setAttribute('y1', a[1].toFixed(1));
        l.setAttribute('x2', b[0].toFixed(1)); l.setAttribute('y2', b[1].toFixed(1));
      });
    };

    // Repintar al redimensionar: el bucle rAF puede estar detenido (fuera de
    // vista o pestaña en segundo plano) y las líneas quedarían desfasadas.
    window.addEventListener('resize', paint, { passive: true });
    if (reduced) { paint(); return; }

    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      box.addEventListener('pointermove', (e) => {
        const r = box.getBoundingClientRect();
        tx = ((e.clientY - r.top) / r.height - 0.5) * -2; // -1..1
        ty = ((e.clientX - r.left) / r.width - 0.5) * 2;
      }, { passive: true });
      box.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
    }

    const loop = (t) => {
      // vaivén permanente: la constelación respira aunque no muevas el cursor
      const swayX = Math.sin(t * 0.00035) * 0.42;
      const swayY = Math.cos(t * 0.00026) * 0.55;
      cx += (tx + swayX - cx) * 0.06;
      cy += (ty + swayY - cy) * 0.06;
      scene.style.setProperty('--rx', (cx * 13).toFixed(2) + 'deg');
      scene.style.setProperty('--ry', (cy * 15).toFixed(2) + 'deg');
      paint();
      raf = requestAnimationFrame(loop);
    };

    // solo animar cuando la constelación está en pantalla (no gastar CPU de fondo)
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !raf) raf = requestAnimationFrame(loop);
        else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
      });
    }, { threshold: 0.01 });
    io.observe(box);
    paint(); // primer trazado inmediato
  }

  /* ---- Constelación de skills: al apuntar un nodo, la info de abajo muestra
     qué es y cómo lo uso. La selección se queda (no se resetea al salir). ---- */
  function initConstel() {
    const nodes = [...document.querySelectorAll('.constel-node')];
    const nameEl = document.querySelector('[data-cs-name]');
    const descEl = document.querySelector('[data-cs-desc]');
    if (!nodes.length || !nameEl || !descEl) return;
    const show = (n) => {
      nodes.forEach((i) => i.classList.toggle('is-active', i === n));
      nameEl.textContent = n.dataset.name;
      descEl.textContent = n.dataset.desc;
    };
    nodes.forEach((n) => {
      n.addEventListener('mouseover', () => show(n));
      n.addEventListener('focus', () => show(n));
      n.addEventListener('click', () => show(n)); // tap en móvil
    });
  }

  /* ---- Modo oscuro: alterna y recuerda la elección ----
     El tema inicial ya lo aplicó el script inline del <head> (sin destello);
     aquí solo se maneja el botón y se guarda la preferencia. */
  function initTheme() {
    const root = document.documentElement;
    const btn = document.querySelector('[data-theme-toggle]');
    const apply = (t) => {
      root.setAttribute('data-theme', t);
      if (btn) btn.setAttribute('aria-label', t === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    };
    // por si el script del head no corrió
    if (!root.getAttribute('data-theme')) {
      let guardado = null;
      try { guardado = localStorage.getItem('tema'); } catch (_) {}
      apply(guardado || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    } else {
      apply(root.getAttribute('data-theme'));
    }
    if (!btn) return;
    btn.addEventListener('click', () => {
      const nuevo = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(nuevo);
      try { localStorage.setItem('tema', nuevo); } catch (_) {}
    });
  }

  /* ---- Reloj + ubicación en vivo (hora de Monterrey) ---- */
  function initClock() {
    const el = document.querySelector('[data-clock]');
    if (!el) return;
    let fmt;
    try {
      fmt = new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Monterrey', hour: '2-digit', minute: '2-digit', hour12: false,
      });
    } catch (_) { fmt = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }); }
    const tick = () => { el.textContent = 'San Nicolás · ' + fmt.format(new Date()); };
    tick();
    setInterval(tick, 15000);
  }

  /* ---- Indicador de progreso de scroll en % ---- */
  function initScrollPct() {
    const el = document.querySelector('[data-scroll-pct]');
    if (!el) return;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
      el.textContent = pct + '%';
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  }

  /* ---- Galería de proyectos: contador (01/03) + enfoque cinematográfico ----
     El panel más cercano al centro queda en foco; los demás se atenúan (CSS
     gateado por .js-focus, así que sin JS todos se ven a tope). */
  function initProjGallery() {
    const g = document.querySelector('[data-drag]');
    if (!g) return;
    const out = document.querySelector('[data-proj-counter]');
    const panels = [...g.querySelectorAll('.proj-panel')];
    if (!panels.length) return;
    const total = panels.length;
    const pad = (n) => String(n).padStart(2, '0');
    const update = () => {
      // En escritorio es rejilla: todo visible, sin foco ni contador.
      if (g.scrollWidth <= g.clientWidth + 2) {
        g.classList.remove('js-focus');
        panels.forEach((p) => p.classList.remove('is-focus'));
        return;
      }
      g.classList.add('js-focus');
      const gr = g.getBoundingClientRect();
      const center = gr.left + gr.width / 2;
      let idx = 0, best = Infinity;
      panels.forEach((p, i) => {
        const r = p.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - center);
        if (d < best) { best = d; idx = i; }
      });
      panels.forEach((p, i) => p.classList.toggle('is-focus', i === idx));
      if (out) out.textContent = pad(idx + 1) + ' / ' + pad(total);
    };
    update();
    g.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  }

  /* ---- Detalle de proyecto: overlay con capturas verticales + info fija ----
     El panel es un <a href="sitio">: si el JS falla, el click abre el sitio
     (progressive enhancement). Con JS, el click abre el overlay. */
  function initProjectDetail() {
    const openers = document.querySelectorAll('[data-open]');
    if (!openers.length) return;
    let lastFocused = null;

    const close = (dlg) => {
      if (!dlg || dlg.hidden) return;
      dlg.classList.remove('is-open');
      dlg.setAttribute('aria-hidden', 'true');
      document.documentElement.style.overflow = '';
      const done = () => { dlg.hidden = true; dlg.removeEventListener('transitionend', done); };
      dlg.addEventListener('transitionend', done);
      setTimeout(() => { dlg.hidden = true; }, 600); // respaldo si no dispara transitionend
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };

    const open = (id) => {
      const dlg = document.getElementById(id);
      if (!dlg) return;
      lastFocused = document.activeElement;
      dlg.hidden = false;
      void dlg.offsetWidth; // reflow para que la transición corra
      dlg.classList.add('is-open');
      dlg.setAttribute('aria-hidden', 'false');
      document.documentElement.style.overflow = 'hidden'; // bloquear scroll de fondo
      const shots = dlg.querySelector('[data-shots]');
      if (shots) shots.scrollTop = 0;
      if (dlg._updCounter) dlg._updCounter();
      const closeBtn = dlg.querySelector('[data-close]');
      if (closeBtn) closeBtn.focus();
    };

    // Contador de capturas (por getBoundingClientRect: sirve en escritorio y móvil)
    document.querySelectorAll('.pdetail').forEach((dlg) => {
      const shots = dlg.querySelector('[data-shots]');
      const out = dlg.querySelector('[data-shot-counter]');
      if (shots && out) {
        const imgs = [...shots.querySelectorAll('img')];
        const total = imgs.length;
        const pad = (n) => String(n).padStart(2, '0');
        const upd = () => {
          const sr = shots.getBoundingClientRect();
          // punto de sonda cerca del tope: la "página actual" es la que ocupa
          // la parte alta de la vista (a scrollTop 0 da 01, no la del centro)
          const probe = sr.top + Math.min(140, sr.height * 0.3);
          let idx = 0;
          imgs.forEach((im, i) => { if (im.getBoundingClientRect().top <= probe) idx = i; });
          out.textContent = pad(idx + 1) + ' / ' + pad(total);
        };
        shots.addEventListener('scroll', upd, { passive: true });
        dlg.addEventListener('scroll', upd, { passive: true }); // móvil: scrollea el overlay
        dlg._updCounter = upd;
      }
      dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => close(dlg)));
    });

    openers.forEach((el) => {
      el.addEventListener('click', (e) => {
        if (galleryDragged) { e.preventDefault(); return; } // fue arrastre, no click
        e.preventDefault();
        open(el.getAttribute('data-open'));
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const openDlg = document.querySelector('.pdetail.is-open');
      if (openDlg) close(openDlg);
    });
  }

  // --- Estas corren siempre (no dependen de GSAP) ---
  safe(initNavOverHero, 'navOverHero');
  safe(initProjectDetail, 'projectDetail');
  safe(initCursorHalo, 'cursorHalo');
  safe(initTilt, 'tilt');
  safe(initDragScroll, 'dragScroll');
  safe(initTheme, 'theme');
  safe(initHeroType, 'heroType');
  safe(initConstel, 'constel');
  safe(initConstel3D, 'constel3D');
  safe(initClock, 'clock');
  safe(initProjGallery, 'projGallery');
  safe(initScrollPct, 'scrollPct');

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
    // Encabezados: revelado más marcado (suben desde abajo) — transición por sección
    gsap.utils.toArray('h2.reveal').forEach((h) => {
      gsap.from(h, {
        yPercent: reduced ? 15 : 45,
        opacity: 0,
        duration: reduced ? 0.4 : 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: h, start: 'top 88%', once: true },
      });
    });
    // Resto de elementos (excluye los h2, ya animados arriba)
    document.querySelectorAll('section').forEach((section) => {
      const items = section.querySelectorAll('.reveal:not(h2)');
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
          gsap.set(el, { opacity: 1, y: 0, yPercent: 0 });
        }
      });
    }, 6000);
  }

  /* Transición de salida del hero: el contenido deriva y se atenúa al
     scrollear (scrub). Parallax notable → se omite con reduced-motion. */
  function initHeroParallax() {
    if (reduced) return;
    const content = document.querySelector('.hero .content');
    if (!content) return;
    gsap.to(content, {
      y: -70,
      opacity: 0.2,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  safe(initScrollSpy, 'scrollSpy');
  safe(initProgress, 'progress');
  safe(initHero, 'hero');
  safe(initReveals, 'reveals');
  safe(initHeroParallax, 'heroParallax');
})();

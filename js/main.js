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

    /* Progreso de "dibujado" de las líneas (0→1). GSAP lo anima al entrar la
       sección (initConstelDraw); solo sin GSAP nacen dibujadas. NO se gatea
       con reduced-motion (regla del proyecto: acortar, no desactivar). */
    const draw = { p: (!window.gsap || !window.ScrollTrigger) ? 1 : 0, repaint: null };
    box._draw = draw;

    const paint = () => {
      const br = box.getBoundingClientRect();
      const pts = nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return [r.left + r.width / 2 - br.left, r.top + r.height / 2 - br.top];
      });
      const total = lines.length;
      lines.forEach((l, i) => {
        const a = pts[pairs[i][0]], b = pts[pairs[i][1]];
        if (!a || !b) return;
        l.setAttribute('x1', a[0].toFixed(1)); l.setAttribute('y1', a[1].toFixed(1));
        l.setAttribute('x2', b[0].toFixed(1)); l.setAttribute('y2', b[1].toFixed(1));
        // trazado progresivo: cada línea se dibuja en su franja del progreso
        // global (escalonado). El dasharray se recalcula porque la longitud
        // cambia con la inclinación 3D del plano.
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const p = Math.max(0, Math.min(1, (draw.p - (i / total) * 0.6) / 0.4));
        l.setAttribute('stroke-dasharray', len.toFixed(1));
        l.setAttribute('stroke-dashoffset', (len * (1 - p)).toFixed(1));
      });
    };

    // El tween de dibujado repinta por su cuenta: con reduced-motion el bucle
    // rAF de abajo no corre y las líneas se quedarían a medio trazar.
    draw.repaint = paint;

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

  /* ---- Constelación de skills: al apuntar un nodo, el titular del panel
     muestra qué es y cómo lo uso (con índice 01/09). Además ROTA SOLA cada
     3.2s mientras el panel está a la vista y el cursor no está encima: la
     sección vive aunque el visitante no interactúe. ---- */
  function initConstel() {
    const nodes = [...document.querySelectorAll('.constel-node')];
    const nameEl = document.querySelector('[data-cs-name]');
    const descEl = document.querySelector('[data-cs-desc]');
    const idxEl = document.querySelector('[data-cs-index]');
    if (!nodes.length || !nameEl || !descEl) return;
    const pad = (n) => String(n).padStart(2, '0');
    let current = 0;
    const show = (n) => {
      current = nodes.indexOf(n);
      nodes.forEach((i) => i.classList.toggle('is-active', i === n));
      nameEl.textContent = n.dataset.name;
      descEl.textContent = n.dataset.desc;
      if (idxEl) idxEl.textContent = pad(current + 1) + ' / ' + pad(nodes.length);
      // micro-entrada del titular (solo si GSAP cargó; sin él, cambio seco)
      if (window.gsap) {
        gsap.fromTo([nameEl, descEl], { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.05, overwrite: 'auto' });
      }
    };
    nodes.forEach((n) => {
      n.addEventListener('mouseover', () => show(n));
      n.addEventListener('focus', () => show(n));
      n.addEventListener('click', () => show(n)); // tap en móvil
    });

    // Rotación automática: solo con el panel a la vista y sin cursor encima
    const sky = document.querySelector('.constel-sky');
    if (!sky) return;
    let timer = null, inView = false, hovering = false;
    const start = () => {
      if (!timer && inView && !hovering) {
        timer = setInterval(() => show(nodes[(current + 1) % nodes.length]), 3200);
      }
    };
    const stop = () => { clearInterval(timer); timer = null; };
    sky.addEventListener('pointerenter', () => { hovering = true; stop(); });
    sky.addEventListener('pointerleave', () => { hovering = false; start(); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { inView = e.isIntersecting; if (e.isIntersecting) start(); else stop(); });
    }, { threshold: 0.25 });
    io.observe(sky);
  }

  /* ---- Copiar email (Contacto) ----
     El mailto abre el cliente de correo (fricción en máquinas corporativas);
     copiar al portapapeles es lo que un reclutador de verdad usa. Si no hay
     Clipboard API (contexto no seguro), el botón se oculta y queda el mailto. */
  function initCopyMail() {
    const btn = document.querySelector('[data-copy-mail]');
    if (!btn) return;
    if (!navigator.clipboard) { btn.hidden = true; return; }
    const label = btn.querySelector('[data-copy-label]');
    const original = label ? label.textContent : '';
    let timer = null;
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.getAttribute('data-copy-mail')).then(() => {
        btn.classList.add('is-copied');
        if (label) label.textContent = 'Copiado ✓';
        clearTimeout(timer);
        timer = setTimeout(() => {
          btn.classList.remove('is-copied');
          if (label) label.textContent = original;
        }, 2000);
      }).catch(() => {
        // sin permiso de portapapeles: al menos abrir el correo
        window.location.href = 'mailto:' + btn.getAttribute('data-copy-mail');
      });
    });
  }

  /* ---- Cronómetro VHS del hero (● REC 00:00:00, tiempo de sesión) ----
     setInterval (no rAF): sigue contando aunque la pestaña pierda foco. */
  function initVhsTimer() {
    const el = document.querySelector('[data-vhs-timer]');
    if (!el) return;
    const t0 = Date.now();
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const s = Math.floor((Date.now() - t0) / 1000);
      el.textContent = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---- Reloj + ubicación en vivo (hora de Nuevo León; la TZ IANA se llama
     America/Monterrey pero en pantalla solo se muestra estado y país) ---- */
  function initClock() {
    const el = document.querySelector('[data-clock]');
    if (!el) return;
    let fmt;
    try {
      fmt = new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Monterrey', hour: '2-digit', minute: '2-digit', hour12: false,
      });
    } catch (_) { fmt = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }); }
    const tick = () => { el.textContent = 'Nuevo León · ' + fmt.format(new Date()); };
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
  safe(initCopyMail, 'copyMail');
  safe(initVhsTimer, 'vhsTimer');
  safe(initHeroType, 'heroType');
  safe(initConstel, 'constel');
  safe(initConstel3D, 'constel3D');
  safe(initClock, 'clock');
  safe(initProjGallery, 'projGallery');
  safe(initScrollPct, 'scrollPct');

  // --- A partir de aquí, mejoras que dependen de GSAP ---
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  // En móvil, el redimensionado por la barra de URL no debe recalcular los pins
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* Divide un elemento en palabras y caracteres (SplitText casero).
     Cada palabra es una máscara (overflow hidden, CSS .split .w) y cada
     carácter un inline-block animable. Se dividen los nodos de TEXTO
     recursivamente, así los spans internos (p. ej. .accent) conservan su
     estilo. Accesible: aria-label con el texto original en el elemento y
     aria-hidden en las palabras. Solo corre si GSAP cargó: sin JS/CDN el
     titular queda intacto. */
  function splitLetters(el) {
    const label = el.textContent;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.setAttribute('aria-hidden', 'true');
            for (const ch of part) {
              const c = document.createElement('span');
              c.className = 'c';
              c.textContent = ch;
              w.appendChild(c);
            }
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    el.setAttribute('aria-label', label.trim());
    walk(el);
    el.classList.add('split');
    return el.querySelectorAll('.c');
  }

  /* Cortina en TODAS las secciones (referencia voyeurverite): cada sección
     queda CLAVADA cuando termina de mostrarse y la siguiente se desliza por
     encima como una carta de baraja. pinSpacing:false = sin hueco extra; el
     "salto" del elemento al soltarse ocurre cuando ya está tapado del todo.
     - Sección que cabe en pantalla (hero): se clava al tocar arriba.
     - Sección MÁS ALTA que la pantalla: se clava al llegar su parte final
       ('bottom bottom') — así recorres todo su contenido antes de congelarse.
     - La última no se clava: nada la cubre.
     El CSS da a las secciones fondo opaco y z-index 1 (el orden del DOM
     decide quién tapa a quién). */
  function initSectionStack() {
    // Con prefers-reduced-motion NO se clavan las secciones: la cortina
    // (pin + apilado) es justo el efecto que marea; se deja el scroll normal.
    if (reduced) return;
    const secs = gsap.utils.toArray('main section');
    secs.forEach((sec, i) => {
      if (i === secs.length - 1) return;
      ScrollTrigger.create({
        trigger: sec,
        start: () => (sec.offsetHeight <= window.innerHeight + 2 ? 'top top' : 'bottom bottom'),
        end: 'bottom top',
        pin: true,
        pinSpacing: false,
        anticipatePin: 1,
      });
    });
    // La filigrana 999 deriva hacia arriba mientras la cortina sube: da
    // sensación de profundidad entre capas (el hero no está "congelado")
    gsap.to('.hero-999', {
      yPercent: -28,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  /* Titulares de sección por caracteres: cada letra sube desde su máscara
     al entrar la sección (una vez, no scrub: es un saludo, no un dial). */
  function initSplitTitles() {
    // 'h2.reveal' + el de Proyectos (vive dentro de .proj-head.reveal)
    gsap.utils.toArray('h2.reveal, .proj-head h2').forEach((h) => {
      const chars = splitLetters(h);
      if (!chars.length) return;
      gsap.from(chars, {
        yPercent: 130,
        duration: reduced ? 0.45 : 0.85,
        ease: 'power4.out',
        stagger: reduced ? 0.008 : 0.028,
        scrollTrigger: { trigger: h, start: 'top 86%', once: true },
      });
    });
  }

  /* Parallax ligado al progreso del scroll (scrub): los wrappers .plx
     derivan de +amp a -amp px mientras cruzan el viewport. Se anima el
     WRAPPER, no el contenido: el transform inline de GSAP pisaría el del
     tilt 3D (data-tilt). En el carrusel táctil de móvil se omite: las
     tarjetas desalineadas verticalmente entorpecen el swipe. */
  function initScrubParallax() {
    const mobile = window.innerWidth <= 720;
    document.querySelectorAll('.plx[data-plx]').forEach((el) => {
      if (mobile && el.closest('.proj-gallery')) return;
      const amp = parseFloat(el.getAttribute('data-plx'));
      if (!amp) return;
      gsap.fromTo(el, { y: amp }, {
        y: -amp,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }

  /* La constelación "nace" al entrar: las líneas se trazan escalonadas
     (initConstel3D expone box._draw y su paint() aplica el dasharray) y los
     nodos encienden en cascada. En los nodos SOLO se anima opacity: su
     transform (translate + translateZ) es del stylesheet y GSAP lo pisaría. */
  function initConstelDraw() {
    const box = document.querySelector('[data-constel]');
    if (!box || !box._draw) return;
    gsap.to(box._draw, {
      p: 1,
      duration: reduced ? 0.8 : 2,
      ease: 'power2.inOut',
      scrollTrigger: { trigger: '.constel-sky', start: 'top 78%', once: true },
      onUpdate: () => { if (box._draw.repaint) box._draw.repaint(); },
    });
    gsap.from('.constel-node', {
      opacity: 0,
      duration: reduced ? 0.3 : 0.5,
      stagger: reduced ? 0.02 : 0.07,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.constel-sky', start: 'top 78%', once: true },
    });
    // red de seguridad: pase lo que pase, nada queda invisible
    setTimeout(() => {
      box._draw.p = 1;
      if (box._draw.repaint) box._draw.repaint();
      gsap.set('.constel-node', { opacity: 1 });
    }, 8000);
  }

  /* Firma manuscrita de "Sobre mí": pop con rotación al revelarse la foto.
     GSAP absorbe el rotate(-8deg) del stylesheet en su caché y termina ahí. */
  function initAboutSign() {
    const sign = document.querySelector('.about-sign');
    if (!sign) return;
    gsap.from(sign, {
      opacity: 0,
      scale: 0.5,
      rotation: -26,
      duration: reduced ? 0.4 : 0.9,
      ease: 'back.out(2)',
      scrollTrigger: { trigger: '.about-photo', start: 'top 75%', once: true },
    });
  }

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

  /* Hero: cascada fade + lift tras cargar las fuentes. El h1 (declaración)
     ya no entra en la cascada: se divide en caracteres y cada letra sube
     desde su máscara — el reveal tipográfico de la referencia. */
  function initHero() {
    const heroItems = gsap.utils.toArray('.hero .eyebrow, .hero p, .hero .status');
    const statement = document.querySelector('.hero-statement');
    const stChars = statement ? splitLetters(statement) : [];
    if (!heroItems.length && !stChars.length) return;
    gsap.set(heroItems, { opacity: 0, y: 30 });
    // ocultas desde YA (no al llegar fonts.ready): sin esto habría un
    // destello del titular completo antes de re-ocultarse para animar
    if (stChars.length) gsap.set(stChars, { yPercent: 130 });
    const play = () => {
      gsap.to(heroItems, {
        opacity: 1, y: 0,
        duration: reduced ? 0.4 : 0.8,   // reducido = más corto, NO desactivado
        ease: 'power3.out',
        stagger: reduced ? 0.04 : 0.12,
      });
      if (stChars.length) gsap.to(stChars, {
        yPercent: 0,
        duration: reduced ? 0.5 : 1.05,
        ease: 'power4.out',
        stagger: reduced ? 0.01 : 0.04,
        delay: 0.15,
      });
    };
    document.fonts && document.fonts.ready ? document.fonts.ready.then(play) : play();

    /* Red de seguridad: si el ticker no arrancó (pestaña oculta al cargar,
       fallo de GSAP), setTimeout —que corre sin rAF— revela el hero igual.
       El contenido nunca queda invisible por depender de una animación. */
    setTimeout(() => {
      if (heroItems.length && getComputedStyle(heroItems[0]).opacity === '0') {
        gsap.set(heroItems, { opacity: 1, y: 0 });
        if (stChars.length) gsap.set(stChars, { yPercent: 0 });
      }
    }, 4000);
  }

  /* Reveals por sección (siempre; solo se acortan con reduced-motion).
     Los h2 ya no se animan aquí: los revela por caracteres initSplitTitles. */
  function initReveals() {
    // Resto de elementos (excluye los h2, animados por caracteres)
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
        // al terminar, fuera el transform inline: si se queda, pisa el
        // transform del stylesheet y mata el tilt 3D (p. ej. la foto)
        clearProps: 'transform',
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
      // también los caracteres de titulares divididos que queden a la vista
      document.querySelectorAll('h2.split').forEach((h) => {
        if (h.getBoundingClientRect().top < window.innerHeight) {
          gsap.set(h.querySelectorAll('.c'), { yPercent: 0 });
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
  safe(initSectionStack, 'sectionStack');
  safe(initHero, 'hero');
  safe(initSplitTitles, 'splitTitles');
  safe(initConstelDraw, 'constelDraw');
  safe(initAboutSign, 'aboutSign');
  safe(initReveals, 'reveals');
  safe(initHeroParallax, 'heroParallax');
  safe(initScrubParallax, 'scrubParallax');
})();

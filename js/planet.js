/* =====================================================================
   Esfera de partículas del hero — cosmos Juice WRLD (999).
   Sustituye al planeta sólido: miles de puntos violetas repartidos sobre
   una esfera que respira (shader), gira y se inclina hacia el cursor,
   unida por líneas tenues tipo constelación — el mismo lenguaje visual
   que la sección Skills. Three.js (global THREE, UMD r128). IIFE.

   Robustez:
   - Si no hay WebGL o no cargó THREE → return; el glow CSS del hero queda
     como fondo (progressive enhancement).
   - DPR capado a 2 (1.5 en móvil). Un solo rAF. Pausa si la pestaña se oculta.
   ===================================================================== */

(function () {
  'use strict';

  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  const canvas = document.querySelector('[data-planet]');
  if (!canvas || !window.THREE || !hasWebGL()) return;

  const host = canvas.parentElement; // .hero
  const isMobile = window.innerWidth < 900 || /Mobi|Android/i.test(navigator.userAgent);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function size() {
    return { w: host.clientWidth || window.innerWidth, h: host.clientHeight || window.innerHeight };
  }

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile });
  const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  let { w, h } = size();
  renderer.setSize(w, h, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 0, 6);

  /* Jerarquía: group (posición + inclinación hacia el cursor) > spin (giro
     continuo en Y). Así el giro y la inclinación no se pisan entre sí. */
  const group = new THREE.Group();
  scene.add(group);
  const spin = new THREE.Group();
  spin.rotation.z = 0.18; // eje ligeramente inclinado, como un astro real
  group.add(spin);

  const R = 1.85;

  /* La esfera SIEMPRE completa en el encuadre: se calcula cuánto mundo se ve
     a la distancia de la cámara y se ajustan posición (y escala si ni
     centrada cabe, p. ej. móvil angosto) para que nunca la recorte el hero.
     El margen cubre la respiración del shader y el vaivén de la cámara. */
  function fit() {
    const mobileNow = window.innerWidth < 900;
    const visH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    const visW = visH * (w / h);
    // En móvil la esfera es más chica (margen mayor) y baja hacia el bloque de
    // texto: así se lee como una sola composición, no esfera-arriba / texto-abajo.
    const margin = R * (mobileNow ? 1.5 : 1.24);
    const s = Math.min(1, Math.max(0.4, (Math.min(visW, visH) / 2) / margin));
    group.scale.setScalar(s);
    const m = margin * s;
    let px = mobileNow ? 0 : 1.6;
    let py = mobileNow ? 0.35 : 0.55;
    px = Math.sign(px || 1) * Math.min(Math.abs(px), Math.max(0, visW / 2 - m));
    py = Math.sign(py || 1) * Math.min(Math.abs(py), Math.max(0, visH / 2 - m));
    group.position.set(px, py, 0);
  }
  fit();

  /* --- Nube de partículas sobre la esfera --- */
  const COUNT = isMobile ? 2200 : 4200;
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const phase = new Float32Array(COUNT);
  const psize = new Float32Array(COUNT);

  // Paleta 999 ponderada: violeta dominante, lavanda, toques rosa y cian
  const palette = [
    ['#8b5cf6', 0.55], ['#c4b5fd', 0.25], ['#db2777', 0.12], ['#22d3ee', 0.08],
  ].map(([hex, wgt]) => [new THREE.Color(hex), wgt]);
  function pickColor() {
    let r = Math.random(), acc = 0;
    for (let i = 0; i < palette.length; i++) {
      acc += palette[i][1];
      if (r <= acc) return palette[i][0];
    }
    return palette[0][0];
  }
  // Punto uniforme sobre la esfera (rechazo: normalizar un punto del cubo
  // sesgaría hacia las diagonales)
  function onSphere() {
    let x, y, z, l;
    do {
      x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1;
      l = x * x + y * y + z * z;
    } while (l > 1 || l < 1e-4);
    l = Math.sqrt(l);
    return [x / l, y / l, z / l];
  }

  for (let i = 0; i < COUNT; i++) {
    const p = onSphere();
    const r = R * (0.99 + Math.random() * 0.05); // corteza fina, no bola difusa
    pos[i * 3] = p[0] * r; pos[i * 3 + 1] = p[1] * r; pos[i * 3 + 2] = p[2] * r;
    const c = pickColor();
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    phase[i] = Math.random() * Math.PI * 2;
    psize[i] = 0.9 + Math.random() * 2.1;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(psize, 1));

  /* Shader propio: la esfera "respira" (radio ± seno por partícula) y cada
     punto titila — todo en GPU, sin tocar los buffers por frame. */
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: dpr },
    },
    vertexShader:
      'uniform float uTime; uniform float uScale;' +
      'attribute float aPhase; attribute float aSize; attribute vec3 aColor;' +
      'varying vec3 vColor; varying float vTw;' +
      'void main(){' +
      '  vColor = aColor;' +
      '  vTw = 0.62 + 0.38 * sin(uTime * 1.6 + aPhase * 7.0);' + // titileo
      '  vec3 p = position * (1.0 + 0.035 * sin(uTime * 0.7 + aPhase));' + // respiración
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);' +
      '  gl_PointSize = aSize * uScale * (6.0 / -mv.z);' + // atenuación por distancia
      '  gl_Position = projectionMatrix * mv;' +
      '}',
    fragmentShader:
      'precision mediump float;' +
      'varying vec3 vColor; varying float vTw;' +
      'void main(){' +
      '  float d = length(gl_PointCoord - 0.5);' +
      '  float a = smoothstep(0.5, 0.14, d) * vTw;' + // disco suave, no cuadrado
      '  if (a < 0.02) discard;' +
      '  gl_FragColor = vec4(vColor, a);' +
      '}',
  });
  spin.add(new THREE.Points(geo, mat));

  /* --- Líneas de constelación: nodos Fibonacci sobre la misma esfera,
     unidos con sus vecinos cercanos (máx 3 por nodo). Geometría estática
     que gira con la nube. --- */
  const NODES = isMobile ? 70 : 110;
  const nodePts = [];
  const GA = Math.PI * (3 - Math.sqrt(5)); // ángulo áureo
  for (let i = 0; i < NODES; i++) {
    const y = 1 - (i + 0.5) * (2 / NODES);
    const rad = Math.sqrt(1 - y * y);
    const th = i * GA;
    nodePts.push(new THREE.Vector3(Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R));
  }
  const linePos = [];
  const linkCount = new Array(NODES).fill(0);
  const MAXD = R * 0.46; // umbral de vecindad (~2-3 enlaces por nodo)
  for (let i = 0; i < NODES; i++) {
    for (let j = i + 1; j < NODES; j++) {
      if (linkCount[i] >= 3 || linkCount[j] >= 3) continue;
      if (nodePts[i].distanceTo(nodePts[j]) < MAXD) {
        linePos.push(nodePts[i].x, nodePts[i].y, nodePts[i].z, nodePts[j].x, nodePts[j].y, nodePts[j].z);
        linkCount[i]++; linkCount[j]++;
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePos), 3));
  spin.add(new THREE.LineSegments(
    lineGeo,
    new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  ));

  /* --- Núcleo: glow violeta en el centro (sprite radial additive) --- */
  function glowTex(inner) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, inner);
    g.addColorStop(0.5, inner.replace(/[\d.]+\)$/, '0.12)'));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex('rgba(139,92,246,0.8)'),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    opacity: 0.5,
  }));
  core.scale.set(6, 6, 1);
  group.add(core);

  /* --- Estrellas de fondo (puntos) --- */
  const starGeo = new THREE.BufferGeometry();
  const N = isMobile ? 260 : 600;
  const spos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    spos[i * 3] = (Math.random() - 0.5) * 40;
    spos[i * 3 + 1] = (Math.random() - 0.5) * 24;
    spos[i * 3 + 2] = -6 - Math.random() * 20;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xcbb7ff, size: 0.06, transparent: true, opacity: 0.8 })
  );
  scene.add(stars);

  /* --- Nebulosas lejanas en movimiento (sprites additive que derivan) --- */
  const nebulas = [];
  const nebColors = [
    'rgba(139,92,246,0.55)', 'rgba(219,39,119,0.45)',
    'rgba(34,211,238,0.35)', 'rgba(124,58,237,0.5)',
    isMobile ? null : 'rgba(219,39,119,0.3)',
  ].filter(Boolean);
  nebColors.forEach((colr) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex(colr),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    }));
    const s = 16 + Math.random() * 14;
    sp.scale.set(s, s, 1);
    sp.position.set((Math.random() - 0.5) * 36, (Math.random() - 0.5) * 22, -15 - Math.random() * 12);
    sp.userData = { baseX: sp.position.x, phase: Math.random() * Math.PI * 2 };
    scene.add(sp);
    nebulas.push(sp);
  });

  /* --- Parallax e inclinación con el cursor --- */
  let tx = 0, ty = 0;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 0.6;
      ty = (e.clientY / window.innerHeight - 0.5) * 0.6;
    }, { passive: true });
  }

  /* --- Loop: solo corre con la pestaña visible Y el hero en pantalla ---
     (al hacer scroll a las otras secciones el canvas queda fuera de vista:
     pausar ahí ahorra GPU/batería y evita repintar algo que no se ve). */
  let tabVisible = !document.hidden;
  let heroVisible = true;
  let ticking = false;
  function setRunning() {
    if (reduced) return; // prefers-reduced-motion: sin bucle, esfera estática
    if (tabVisible && heroVisible && !ticking) { ticking = true; requestAnimationFrame(loop); }
  }
  document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; setRunning(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      heroVisible = entries[0].isIntersecting;
      setRunning();
    }, { rootMargin: '120px' }).observe(host);
  }

  function loop() {
    if (!tabVisible || !heroVisible) { ticking = false; return; }
    const t = performance.now() * 0.001;
    mat.uniforms.uTime.value = t;
    // giro continuo; el cursor a la derecha lo acelera un poco (y viceversa)
    spin.rotation.y += (reduced ? 0.0007 : 0.0018) + tx * 0.0012;
    // la esfera se inclina suavemente hacia el cursor
    group.rotation.x += (ty * 0.55 - group.rotation.x) * 0.04;
    stars.rotation.y += 0.0003;
    const tt = t * 0.1;
    nebulas.forEach((n) => {
      n.position.x = n.userData.baseX + Math.sin(tt + n.userData.phase) * 2.6;
      n.material.rotation += 0.0002;
    });
    // cámara sigue suavemente al cursor
    camera.position.x += (tx - camera.position.x) * 0.04;
    camera.position.y += (-ty - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  // Con reduced-motion: un solo cuadro estático, sin arrancar el bucle.
  if (reduced) renderer.render(scene, camera);
  setRunning();

  window.addEventListener('resize', () => {
    const s = size(); w = s.w; h = s.h;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    fit();
    if (reduced) renderer.render(scene, camera); // re-pinta el cuadro estático
  }, { passive: true });
})();

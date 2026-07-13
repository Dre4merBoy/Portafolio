/* =====================================================================
   Planeta 3D del hero — estética cosmos Juice WRLD (999).
   Three.js (global THREE, build UMD r128). IIFE, sin módulos.

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
  let { w, h } = size();
  renderer.setSize(w, h, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 0, 6);

  // Grupo para inclinar el eje del planeta
  const planetGroup = new THREE.Group();
  planetGroup.position.set(isMobile ? 0 : 1.6, isMobile ? 1.4 : 0.6, 0);
  planetGroup.rotation.z = 0.35;
  scene.add(planetGroup);

  /* --- Textura procedural: nebulosa de gas (violeta/magenta/cian) --- */
  function nebulaTexture() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#160a2e'; // base violeta oscuro
    ctx.fillRect(0, 0, c.width, c.height);
    const cols = ['#2b0f54', '#6d28d9', '#8b5cf6', '#db2777', '#22d3ee', '#3b0764'];
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * c.width;
      const y = Math.random() * c.height;
      const r = 40 + Math.random() * 220;
      const col = cols[(Math.random() * cols.length) | 0];
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, col);
      g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.18 + Math.random() * 0.35;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  const detail = isMobile ? 48 : 96;
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, detail, detail),
    new THREE.MeshStandardMaterial({
      map: nebulaTexture(),
      emissive: new THREE.Color('#3a1d6e'),
      emissiveIntensity: 0.55,
      roughness: 0.85,
      metalness: 0.1,
    })
  );
  planetGroup.add(planet);

  /* --- Atmósfera: fresnel additive (rim glow violeta) --- */
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, detail, detail),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color('#8b5cf6') } },
      vertexShader:
        'varying vec3 vN; varying vec3 vP;' +
        'void main(){ vN = normalize(normalMatrix * normal);' +
        'vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz;' +
        'gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'varying vec3 vN; varying vec3 vP; uniform vec3 uColor;' +
        'void main(){ vec3 v = normalize(-vP);' +
        'float f = pow(1.0 - max(dot(v, vN), 0.0), 2.6);' +
        'gl_FragColor = vec4(uColor, f); }',
    })
  );
  atmosphere.scale.setScalar(1.22);
  planetGroup.add(atmosphere);

  /* --- Anillo tipo Saturno (violeta, additive glow) --- */
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.15, 3.15, 96),
    new THREE.MeshBasicMaterial({
      color: 0xb98bff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  ring.rotation.x = Math.PI * 0.62;
  ring.rotation.y = 0.15;
  planetGroup.add(ring);

  /* --- Lunas en órbita: dan compañía al planeta --- */
  const moons = [];
  [
    { r: 2.9, s: 0.17, c: 0x8b5cf6, sp: 0.011, y: 0.35 },
    { r: 3.7, s: 0.12, c: 0x22d3ee, sp: -0.007, y: -0.8 },
  ].forEach((m) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(m.s, 24, 24),
      new THREE.MeshStandardMaterial({
        color: m.c, emissive: m.c, emissiveIntensity: 0.6, roughness: 0.6,
      })
    );
    mesh.userData = { angle: Math.random() * Math.PI * 2, r: m.r, sp: m.sp, y: m.y };
    planetGroup.add(mesh);
    moons.push(mesh);
  });

  /* --- Luces de color (paleta 999) --- */
  scene.add(new THREE.AmbientLight(0x241a3a, 0.9));
  const l1 = new THREE.PointLight(0x8b5cf6, 1.4, 40); l1.position.set(6, 4, 6); scene.add(l1);
  const l2 = new THREE.PointLight(0xdb2777, 1.1, 40); l2.position.set(-6, -2, 4); scene.add(l2);
  const l3 = new THREE.PointLight(0x22d3ee, 0.7, 40); l3.position.set(-2, 5, -5); scene.add(l3);

  /* --- Estrellas de fondo (puntos) --- */
  const starGeo = new THREE.BufferGeometry();
  const N = isMobile ? 260 : 600;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
    pos[i * 3 + 2] = -6 - Math.random() * 20;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xcbb7ff, size: 0.06, transparent: true, opacity: 0.8 })
  );
  scene.add(stars);

  /* --- Nebulosas lejanas en movimiento (sprites additive que derivan) --- */
  function nebulaTex(inner) {
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
  const nebulas = [];
  const nebColors = [
    'rgba(139,92,246,0.55)', 'rgba(219,39,119,0.45)',
    'rgba(34,211,238,0.35)', 'rgba(124,58,237,0.5)',
    isMobile ? null : 'rgba(219,39,119,0.3)',
  ].filter(Boolean);
  nebColors.forEach((col) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebulaTex(col),
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

  /* --- Parallax suave con el cursor --- */
  let tx = 0, ty = 0;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 0.6;
      ty = (e.clientY / window.innerHeight - 0.5) * 0.6;
    }, { passive: true });
  }

  /* --- Loop (pausado si la pestaña no es visible) --- */
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(loop);
  });

  function loop() {
    if (!running) return;
    planet.rotation.y += reduced ? 0.0008 : 0.0022;
    atmosphere.rotation.y = planet.rotation.y;
    ring.rotation.z += 0.0006;
    stars.rotation.y += 0.0003;
    moons.forEach((mo) => {
      const d = mo.userData;
      d.angle += d.sp;
      mo.position.set(Math.cos(d.angle) * d.r, d.y, Math.sin(d.angle) * d.r);
    });
    const tt = performance.now() * 0.0001;
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
  requestAnimationFrame(loop);

  window.addEventListener('resize', () => {
    const s = size(); w = s.w; h = s.h;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    planetGroup.position.x = (window.innerWidth < 900) ? 0 : 1.6;
    planetGroup.position.y = (window.innerWidth < 900) ? 1.4 : 0.6;
  }, { passive: true });
})();

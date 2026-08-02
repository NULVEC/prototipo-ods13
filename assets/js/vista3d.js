/* ============================================================================
   vista3d.js — Base común de las tres escenas tridimensionales del sistema.

   Las tres escenas (el cubo de carbono, el bosque y el podio) necesitan lo
   mismo: un lienzo que se adapte al panel, una cámara que se pueda girar con
   el dedo o el mouse, un bucle de dibujo y una limpieza honesta al salir de
   la pantalla. Todo eso vive aquí una sola vez.

   Cada escena solo aporta lo suyo: los objetos y qué hacer en cada cuadro.

   Si el navegador no tiene WebGL, `crearVista` devuelve null y la pantalla
   que la pidió muestra su alternativa en texto. Nunca queda un hueco.
   ========================================================================= */

import * as THREE from '../vendor/three.module.min.js';
export { THREE };

/* Vistas montadas en este momento. El enrutador las libera todas antes de
   cambiar de pantalla: un contexto WebGL abandonado no se recupera solo y
   el navegador solo permite unos pocos a la vez. */
const activas = new Set();

const sinMovimiento = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------------------------
   Giro con arrastre. Se escribe a mano en lugar de traer OrbitControls:
   son treinta líneas y evita otra dependencia de 60 kB.
   ----------------------------------------------------------------------- */
function conectarArrastre(lienzo, estado) {
  let arrastrando = false, xPrevio = 0, yPrevio = 0;

  const punto = e => (e.touches ? e.touches[0] : e);

  const inicio = e => {
    arrastrando = true;
    estado.auto = false;               // si la persona toma el control, se lo dejamos
    const p = punto(e);
    xPrevio = p.clientX; yPrevio = p.clientY;
    lienzo.style.cursor = 'grabbing';
  };
  const mover = e => {
    if (!arrastrando) return;
    const p = punto(e);
    estado.angulo -= (p.clientX - xPrevio) * 0.008;
    estado.altura = Math.min(estado.alturaMax, Math.max(estado.alturaMin,
      estado.altura - (p.clientY - yPrevio) * 0.004));
    xPrevio = p.clientX; yPrevio = p.clientY;
    if (e.cancelable) e.preventDefault();
  };
  const fin = () => { arrastrando = false; lienzo.style.cursor = 'grab'; };

  lienzo.addEventListener('mousedown', inicio);
  window.addEventListener('mousemove', mover);
  window.addEventListener('mouseup', fin);
  lienzo.addEventListener('touchstart', inicio, { passive: true });
  lienzo.addEventListener('touchmove', mover, { passive: false });
  lienzo.addEventListener('touchend', fin);

  return () => {
    window.removeEventListener('mousemove', mover);
    window.removeEventListener('mouseup', fin);
  };
}

/* ==========================================================================
   crearVista — devuelve la vista lista para que la escena le cuelgue objetos,
   o null si este navegador no puede dibujar en 3D.
   ========================================================================== */
export function crearVista(idContenedor, opciones = {}) {
  const {
    fondo = 0x0c2921,
    fov = 42,
    distancia = 10,
    objetivo = new THREE.Vector3(0, 1, 0),
    angulo = Math.PI * 0.24,
    altura = 0.30,
    alturaMin = 0.05,
    alturaMax = 0.92,
    giroAuto = 0.0022,
    etiqueta = '',
    sombras = true,
    lejos = 400
  } = opciones;

  const cont = document.getElementById(idContenedor);
  if (!cont) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch (e) {
    return null;                       // sin WebGL: la pantalla enseña su texto
  }

  const ancho = cont.clientWidth || 600;
  const alto = cont.clientHeight || 340;
  renderer.setSize(ancho, alto);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (sombras) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  renderer.domElement.style.cursor = 'grab';
  renderer.domElement.setAttribute('role', 'img');
  if (etiqueta) renderer.domElement.setAttribute('aria-label', etiqueta);
  cont.replaceChildren(renderer.domElement);

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(fondo);

  const camara = new THREE.PerspectiveCamera(fov, ancho / alto, 0.1, lejos);

  const estado = {
    angulo, altura, alturaMin, alturaMax,
    auto: !sinMovimiento(),
    distancia
  };
  const soltarArrastre = conectarArrastre(renderer.domElement, estado);

  const observador = new ResizeObserver(() => {
    const a = cont.clientWidth, h = cont.clientHeight;
    if (!a || !h) return;
    camara.aspect = a / h;
    camara.updateProjectionMatrix();
    renderer.setSize(a, h);
  });
  observador.observe(cont);

  const vista = {
    THREE, renderer, escena, camara, estado, cont, objetivo,
    reloj: new THREE.Clock(),
    cuadro: 0,
    alDibujar: null,      // la escena pone aquí su función de cada cuadro
    viva: true
  };

  function dibujar() {
    if (!vista.viva) return;
    vista.cuadro = requestAnimationFrame(dibujar);

    if (estado.auto) estado.angulo += giroAuto;

    const inclinacion = estado.altura * Math.PI * 0.5;
    camara.position.set(
      Math.sin(estado.angulo) * Math.cos(inclinacion) * estado.distancia,
      Math.sin(inclinacion) * estado.distancia + 0.4,
      Math.cos(estado.angulo) * Math.cos(inclinacion) * estado.distancia
    );
    camara.lookAt(vista.objetivo);

    vista.alDibujar?.(vista.reloj.getDelta(), vista);
    renderer.render(escena, camara);
  }

  vista.arrancar = () => { if (!vista.cuadro) dibujar(); };

  vista.liberar = () => {
    if (!vista.viva) return;
    vista.viva = false;
    cancelAnimationFrame(vista.cuadro);
    observador.disconnect();
    soltarArrastre();
    escena.traverse(o => {
      o.geometry?.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          Object.values(m).forEach(v => v?.isTexture && v.dispose());
          m.dispose();
        });
      }
    });
    renderer.dispose();
    cont.replaceChildren();
    activas.delete(vista);
  };

  activas.add(vista);
  return vista;
}

/* --------------------------------------------------------------------------
   Luz estándar del sistema: una direccional con sombra y un relleno frío.
   `escala` es el tamaño típico de la escena, para encuadrar bien la sombra.
   ----------------------------------------------------------------------- */
export function iluminar(escena, escala = 4, cielo = 0x9fc4d8, suelo = 0x0c2921) {
  escena.add(new THREE.HemisphereLight(cielo, suelo, 1.05));
  const sol = new THREE.DirectionalLight(0xffffff, 1.6);
  sol.position.set(escala * 1.6, escala * 2.4, escala * 1.3);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  const s = Math.max(escala * 2.2, 4);
  Object.assign(sol.shadow.camera,
    { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: s * 6 });
  sol.shadow.camera.updateProjectionMatrix();
  escena.add(sol);
  return sol;
}

/** Interpolación suave usada por las animaciones de entrada. */
export const suavizar = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);

/** Rebote corto: crece un poco de más y se acomoda. Para lo que "brota". */
export function rebote(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 + Math.pow(1 - t, 2) * Math.sin(t * Math.PI * 2.4) * -0.55 - Math.pow(1 - t, 3);
}

/* El enrutador llama a esto antes de cambiar de pantalla. */
function destruirTodo() { [...activas].forEach(v => v.liberar()); }

window.Vistas3D = { destruirTodo, get activas() { return activas.size; } };

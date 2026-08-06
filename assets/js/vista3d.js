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

/* Cuánto gira sola una escena al aparecer, en segundos. Es una presentación,
   no una animación de fondo: pasado este tiempo se queda quieta. */
const SEGUNDOS_DE_GIRO = 9;

/* Y cuánto vuelve a girar cuando alguien le pasa el puntero por encima: lo
   justo para que se lea como "esto se puede tomar y mover". */
const SEGUNDOS_AL_TOCAR = 4;

/* --------------------------------------------------------------------------
   Color desde el sistema de diseño.

   WebGL no entiende `var(--deep)`, así que hay que resolverlo a un número. Se
   hace aquí para que el fondo de las escenas sea el mismo color que el panel
   que las envuelve; con el valor escrito a mano, al cambiar al tema oscuro el
   lienzo quedaba visiblemente más claro que su propio panel.
   ----------------------------------------------------------------------- */
export function tokenColor(nombre, respaldo = 0x0c2921) {
  const crudo = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  if (!crudo) return respaldo;
  try {
    return new THREE.Color(crudo).getHex();
  } catch (e) {
    return respaldo;
  }
}

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
    estado.inercia = 0;
    const p = punto(e);
    xPrevio = p.clientX; yPrevio = p.clientY;
    lienzo.style.cursor = 'grabbing';
    lienzo.classList.add('arrastrando');
  };
  const mover = e => {
    if (!arrastrando) return;
    const p = punto(e);
    const dx = (p.clientX - xPrevio) * 0.008;
    estado.angulo -= dx;
    /* Se recuerda el último desplazamiento para que la escena siga girando un
       instante al soltar. Es lo que separa "arrastrar una imagen" de "girar
       un objeto que tiene peso". */
    estado.inercia = -dx;
    estado.altura = Math.min(estado.alturaMax, Math.max(estado.alturaMin,
      estado.altura - (p.clientY - yPrevio) * 0.004));
    xPrevio = p.clientX; yPrevio = p.clientY;
    if (e.cancelable) e.preventDefault();
  };
  const fin = () => {
    if (!arrastrando) return;
    arrastrando = false;
    lienzo.style.cursor = 'grab';
    lienzo.classList.remove('arrastrando');
  };

  lienzo.addEventListener('mousedown', inicio);
  window.addEventListener('mousemove', mover);
  window.addEventListener('mouseup', fin);
  lienzo.addEventListener('touchstart', inicio, { passive: true });
  lienzo.addEventListener('touchmove', mover, { passive: false });
  lienzo.addEventListener('touchend', fin);
  lienzo.addEventListener('touchcancel', fin);

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
    /* El giro automático no es un interruptor sino un tiempo que se gasta: la
       escena gira despacio unos segundos, lo suficiente para que se entienda
       que tiene volumen y que se puede tomar con el dedo, y se detiene.

       Girar para siempre —que es lo que hacía— tiene tres problemas: distrae
       de la cifra que está justo al lado, cansa a los pocos segundos, y
       mantiene la tarjeta gráfica dibujando toda la sesión por un efecto que
       ya cumplió su función. El tiempo se mide en segundos y no en radianes
       para que el número diga lo que dura. */
    auto: !sinMovimiento(),
    giroRestante: SEGUNDOS_DE_GIRO,
    inercia: 0,
    distancia
  };
  const soltarArrastre = conectarArrastre(renderer.domElement, estado);

  const observador = new ResizeObserver(() => {
    const a = cont.clientWidth, h = cont.clientHeight;
    if (!a || !h) return;
    camara.aspect = a / h;
    camara.updateProjectionMatrix();
    renderer.setSize(a, h);
    vista.pedirCuadro();
  });
  observador.observe(cont);

  const vista = {
    THREE, renderer, escena, camara, estado, cont, objetivo,
    reloj: new THREE.Clock(),
    cuadro: 0,
    alDibujar: null,      // la escena pone aquí su función de cada cuadro
    viva: true,
    visible: true,        // lo maneja el observador de intersección
    quieta: false         // true cuando ya no hay nada que animar
  };

  /* ------------------------------------------------------------------------
     Dibujar solo cuando hace falta.

     Antes el bucle corría a 60 cuadros por segundo mientras la pantalla
     estuviera abierta. En la pantalla de inicio hay DOS escenas, así que eran
     120 renderizados por segundo de forma indefinida, incluso con el panel
     fuera de la vista o la pestaña en segundo plano: el ventilador se oía y en
     un portátil se notaba en la batería.

     Ahora el bucle se detiene solo en cuanto no queda nada que animar, y se
     vuelve a pedir un cuadro cuando algo cambia de verdad: un arrastre, un
     cambio de tamaño, o la escena avisando de que sigue animando.
     --------------------------------------------------------------------- */
  function colocarCamara() {
    const inclinacion = estado.altura * Math.PI * 0.5;
    camara.position.set(
      Math.sin(estado.angulo) * Math.cos(inclinacion) * estado.distancia,
      Math.sin(inclinacion) * estado.distancia + 0.4,
      Math.cos(estado.angulo) * Math.cos(inclinacion) * estado.distancia
    );
    camara.lookAt(vista.objetivo);
  }

  function dibujar() {
    vista.cuadro = 0;
    if (!vista.viva) return;

    const dt = Math.min(0.1, vista.reloj.getDelta());
    let sigue = false;

    // Giro de presentación, mientras le quede tiempo.
    if (estado.auto && estado.giroRestante > 0) {
      estado.angulo += giroAuto * (dt * 60);
      estado.giroRestante -= dt;
      sigue = true;
    }

    // Inercia al soltar el arrastre: se apaga sola.
    if (Math.abs(estado.inercia) > 0.00012) {
      estado.angulo += estado.inercia;
      estado.inercia *= Math.pow(0.94, dt * 60);
      sigue = true;
    } else {
      estado.inercia = 0;
    }

    colocarCamara();

    // La escena devuelve `true` mientras le quede animación por delante.
    if (vista.alDibujar?.(dt, vista)) sigue = true;

    renderer.render(escena, camara);

    if (sigue && vista.visible) vista.cuadro = requestAnimationFrame(dibujar);
    else vista.quieta = !sigue;
  }

  /** Pide un cuadro si no hay uno en cola. Es el único modo de reanudar. */
  vista.pedirCuadro = () => {
    if (!vista.viva || vista.cuadro || !vista.visible) return;
    vista.quieta = false;
    vista.reloj.getDelta();          // descarta el salto acumulado sin dibujar
    vista.cuadro = requestAnimationFrame(dibujar);
  };

  vista.arrancar = () => { colocarCamara(); vista.pedirCuadro(); };

  /* Se deja de dibujar cuando el panel sale de la pantalla. El umbral es 0 —
     con un solo píxel visible ya se dibuja — para que nunca se vea un lienzo
     congelado a medio entrar. */
  const enPantalla = new IntersectionObserver(entradas => {
    const visible = entradas.some(e => e.isIntersecting);
    if (visible === vista.visible) return;
    vista.visible = visible;
    if (visible) vista.pedirCuadro();
    else if (vista.cuadro) { cancelAnimationFrame(vista.cuadro); vista.cuadro = 0; }
  }, { threshold: 0 });
  enPantalla.observe(cont);

  /* En segundo plano el navegador ya frena `requestAnimationFrame`, pero al
     volver el reloj traería un salto de varios segundos y la animación daría
     un brinco. Se descarta ese salto al regresar. */
  const alVolver = () => { if (!document.hidden) vista.pedirCuadro(); };
  document.addEventListener('visibilitychange', alVolver);

  /* Al pasar el puntero por encima se entiende que se puede tocar: la escena
     retoma un poco de giro. Es una invitación, no una animación permanente. */
  const alEntrar = () => {
    if (sinMovimiento()) return;
    estado.giroRestante = Math.max(estado.giroRestante, SEGUNDOS_AL_TOCAR);
    estado.auto = true;
    vista.pedirCuadro();
  };
  renderer.domElement.addEventListener('pointerenter', alEntrar);

  vista.liberar = () => {
    if (!vista.viva) return;
    vista.viva = false;
    cancelAnimationFrame(vista.cuadro);
    observador.disconnect();
    enPantalla.disconnect();
    document.removeEventListener('visibilitychange', alVolver);
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

window.Vistas3D = {
  destruirTodo,
  get activas() { return activas.size; },
  /* Cuántas escenas están pidiendo cuadros ahora mismo. Sirve para comprobar
     que el bucle se detiene de verdad cuando no hay nada que animar: si esto
     se queda en un número distinto de cero con la pantalla quieta, hay una
     escena consumiendo tarjeta gráfica y batería para nada. */
  get enMarcha() { return [...activas].filter(v => v.cuadro !== 0).length; },
  get estado() {
    return [...activas].map(v => ({
      visible: v.visible, quieta: v.quieta, dibujando: v.cuadro !== 0,
      giroRestante: +v.estado.giroRestante.toFixed(2)
    }));
  }
};

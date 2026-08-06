/* ============================================================================
   podio3d.js — El ranking de la comunidad como podio tridimensional (UC8).

   Una tabla ordenada dice quién va primero, pero hay que leerla. Un podio se
   entiende antes de leerlo: la altura es el dato. Esta escena convierte la
   comparativa anónima en columnas cuya altura es el CO₂e evitado, con oro,
   plata y bronce en los tres primeros y la columna propia siempre resaltada.

   Si la persona no está entre los primeros, su columna se agrega igual al
   final, separada por un hueco: nadie queda fuera de su propia pantalla.

   Las etiquetas no se dibujan en 3D (haría falta cargar una fuente): son HTML
   colocado encima del lienzo, siguiendo la proyección de cada columna. Así se
   leen nítidas, se pueden seleccionar y las lee un lector de pantalla.
   ========================================================================= */

import { THREE, crearVista, iluminar, suavizar, tokenColor } from './vista3d.js';

/* Igual que en el bosque: el fondo del lienzo lo pone el tema activo. */
const fondoDelTema = () => tokenColor('--deep', 0x0a2019);
const SUELO  = 0x13312a;

const METAL = {
  oro:    { color: 0xd8a83a, metalness: 0.85, roughness: 0.28 },
  plata:  { color: 0xb9c3c0, metalness: 0.85, roughness: 0.3 },
  bronce: { color: 0xb0743c, metalness: 0.8,  roughness: 0.34 },
  yo:     { color: 0x5b9be8, metalness: 0.35, roughness: 0.35 },
  resto:  { color: 0x2c6152, metalness: 0.15, roughness: 0.7 }
};

/* Cuántos participantes entran en el podio. Más de siete y las columnas se
   vuelven palillos ilegibles en la proyección de un aula. */
const CUPOS = 7;

const ALTO_MAX = 5.2;      // metros de escena para el primer lugar
const ANCHO    = 1.15;
const PASO     = 1.62;

/* Alto aproximado de una etiqueta en píxeles, contando su relleno. Es el tope
   por debajo del cual no puede subir, para que no se salga del lienzo. */
const ALTO_ETIQUETA = 52;

/* Cuánto baja una etiqueta de cada dos para no chocar con sus vecinas. Algo
   más que su propio alto, que es lo que hace falta para separarlas. */
const SALTO_ZIGZAG = 56;

let vista = null;

/* ==========================================================================
   Montaje
   ========================================================================== */
function montar(idContenedor, tabla, aliasPropio) {
  destruir();
  if (!Array.isArray(tabla) || !tabla.length) return null;

  /* --- Quiénes salen: los primeros y, si hace falta, la persona ---------- */
  const cabeza = tabla.slice(0, CUPOS);
  const yoEnCabeza = cabeza.some(c => c.alias === aliasPropio);
  const yo = tabla.find(c => c.alias === aliasPropio);

  const puestos = yoEnCabeza || !yo
    ? cabeza.map(c => ({ c, hueco: false }))
    : [...cabeza.slice(0, CUPOS - 1).map(c => ({ c, hueco: false })),
       { c: yo, hueco: true }];

  const tope = Math.max(...puestos.map(p => p.c.co2), 0.001);

  /* Las columnas se centran alrededor del origen; el hueco cuenta como un
     puesto vacío para que se lea "hay gente en medio". */
  let x = 0;
  puestos.forEach((p, i) => {
    if (p.hueco) x += PASO * 0.8;
    p.x = x;
    x += PASO;
  });
  const centro = (x - PASO) / 2;
  puestos.forEach(p => { p.x -= centro; });

  const ancho = x;

  const FONDO = fondoDelTema();

  const v = crearVista(idContenedor, {
    fondo: FONDO,
    fov: 40,
    /* El 1,18 es aire para las etiquetas: cuelgan por encima de la cima de su
       columna, así que encuadrar justo hasta la columna más alta deja la del
       primer puesto medio cortada contra el borde. */
    distancia: Math.max(ancho * 1.05, 11) * 1.18,
    objetivo: new THREE.Vector3(0, ALTO_MAX * 0.42, 0),
    angulo: 0,
    altura: 0.20,
    alturaMin: 0.04,
    alturaMax: 0.62,
    giroAuto: 0.0011,
    etiqueta: 'Podio tridimensional de la comunidad. La altura de cada columna ' +
              'es el CO₂ evitado por ese participante. ' +
              (yo ? `La columna resaltada es la suya, en el puesto ${yo.pos}.` : '')
  });
  if (!v) return null;
  vista = v;

  const { escena, camara, cont } = v;
  escena.fog = new THREE.Fog(FONDO, ancho * 1.3, ancho * 3.8);
  iluminar(escena, ancho * 0.5, 0xa9c8d8, FONDO);

  /* --- Piso ------------------------------------------------------------- */
  const piso = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho * 3, ancho * 3),
    new THREE.MeshStandardMaterial({ color: SUELO, roughness: 1 })
  );
  piso.rotation.x = -Math.PI / 2;
  piso.receiveShadow = true;
  escena.add(piso);

  const reticula = new THREE.GridHelper(ancho * 3, Math.round(ancho * 3), 0x3f7f68, 0x1e4a3c);
  reticula.material.transparent = true;
  reticula.material.opacity = 0.3;
  reticula.position.y = 0.004;
  escena.add(reticula);

  /* --- Columnas --------------------------------------------------------- */
  const geo = new THREE.BoxGeometry(ANCHO, 1, ANCHO);
  geo.translate(0, 0.5, 0);              // crecen desde el piso

  const columnas = puestos.map((p, i) => {
    const esYo = p.c.alias === aliasPropio;
    const receta = esYo ? METAL.yo
      : i === 0 && !p.hueco ? METAL.oro
      : i === 1 && !p.hueco ? METAL.plata
      : i === 2 && !p.hueco ? METAL.bronce
      : METAL.resto;

    const malla = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      ...receta,
      emissive: esYo ? 0x12325c : 0x000000,
      emissiveIntensity: esYo ? 0.5 : 0
    }));
    malla.position.set(p.x, 0, 0);
    malla.scale.y = 0.0001;
    malla.castShadow = true;
    malla.receiveShadow = true;
    escena.add(malla);

    /* Aro en el piso bajo la columna propia: la señala aunque la cámara esté
       girada y la columna quede detrás de otra. */
    if (esYo) {
      const aro = new THREE.Mesh(
        new THREE.RingGeometry(ANCHO * 0.78, ANCHO * 0.95, 40),
        new THREE.MeshBasicMaterial({ color: 0x5b9be8, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
      );
      aro.rotation.x = -Math.PI / 2;
      aro.position.set(p.x, 0.012, 0);
      escena.add(aro);
    }

    return {
      malla, esYo,
      datos: p.c,
      x: p.x,
      alto: Math.max(0.12, p.c.co2 / tope * ALTO_MAX),
      retraso: i * 0.09
    };
  });

  /* --- Etiquetas HTML sobre el lienzo ----------------------------------- */
  const capa = document.createElement('div');
  capa.className = 'podio-capa';
  /* Los alias vienen de la base: se escapan con el mismo ayudante que usa el
     resto del sistema. `ui.js` es un script clásico, así que ya está cargado
     cuando este módulo llega a ejecutarse. */
  capa.innerHTML = columnas.map(c => `
    <div class="podio-etiqueta ${c.esYo ? 'is-yo' : ''}">
      <span class="p">#${c.datos.pos}</span>
      <b>${UI.esc(c.datos.alias)}</b>
      <span class="kg">${DB.fmt.n(c.datos.co2, 1)} kg</span>
    </div>`).join('');
  cont.appendChild(capa);
  const etiquetas = [...capa.children];

  /* --- Animación y seguimiento de las etiquetas ------------------------- */
  const animar = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DURACION = 0.7;
  let tiempo = animar ? 0 : 99;
  const cima = new THREE.Vector3();

  /* Este `alDibujar` hace dos cosas distintas: crecer las columnas (que se
     acaba) y pegar cada etiqueta a la cima de la suya (que hay que rehacer
     cada vez que la cámara se mueve). Se ejecuta entero siempre, pero solo
     pide otro cuadro mientras las columnas siguen creciendo; el resto de las
     veces lo pide quien movió la cámara. */
  const finCrecida = DURACION + (columnas.length - 1) * 0.09 + 0.05;

  v.alDibujar = dt => {
    tiempo += dt;
    const w = cont.clientWidth, h = cont.clientHeight;

    columnas.forEach((c, i) => {
      const p = suavizar(Math.min(1, Math.max(0, (tiempo - c.retraso) / DURACION)));
      c.malla.scale.y = Math.max(0.0001, c.alto * p);

      // La etiqueta se pega a la cima de su columna, en coordenadas de pantalla.
      cima.set(c.x, c.alto * p + 0.35, 0).project(camara);
      const el = etiquetas[i];
      if (cima.z > 1) { el.style.opacity = '0'; return; }

      /* Dos correcciones sobre la posición proyectada:

         El tope de arriba, porque la etiqueta se dibuja hacia arriba desde su
         anclaje y cerca del borde se saldría del lienzo. Antes que despegarse
         de su columna, prefiere pegarse al borde y seguir leyéndose. Hace
         falta aunque la cámara arranque bien encuadrada, porque se puede
         girar hasta que el punto suba.

         Y el zigzag: las columnas van bajando de altura, así que las
         etiquetas bajan con ellas y cada una aterriza encima de la siguiente.
         Bajando una de cada dos se abre el espacio, sin mover ninguna de su
         columna ni tener que quitar puestos del podio. */
      const escalon = (i % 2) ? SALTO_ZIGZAG : 0;
      const x = (cima.x * 0.5 + 0.5) * w;
      const y = Math.max(ALTO_ETIQUETA, (-cima.y * 0.5 + 0.5) * h + escalon);
      el.style.transform = `translate(-50%,-100%) translate(${x}px, ${y}px)`;
      // Las de atrás se apagan un poco para que no compitan con las de adelante.
      /* Las de atrás se apagan un poco para que no compitan con las de
         adelante. Va en `opacity` y no en un filtro: son la misma propiedad
         que ya se usa para esconder las que quedan detrás de la cámara, y
         mezclar las dos hacía que una etiqueta oculta siguiera atenuándose. */
      el.style.opacity = String(1 - Math.min(0.55, Math.max(0, cima.z - 0.965) * 22));
    });

    return tiempo < finCrecida;
  };

  v.arrancar();

  return {
    puestos: columnas.length,
    miPuesto: yo?.pos ?? null,
    fueraDeCabeza: !!yo && !yoEnCabeza,
    lider: tabla[0]
  };
}

function destruir() {
  vista?.liberar();
  vista = null;
}

window.Podio3D = { montar, destruir, CUPOS };

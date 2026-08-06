/* ============================================================================
   bosque3d.js — "Tu bosque": una acción registrada, un árbol sembrado.

   Es la traducción más directa que tiene la aplicación: cada fila de la tabla
   de registros es un árbol que se planta frente a la persona. No hay que
   explicar la métrica, se ve. Entre más constante ha sido alguien, más denso
   es su bosque, y el color de cada árbol dice de qué categoría vino.

   Los árboles se acomodan en espiral de ángulo áureo, que es como se ordenan
   las semillas de un girasol: reparte los puntos sin que queden filas ni
   huecos, y sigue funcionando igual con 5 árboles que con 400.

   Todo se dibuja con dos InstancedMesh (troncos y copas). Aunque haya
   cuatrocientos árboles, para la tarjeta gráfica son dos objetos.
   ========================================================================= */

import { THREE, crearVista, iluminar, rebote, tokenColor } from './vista3d.js';

/* Colores de copa por categoría. Salen de la misma paleta del sistema para
   que el bosque se lea como parte de la app y no como un adorno pegado. */
const COLOR_CATEGORIA = {
  reciclaje:  0x2f7d5f,
  transporte: 0x3f7fc4,
  energia:    0xc79a3c,
  agua:       0x4e9f8c
};
const COLOR_POR_DEFECTO = 0x3f8a63;

const SUELO   = 0x14342a;
const TRONCO  = 0x6b5137;
/* El fondo del lienzo lo decide el tema, no este archivo: tiene que ser el
   mismo color que el panel que rodea la escena. Ver `tokenColor`. */
const fondoDelTema = () => tokenColor('--deep', 0x0a2019);

const ANGULO_AUREO = Math.PI * (3 - Math.sqrt(5));   // ≈ 137,5°

/* Techo de árboles dibujados. Por encima de esto el bosque ya se lee como
   bosque y seguir agregando solo cuesta batería; la pantalla dice cuántos
   quedaron representados por cada árbol. */
const MAX_ARBOLES = 420;

let vista = null;

/* --------------------------------------------------------------------------
   Ruido reproducible: el bosque debe verse igual en cada recarga. Si cada
   árbol se moviera al recargar, sería imposible revisar el diseño.
   ----------------------------------------------------------------------- */
function azarDe(i) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/* ==========================================================================
   Montaje
   ========================================================================== */
function montar(idContenedor, registros = []) {
  destruir();

  const total = registros.length;
  const dibujados = Math.min(total, MAX_ARBOLES);
  if (dibujados === 0) return null;

  /* Radio del claro: crece con la raíz del número de árboles para que la
     densidad se mantenga constante en lugar de apelotonarse. */
  const radio = Math.max(3.4, Math.sqrt(dibujados) * 0.92);
  const extension = radio * 2.5;

  const FONDO = fondoDelTema();

  const v = crearVista(idContenedor, {
    fondo: FONDO,
    fov: 46,
    distancia: radio * 2.15 + 5,
    objetivo: new THREE.Vector3(0, radio * 0.16 + 1.1, 0),
    altura: 0.24,
    alturaMin: 0.04,
    alturaMax: 0.72,
    giroAuto: 0.0016,
    etiqueta: `Bosque tridimensional con ${dibujados} árboles, uno por cada ` +
              `acción sostenible registrada. Se puede girar arrastrando.`
  });
  if (!v) return null;
  vista = v;

  const { escena } = v;
  /* La niebla se mide contra la distancia de la cámara y no contra el radio:
     atada al radio, un bosque grande quedaba entero dentro de la niebla y se
     veía lavado. Así solo se difumina el borde del fondo. */
  const lejania = v.estado.distancia;
  escena.fog = new THREE.Fog(FONDO, lejania * 0.95, lejania * 2.4);
  iluminar(escena, radio, 0xa9d0bd, FONDO);

  /* --- El claro ------------------------------------------------------- */
  const suelo = new THREE.Mesh(
    new THREE.CircleGeometry(extension, 64),
    new THREE.MeshStandardMaterial({ color: SUELO, roughness: 1 })
  );
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  escena.add(suelo);

  /* Anillos de un metro: la misma idea de retícula del resto del sistema,
     para que el bosque tenga escala y no flote en el vacío. */
  const anillos = new THREE.Mesh(
    new THREE.RingGeometry(radio * 0.999, radio * 1.02, 96),
    new THREE.MeshBasicMaterial({ color: 0x2f6b55, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  anillos.rotation.x = -Math.PI / 2;
  anillos.position.y = 0.01;
  escena.add(anillos);

  /* --- Los árboles ----------------------------------------------------- */
  const geoTronco = new THREE.CylinderGeometry(0.075, 0.11, 1, 6);
  geoTronco.translate(0, 0.5, 0);          // el origen queda en la base
  const geoCopa = new THREE.ConeGeometry(0.52, 1, 8);
  geoCopa.translate(0, 0.5, 0);

  const matTronco = new THREE.MeshStandardMaterial({ color: TRONCO, roughness: 0.95 });
  const matCopa = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, flatShading: true });

  const troncos = new THREE.InstancedMesh(geoTronco, matTronco, dibujados);
  const copas = new THREE.InstancedMesh(geoCopa, matCopa, dibujados);
  troncos.castShadow = copas.castShadow = true;
  copas.receiveShadow = true;
  troncos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  copas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  /* Se siembran del más antiguo al más nuevo: la animación de entrada cuenta
     la historia en orden, y el último árbol en brotar es el registro de hoy. */
  const orden = [...registros]
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
    .slice(-dibujados);

  const color = new THREE.Color();
  const arboles = orden.map((r, i) => {
    const t = i / Math.max(1, dibujados - 1);
    const rad = radio * Math.sqrt((i + 0.5) / dibujados);
    const ang = i * ANGULO_AUREO;
    const a1 = azarDe(i), a2 = azarDe(i + 977);

    copas.setColorAt(i, color.setHex(COLOR_CATEGORIA[r.categoria] ?? COLOR_POR_DEFECTO)
      .offsetHSL(0, 0, (a1 - 0.5) * 0.10));

    return {
      x: Math.cos(ang) * rad + (a1 - 0.5) * 0.55,
      z: Math.sin(ang) * rad + (a2 - 0.5) * 0.55,
      giro: a1 * Math.PI * 2,
      /* El árbol crece un poco con el CO₂ que evitó esa acción, pero de forma
         muy contenida: si no, un día de aluminio produciría una secuoya. */
      alto: 1.15 + a2 * 0.85 + Math.min(0.7, (r.co2 || 0) * 0.12),
      ancho: 0.82 + a1 * 0.4,
      // Brotan en cascada, del centro hacia afuera.
      retraso: t * 1.25
    };
  });
  copas.instanceColor.needsUpdate = true;

  escena.add(troncos, copas);

  /* --- Animación de siembra -------------------------------------------- */
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const esc = new THREE.Vector3();
  const rot = new THREE.Quaternion();
  const eje = new THREE.Vector3(0, 1, 0);

  let tiempo = 0;
  const DURACION = 0.85;

  function colocar(t) {
    arboles.forEach((a, i) => {
      const p = rebote(Math.min(1, Math.max(0, (t - a.retraso) / DURACION)));

      rot.setFromAxisAngle(eje, a.giro);

      const altoTronco = a.alto * 0.42 * p;
      pos.set(a.x, 0, a.z);
      esc.set(a.ancho, Math.max(0.0001, altoTronco), a.ancho);
      troncos.setMatrixAt(i, m.compose(pos, rot, esc));

      pos.set(a.x, altoTronco * 0.82, a.z);
      esc.set(a.ancho * p, Math.max(0.0001, a.alto * 0.86 * p), a.ancho * p);
      copas.setMatrixAt(i, m.compose(pos, rot, esc));
    });
    troncos.instanceMatrix.needsUpdate = true;
    copas.instanceMatrix.needsUpdate = true;
  }

  const animar = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finSiembra = 1.25 + DURACION + 0.1;

  colocar(animar ? 0 : finSiembra);

  /* Devolver `true` significa "me queda animación": es lo que mantiene vivo el
     bucle de dibujo. Cuando todos los árboles acabaron de brotar devuelve
     falso y la vista se queda quieta hasta que alguien la gire. */
  v.alDibujar = dt => {
    if (tiempo > finSiembra) return false;
    tiempo += dt;
    colocar(tiempo);
    return true;
  };
  if (!animar) tiempo = finSiembra + 1;

  v.arrancar();

  /* --- Resumen que la pantalla escribe alrededor ------------------------ */
  const cuenta = {};
  registros.forEach(r => { cuenta[r.categoria] = (cuenta[r.categoria] || 0) + 1; });

  return {
    total,
    dibujados,
    recortado: total > dibujados,
    radio: +radio.toFixed(1),
    porCategoria: Object.entries(cuenta)
      .map(([id, n]) => ({ id, n, pct: Math.round(n / total * 100) }))
      .sort((a, b) => b.n - a.n)
  };
}

function destruir() {
  vista?.liberar();
  vista = null;
}

window.Bosque3D = { montar, destruir, COLOR_CATEGORIA, MAX_ARBOLES };

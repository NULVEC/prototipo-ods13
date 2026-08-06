/* ============================================================================
   escena3d.js — "El tamaño de lo que no emitiste": el volumen del carbono.

   Idea: los kilogramos de CO₂ no le dicen nada a nadie. El volumen sí. A 25 °C
   y una atmósfera, un kilogramo de CO₂ ocupa 0,556 m³, así que 100 kg evitados
   son 55,6 m³: un cubo de casi cuatro metros de lado. Esta escena dibuja ese
   cubo a escala real, con una persona de 1,70 m al lado y una retícula de un
   metro en el suelo, para que la cifra se pueda ver en lugar de leer.

   No es decoración: es la misma magnitud del resto de la aplicación, medida en
   otra unidad. Por eso comparte la retícula y la paleta con el resto del
   sistema, y por eso el suelo está en metros y no en unidades arbitrarias.

   Si el navegador no tiene WebGL, la pantalla que lo usa muestra en su lugar
   la misma información en texto.
   ========================================================================= */

import { THREE, crearVista, iluminar, tokenColor } from './vista3d.js';

/* Densidad del CO₂ gaseoso a 25 °C y 1 atm, en kg/m³.
   Se obtiene de la ley de los gases ideales: ρ = M / (R·T). */
const DENSIDAD_CO2 = 44.01 / (0.0821 * 298.15);   // ≈ 1,798 kg/m³
const M3_POR_KG = 1 / DENSIDAD_CO2;               // ≈ 0,556 m³/kg

const COLOR = {
  /* El fondo se resuelve al montar, desde `--deep`: el lienzo tiene que ser
     del mismo color que el panel que lo contiene, en los dos temas. */
  get fondo() { return tokenColor('--deep', 0x0c2921); },
  gas:      0x7fb0c8,
  arista:   0xa8d4e6,
  persona:  0xc2d3cb,
  suelo:    0x1a3d33,
  reticula: 0x2f5b4c,
  destaque: 0x5b9be8
};

let vista = null;

/* --------------------------------------------------------------------------
   Figura humana de 1,70 m. No es un modelo: es la silueta mínima que se lee
   como persona y da la escala. Menos geometría, menos que descargar.
   ----------------------------------------------------------------------- */
function crearPersona() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: COLOR.persona, roughness: 0.85, metalness: 0.05
  });

  const piernas = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.62, 4, 12), mat);
  piernas.position.y = 0.43;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 12), mat);
  torso.position.y = 1.10;
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 12), mat);
  cabeza.position.y = 1.58;

  g.add(piernas, torso, cabeza);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}

/* ==========================================================================
   Montaje
   ========================================================================== */
function montar(idContenedor, kg) {
  destruir();

  const volumen = Math.max(kg, 0.001) * M3_POR_KG;
  const lado = Math.cbrt(volumen);

  const v = crearVista(idContenedor, {
    fondo: COLOR.fondo,
    fov: 42,
    distancia: lado * 2.35 + 3.2,
    objetivo: new THREE.Vector3(0, lado * 0.46, 0),
    altura: 0.32,
    alturaMin: 0.06,
    etiqueta: `Cubo tridimensional de ${lado.toFixed(2)} metros de lado, que representa ` +
              `los ${volumen.toFixed(1)} metros cúbicos que ocupa el CO₂ evitado, ` +
              `junto a una figura humana de 1,70 metros para dar escala.`
  });
  if (!v) return null;
  vista = v;

  const { escena } = v;
  escena.fog = new THREE.Fog(COLOR.fondo, lado * 3, lado * 9);
  iluminar(escena, lado, 0x9fc4d8, COLOR.fondo);

  /* --- Suelo y retícula de un metro ----------------------------------- */
  const extension = Math.max(lado * 4, 12);
  const suelo = new THREE.Mesh(
    new THREE.PlaneGeometry(extension, extension),
    new THREE.MeshStandardMaterial({ color: COLOR.suelo, roughness: 1 })
  );
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  escena.add(suelo);

  const divisiones = Math.round(extension);   // una línea por metro
  const reticula = new THREE.GridHelper(extension, divisiones, COLOR.destaque, COLOR.reticula);
  reticula.material.opacity = 0.34;
  reticula.material.transparent = true;
  reticula.position.y = 0.002;
  escena.add(reticula);

  /* --- El volumen de CO₂ ---------------------------------------------- */
  const geo = new THREE.BoxGeometry(lado, lado, lado);
  const cubo = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color: COLOR.gas,
    transparent: true,
    opacity: 0.28,
    roughness: 0.15,
    metalness: 0,
    transmission: 0.55,
    thickness: lado * 0.5,
    side: THREE.DoubleSide
  }));
  cubo.position.y = lado / 2;
  cubo.castShadow = true;
  escena.add(cubo);

  const aristas = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: COLOR.arista, transparent: true, opacity: 0.9 })
  );
  aristas.position.copy(cubo.position);
  escena.add(aristas);

  /* --- Persona de referencia, apartada del cubo ------------------------ */
  const persona = crearPersona();
  persona.position.set(lado / 2 + 0.85, 0, lado / 2 + 0.85);
  escena.add(persona);

  v.arrancar();

  return {
    volumen, lado,
    // Datos que la pantalla escribe alrededor de la escena.
    equivalencias: equivalenciasDe(volumen, kg)
  };
}

/* --------------------------------------------------------------------------
   Comparaciones para volver tangible el volumen.

   El criterio de la lista: cosas que alguien pueda imaginar sin pensarlo, y
   con números que no sean ni ridículos ni invisibles. Por eso se filtran las
   que dan menos de una centésima o más de un millón: "0,00003 estadios" no
   informa nada, solo hace ruido.
   ----------------------------------------------------------------------- */
const REFERENCIAS = [
  { icono: 'globo',      m3: 4 / 3 * Math.PI * Math.pow(0.14, 3), sing: 'globo de fiesta',   plu: 'globos de fiesta' },
  { icono: 'agua',       m3: 0.16,                                sing: 'tanque de agua',    plu: 'tanques de agua de 160 L' },
  { icono: 'energia',    m3: 0.35,                                sing: 'refrigeradora',     plu: 'refrigeradoras' },
  { icono: 'inicio',     m3: 7 * 6 * 3,                           sing: 'aula de clase',     plu: 'aulas de clase' },
  { icono: 'transporte', m3: 12 * 2.5 * 2.9,                      sing: 'autobús urbano',    plu: 'autobuses urbanos' },
  { icono: 'fabrica',    m3: 2.4 * 2.4 * 12,                      sing: 'contenedor de barco', plu: 'contenedores de barco' }
];

/* Cuántas comparaciones se muestran. Más de cinco y la columna se vuelve una
   lista que nadie lee entera. */
const CUANTAS = 5;

function equivalenciasDe(m3, kg = m3 / M3_POR_KG) {
  const n = (v, dec) => v.toLocaleString('es-CR',
    { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const cifra = v => n(v, v < 10 ? (v < 1 ? 2 : 1) : 0);

  const candidatas = REFERENCIAS
    .map(r => ({ ...r, cuantos: m3 / r.m3 }))
    .filter(r => r.cuantos >= 0.01 && r.cuantos < 1e6)
    .map(r => ({
      icono: r.icono,
      cuantos: r.cuantos,
      // Prioridad base: las de volumen compiten entre ellas por legibilidad.
      ventaja: 0,
      texto: `${cifra(r.cuantos)} ${r.cuantos >= 0.995 && r.cuantos < 1.005 ? r.sing : r.plu}`
    }));

  /* Dos comparaciones que no son de volumen. Van con ventaja porque son las
     que de verdad aterrizan la cifra: un viaje que la gente ha hecho y unos
     árboles que puede contar. Sin la ventaja quedaban siempre al final de la
     lista y el recorte se las comía. */
  const km = kg / 0.192;                 // auto particular, kg CO₂e por km
  if (km >= 8) {
    const viajes = km / 217;             // San José → Liberia por carretera
    candidatas.push({
      icono: 'auto', cuantos: viajes, ventaja: 3,
      texto: viajes >= 0.9
        ? `${cifra(viajes)} viajes San José → Liberia sin manejar`
        : `${n(km, 0)} km que no se manejaron en carro`
    });
  }

  const arboles = kg / 21;               // un árbol maduro absorbe ~21 kg al año
  if (arboles >= 0.5) {
    candidatas.push({
      icono: 'arboles', cuantos: arboles, ventaja: 2,
      texto: `Lo que capturan ${cifra(arboles)} árboles en un año`
    });
  }

  /* Se ordenan por qué tan cómoda de imaginar es la cantidad: un número
     cercano a diez se visualiza; "0,05 aulas" y "48 390 globos" no dicen nada.
     La distancia se mide en logaritmo porque la comodidad es multiplicativa. */
  const comodidad = c => c.ventaja - Math.abs(Math.log10(Math.max(c.cuantos, 1e-6)) - 1);

  return candidatas
    .sort((a, b) => comodidad(b) - comodidad(a))
    .slice(0, CUANTAS);
}

function destruir() {
  vista?.liberar();
  vista = null;
}

window.Escena3D = { montar, destruir, M3_POR_KG, DENSIDAD_CO2, equivalenciasDe, disponible: true };

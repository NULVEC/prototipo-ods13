/* ============================================================================
   data.js — Capa de datos simulada.

   Sustituye al backend Node/Express + MySQL descrito en el Avance 3. Toda
   pantalla lee de aquí y nunca de la red, de modo que el prototipo funciona
   sin servidor. Los nombres de las colecciones siguen el diagrama de clases
   del documento: Usuario, RegistroAccion, AccionSostenible, Insignia,
   LogroUsuario, Notificacion, InformacionAmbiental, ReporteProgreso.

   Aviso: los factores de emisión son valores de referencia para el
   prototipo, no una fuente oficial de inventario de GEI.
   ========================================================================= */

const DB = (() => {

  /* ------------------------------------------------------------------ */
  /* Generador pseudoaleatorio con semilla: los gráficos deben verse     */
  /* iguales en cada recarga, si no es imposible revisar el diseño.      */
  /* ------------------------------------------------------------------ */
  function seeded(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* Fecha local en formato ISO. No se usa toISOString() porque devuelve UTC
     y en Costa Rica (UTC−6) adelantaría un día a partir de las 18:00. */
  function iso(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /* ------------------------------------------------------------------ */
  /* Catálogo de acciones sostenibles (jerarquía AccionSostenible)       */
  /* factor = kg de CO2e evitados por unidad                             */
  /* ------------------------------------------------------------------ */
  const CATEGORIAS = {
    reciclaje: {
      id: 'reciclaje', nombre: 'Reciclaje', icono: 'reciclaje', color: '#17493b', colorTexto: '#17493b',
      clase: 'RegistroAccion', unidad: 'kg', ayuda: 'Material separado y entregado a un centro de acopio.',
      tipos: [
        { id: 'papel',    nombre: 'Papel y cartón',   factor: 0.90 },
        { id: 'plastico', nombre: 'Plástico PET',     factor: 1.53 },
        { id: 'vidrio',   nombre: 'Vidrio',           factor: 0.31 },
        { id: 'aluminio', nombre: 'Aluminio y latas', factor: 8.14 },
        { id: 'organico', nombre: 'Orgánico a compost', factor: 0.25 }
      ]
    },
    transporte: {
      id: 'transporte', nombre: 'Transporte', icono: 'transporte', color: '#1d4e9b', colorTexto: '#1d4e9b',
      clase: 'AccionTransporte', unidad: 'km', ayuda: 'Distancia recorrida sin usar vehículo particular.',
      tipos: [
        { id: 'caminar',   nombre: 'A pie o en bicicleta', factor: 0.192 },
        { id: 'autobus',   nombre: 'Autobús',              factor: 0.103 },
        { id: 'tren',      nombre: 'Tren urbano',          factor: 0.135 },
        { id: 'compartido',nombre: 'Viaje compartido',     factor: 0.096 },
        { id: 'electrico', nombre: 'Vehículo eléctrico',   factor: 0.185 }
      ]
    },
    energia: {
      id: 'energia', nombre: 'Energía', icono: 'energia', color: '#b8862a', colorTexto: '#7d5a12',
      clase: 'AccionEnergia', unidad: 'kWh', ayuda: 'Consumo eléctrico evitado respecto a su promedio.',
      tipos: [
        { id: 'led',        nombre: 'Cambio a iluminación LED', factor: 0.035 },
        { id: 'standby',    nombre: 'Desconectar equipos en espera', factor: 0.035 },
        { id: 'termo',      nombre: 'Ducha más corta (calentador)', factor: 0.035 },
        { id: 'solar',      nombre: 'Secado de ropa al sol',   factor: 0.035 }
      ]
    },
    agua: {
      id: 'agua', nombre: 'Agua', icono: 'agua', color: '#4e8f7c', colorTexto: '#2c6152',
      clase: 'RegistroAccion', unidad: 'm³', ayuda: 'Agua potable ahorrada (1 m³ = 1000 litros).',
      tipos: [
        { id: 'fugas',    nombre: 'Reparación de fugas',   factor: 0.34 },
        { id: 'lluvia',   nombre: 'Captación de lluvia',   factor: 0.34 },
        { id: 'riego',    nombre: 'Riego eficiente',       factor: 0.34 },
        { id: 'reuso',    nombre: 'Reúso de agua gris',    factor: 0.34 }
      ]
    }
  };

  const CAT_LIST = Object.values(CATEGORIAS);

  /** Busca la definición de un tipo por su id de categoría y de tipo. */
  function tipoDe(catId, tipoId) {
    const c = CATEGORIAS[catId];
    if (!c) return null;
    return c.tipos.find(t => t.id === tipoId) || c.tipos[0];
  }

  /* ------------------------------------------------------------------ */
  /* Usuario demostrativo (clase Usuario)                                */
  /* ------------------------------------------------------------------ */
  const usuario = {
    id: 'USR-00418',
    nombre: 'Mariana Solís Vargas',
    correo: 'demo@ufide.ac.cr',
    alias: 'Yigüirro-418',
    provincia: 'San José',
    canton: 'Curridabat',
    meta: 45,                       // kg CO2e por mes
    desde: '2026-03-14',
    notificaciones: { recordatorio: true, logros: true, resumen: true, comunidad: false },
    frecuencia: 'diaria',
    hora: '19:00'
  };

  /* ------------------------------------------------------------------ */
  /* Historial de registros (clase RegistroAccion)                       */
  /* 90 días de actividad con estacionalidad semanal: más registros      */
  /* entre semana, menos los domingos. Con esto los gráficos tienen       */
  /* forma real y no ruido plano.                                        */
  /* ------------------------------------------------------------------ */
  function generarHistorial() {
    const rnd = seeded(13013);          // semilla: ODS 13
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const registros = [];
    let folio = 1000;

    for (let d = 89; d >= 0; d--) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - d);
      const dow = fecha.getDay();

      // Las dos últimas semanas siempre tienen actividad: el prototipo debe
      // abrirse con una racha viva y con datos del mes en curso.
      const reciente = d < 12;

      // Probabilidad de actividad: baja los domingos, alta de lunes a viernes.
      const base = dow === 0 ? 0.35 : dow === 6 ? 0.6 : 0.86;
      // Tendencia ascendente: el usuario mejora su constancia con el tiempo.
      const tendencia = 0.72 + (89 - d) / 89 * 0.32;
      if (!reciente && rnd() > base * tendencia) continue;

      const nActos = reciente
        ? 1 + (rnd() < 0.6 ? 1 : 0) + (rnd() < 0.25 ? 1 : 0)
        : 1 + (rnd() < 0.42 ? 1 : 0) + (rnd() < 0.14 ? 1 : 0);
      for (let i = 0; i < nActos; i++) {
        const cat = CAT_LIST[Math.floor(rnd() * CAT_LIST.length)];
        const tipo = cat.tipos[Math.floor(rnd() * cat.tipos.length)];

        let cantidad;
        if (cat.id === 'transporte') cantidad = +(2 + rnd() * 14).toFixed(1);
        else if (cat.id === 'reciclaje') {
          // El aluminio tiene un factor ocho veces mayor que el resto de
          // materiales, así que recibe cantidades domésticas realistas. Con el
          // rango general, un solo día de latas dominaría todo el histórico.
          cantidad = tipo.id === 'aluminio'
            ? +(0.1 + rnd() * 0.9).toFixed(2)
            : +(0.5 + rnd() * 4.5).toFixed(1);
        }
        else if (cat.id === 'energia') cantidad = +(0.8 + rnd() * 5).toFixed(1);
        else cantidad = +(0.05 + rnd() * 0.45).toFixed(2);

        registros.push({
          id: 'RA-' + (++folio),
          fecha: iso(fecha),
          categoria: cat.id,
          tipo: tipo.id,
          cantidad,
          unidad: cat.unidad,
          co2: +(cantidad * tipo.factor).toFixed(3),
          nota: ''
        });
      }
    }
    return registros;
  }

  /* ------------------------------------------------------------------ */
  /* Catálogo de insignias (clases Insignia / LogroUsuario)              */
  /* ------------------------------------------------------------------ */
  const insignias = [
    { id: 'INS-01', nombre: 'Primer registro', icono: 'brote', tono: 'pine',
      criterio: 'Registrar la primera acción sostenible.', meta: 1, campo: 'registros' },
    { id: 'INS-02', nombre: 'Semana constante', icono: 'calendario', tono: 'pine',
      criterio: 'Registrar acciones siete días seguidos.', meta: 7, campo: 'racha' },
    { id: 'INS-03', nombre: 'Cien kilos', icono: 'meta', tono: 'ochre',
      criterio: 'Evitar 100 kg de CO₂e acumulados.', meta: 100, campo: 'co2' },
    { id: 'INS-04', nombre: 'Ruta limpia', icono: 'transporte', tono: 'azul',
      criterio: 'Acumular 150 km en transporte bajo en carbono.', meta: 150, campo: 'km' },
    { id: 'INS-05', nombre: 'Separador', icono: 'reciclaje', tono: 'pine',
      criterio: 'Completar 25 registros de reciclaje.', meta: 25, campo: 'reciclajes' },
    { id: 'INS-06', nombre: 'Mes completo', icono: 'reloj', tono: 'azul',
      criterio: 'Registrar acciones treinta días seguidos.', meta: 30, campo: 'racha' },
    { id: 'INS-07', nombre: 'Media tonelada', icono: 'globo', tono: 'ochre',
      criterio: 'Evitar 500 kg de CO₂e acumulados.', meta: 500, campo: 'co2' },
    { id: 'INS-08', nombre: 'Bandera azul', icono: 'escudo', tono: 'azul',
      criterio: 'Doce semanas seguidas con al menos tres acciones.', meta: 12, campo: 'semanas' },
    { id: 'INS-09', nombre: 'Guardabosques', icono: 'arboles', tono: 'pine',
      criterio: 'Evitar 1 000 kg de CO₂e acumulados.', meta: 1000, campo: 'co2' }
  ];

  /* ------------------------------------------------------------------ */
  /* Información ambiental (clase InformacionAmbiental) — UC3            */
  /* ------------------------------------------------------------------ */
  const articulos = [
    {
      cifra: '1,55', unidadCifra: '°C',
      titulo: 'El 2024 cerró como el año más cálido registrado',
      texto: 'La temperatura media global superó por primera vez, en un año completo, el umbral de 1,5 °C sobre el nivel preindustrial. La meta del Acuerdo de París se mide en promedios de largo plazo, pero un año así indica qué tan cerca está el límite.',
      fuente: 'Organización Meteorológica Mundial', etiqueta: 'Contexto global'
    },
    {
      cifra: '99', unidadCifra: '%',
      titulo: 'Costa Rica genera casi toda su electricidad con fuentes renovables',
      texto: 'Agua, geotermia, viento y sol cubren la matriz eléctrica nacional. Por eso ahorrar un kWh evita aquí mucho menos CO₂ que en otros países: el mayor impacto del ahorro eléctrico local es reducir la demanda pico y la presión sobre los embalses.',
      fuente: 'Centro Nacional de Control de Energía', etiqueta: 'Contexto nacional'
    },
    {
      cifra: '40', unidadCifra: '%',
      titulo: 'El transporte es la principal fuente de emisiones del país',
      texto: 'La flota vehicular concentra la mayor parte de las emisiones de gases de efecto invernadero de Costa Rica. Cambiar viajes cortos en auto por caminata, bicicleta o autobús es la acción individual con mayor efecto medible.',
      fuente: 'Plan Nacional de Descarbonización 2018–2050', etiqueta: 'Dónde actuar'
    },
    {
      cifra: '2050', unidadCifra: '',
      titulo: 'La meta nacional es una economía neutra en carbono',
      texto: 'El Plan Nacional de Descarbonización fija diez ejes de trabajo hasta 2050, entre ellos el transporte público eléctrico, la gestión integral de residuos y la agricultura baja en emisiones.',
      fuente: 'Gobierno de Costa Rica', etiqueta: 'Compromiso'
    }
  ];

  const consejos = [
    { titulo: 'Separe el aluminio aparte', texto: 'Reciclar un kilo de aluminio evita alrededor de 8 kg de CO₂e: es, por peso, el material con mayor retorno ambiental de todos los que se recolectan.' },
    { titulo: 'Los viajes cortos pesan más', texto: 'Un motor frío consume hasta un 30 % más en los primeros kilómetros. Sustituir un trayecto de 3 km por caminata rinde más de lo que sugiere la distancia.' },
    { titulo: 'Revise el medidor de agua', texto: 'Cierre todas las llaves y observe el medidor por diez minutos. Si avanza, hay una fuga: repararla puede ahorrar varios metros cúbicos al mes.' },
    { titulo: 'El compost cierra el ciclo', texto: 'Los residuos orgánicos en relleno sanitario generan metano. Compostarlos en casa evita esa emisión y produce abono.' }
  ];

  /* ------------------------------------------------------------------ */
  /* Comunidad (UC8) — comparativa anónima                               */
  /* Los alias usan especies y ecosistemas del país; nunca nombres reales.*/
  /* ------------------------------------------------------------------ */
  const comunidad = [
    { alias: 'Quetzal-089',  co2: 168.4, acciones: 141, zona: 'San José' },
    { alias: 'Manglar-450',  co2: 141.2, acciones: 122, zona: 'Puntarenas' },
    { alias: 'Ceiba-077',    co2: 118.6, acciones: 107, zona: 'Alajuela' },
    { alias: 'Yigüirro-418', co2: 0,     acciones: 0,   zona: 'San José', esYo: true },
    { alias: 'Danta-902',    co2: 96.4,  acciones: 92,  zona: 'Heredia' },
    { alias: 'Colibrí-312',  co2: 88.1,  acciones: 84,  zona: 'San José' },
    { alias: 'Guaria-118',   co2: 79.5,  acciones: 71,  zona: 'Cartago' },
    { alias: 'Cocobolo-145', co2: 71.2,  acciones: 63,  zona: 'Guanacaste' },
    { alias: 'Perezoso-621', co2: 58.3,  acciones: 49,  zona: 'Limón' },
    { alias: 'Tapir-533',    co2: 44.7,  acciones: 38,  zona: 'San José' }
  ];

  /* ------------------------------------------------------------------ */
  /* Notificaciones (clase Notificacion) — UC6                           */
  /* Origen: "sistema" corresponde al actor Temporizador del Avance 3.   */
  /* ------------------------------------------------------------------ */
  function generarNotificaciones() {
    const hoy = new Date();
    const h = (dias, hora) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - dias);
      const [hh, mm] = hora.split(':');
      d.setHours(+hh, +mm, 0, 0);
      return d.toISOString();
    };
    return [
      { id: 'N-1', tipo: 'recordatorio', origen: 'sistema', leida: false, fecha: h(0, '19:00'),
        titulo: 'Aún no registra acciones de hoy',
        texto: 'Lleva 12 días seguidos con al menos un registro. Un trayecto en autobús o el reciclaje del día mantienen la racha.' },
      { id: 'N-2', tipo: 'logro', origen: 'sistema', leida: false, fecha: h(1, '08:12'),
        titulo: 'Insignia obtenida: Ruta limpia',
        texto: 'Acumuló 150 km en medios de transporte bajos en carbono desde marzo.' },
      { id: 'N-3', tipo: 'resumen', origen: 'sistema', leida: false, fecha: h(2, '07:00'),
        titulo: 'Resumen semanal disponible',
        texto: 'La semana pasada evitó 9,4 kg de CO₂e con 11 registros. Es un 18 % más que la semana anterior.' },
      { id: 'N-4', tipo: 'recordatorio', origen: 'sistema', leida: true, fecha: h(3, '19:00'),
        titulo: 'Faltan 8 días para cerrar el mes',
        texto: 'Va en 31,2 kg de 45 kg de su meta mensual. Necesita cerca de 1,7 kg diarios para alcanzarla.' },
      { id: 'N-5', tipo: 'alerta', origen: 'sistema', leida: true, fecha: h(5, '11:30'),
        titulo: 'Revise la cantidad de un registro',
        texto: 'El registro RA-1043 declara 148 kg de papel reciclado en un día. Confirme la cantidad o corríjala.' },
      { id: 'N-6', tipo: 'logro', origen: 'sistema', leida: true, fecha: h(9, '16:45'),
        titulo: 'Insignia obtenida: Cien kilos',
        texto: 'Superó los 100 kg de CO₂e evitados desde que creó la cuenta.' },
      { id: 'N-7', tipo: 'resumen', origen: 'sistema', leida: true, fecha: h(14, '07:00'),
        titulo: 'Nuevo contenido en información ambiental',
        texto: 'Se agregó la ficha sobre el peso del transporte en las emisiones nacionales.' }
    ];
  }

  /* ================================================================== */
  /* Estado de la sesión                                                 */
  /* ================================================================== */
  const KEY = 'ods13.proto.v1';

  const state = {
    autenticado: false,
    usuario,
    registros: generarHistorial(),
    notificaciones: generarNotificaciones(),
    insigniasNuevas: []           // se llena al desbloquear una insignia en UC4
  };

  function persistir() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        autenticado: state.autenticado,
        usuario: state.usuario,
        registrosExtra: state.registros.filter(r => r.manual),
        leidas: state.notificaciones.filter(n => n.leida).map(n => n.id)
      }));
    } catch (e) { /* modo archivo sin almacenamiento: el prototipo sigue */ }
  }

  function restaurar() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      state.autenticado = !!s.autenticado;
      if (s.usuario) Object.assign(state.usuario, s.usuario);
      if (Array.isArray(s.registrosExtra)) state.registros.push(...s.registrosExtra);
      if (Array.isArray(s.leidas)) {
        state.notificaciones.forEach(n => { if (s.leidas.includes(n.id)) n.leida = true; });
      }
    } catch (e) { /* datos corruptos: se ignora y se arranca limpio */ }
  }

  /* ================================================================== */
  /* Consultas derivadas (equivalen a la clase ReporteProgreso)          */
  /* ================================================================== */

  const hoyISO = () => iso(new Date());

  function registrosOrdenados() {
    return [...state.registros].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
  }

  function enUltimosDias(n) {
    const lim = new Date(); lim.setHours(0, 0, 0, 0); lim.setDate(lim.getDate() - (n - 1));
    const limISO = iso(lim);
    return state.registros.filter(r => r.fecha >= limISO);
  }

  function sumaCO2(lista) { return lista.reduce((a, r) => a + r.co2, 0); }

  /** Serie diaria de CO2 evitado para los últimos n días (para la cinta). */
  function serieDiaria(n) {
    const mapa = new Map();
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    for (let d = n - 1; d >= 0; d--) {
      const f = new Date(hoy); f.setDate(hoy.getDate() - d);
      mapa.set(iso(f), 0);
    }
    state.registros.forEach(r => {
      if (mapa.has(r.fecha)) mapa.set(r.fecha, mapa.get(r.fecha) + r.co2);
    });
    return [...mapa.entries()].map(([fecha, co2]) => ({ fecha, co2: +co2.toFixed(2) }));
  }

  /** Serie agregada por semana ISO aproximada (para UC5). */
  function serieSemanal(semanas) {
    const dias = serieDiaria(semanas * 7);
    const out = [];
    for (let i = 0; i < dias.length; i += 7) {
      const bloque = dias.slice(i, i + 7);
      out.push({
        etiqueta: fmt.fechaCorta(bloque[0].fecha) + '–' + fmt.fechaCorta(bloque[bloque.length - 1].fecha),
        co2: +bloque.reduce((a, d) => a + d.co2, 0).toFixed(2)
      });
    }
    return out;
  }

  /** Serie mensual de los últimos n meses (para UC9). */
  function serieMensual(n) {
    const mapa = new Map();
    const hoy = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      mapa.set(iso(d).slice(0, 7), {});
    }
    state.registros.forEach(r => {
      const k = r.fecha.slice(0, 7);
      if (!mapa.has(k)) return;
      const m = mapa.get(k);
      m[r.categoria] = (m[r.categoria] || 0) + r.co2;
    });
    return [...mapa.entries()].map(([mes, cats]) => ({ mes, cats }));
  }

  /** Totales por categoría en un conjunto de registros. */
  function porCategoria(lista) {
    const out = CAT_LIST.map(c => ({
      id: c.id, nombre: c.nombre, color: c.color, unidad: c.unidad,
      co2: 0, cantidad: 0, registros: 0
    }));
    const idx = Object.fromEntries(out.map((o, i) => [o.id, i]));
    lista.forEach(r => {
      const o = out[idx[r.categoria]];
      if (!o) return;
      o.co2 += r.co2; o.cantidad += r.cantidad; o.registros++;
    });
    out.forEach(o => { o.co2 = +o.co2.toFixed(2); o.cantidad = +o.cantidad.toFixed(2); });
    return out.sort((a, b) => b.co2 - a.co2);
  }

  /** Días consecutivos con al menos un registro, contando hacia atrás. */
  function racha() {
    const dias = new Set(state.registros.map(r => r.fecha));
    let n = 0;
    const d = new Date(); d.setHours(0, 0, 0, 0);
    // Si hoy aún no hay registro, la racha se mide desde ayer.
    if (!dias.has(iso(d))) d.setDate(d.getDate() - 1);
    while (dias.has(iso(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  /** Métricas que alimentan el progreso de cada insignia. */
  function metricas() {
    const total = sumaCO2(state.registros);
    return {
      registros: state.registros.length,
      co2: total,
      racha: racha(),
      km: state.registros.filter(r => r.categoria === 'transporte').reduce((a, r) => a + r.cantidad, 0),
      reciclajes: state.registros.filter(r => r.categoria === 'reciclaje').length,
      semanas: Math.min(12, Math.floor(state.registros.length / 9))
    };
  }

  /** Estado de cada insignia con su avance (clase LogroUsuario). */
  function logros() {
    const m = metricas();
    return insignias.map(i => {
      const valor = m[i.campo] || 0;
      const pct = Math.min(100, Math.round(valor / i.meta * 100));
      return { ...i, valor: +valor.toFixed(1), pct, obtenida: valor >= i.meta };
    });
  }

  /** Tabla de comunidad con el usuario actual insertado y ordenada. */
  function tablaComunidad() {
    const miCo2 = sumaCO2(state.registros);
    const lista = comunidad.map(c => c.esYo
      ? { ...c, alias: state.usuario.alias, co2: +miCo2.toFixed(1), acciones: state.registros.length }
      : { ...c });
    lista.sort((a, b) => b.co2 - a.co2);
    lista.forEach((c, i) => c.pos = i + 1);
    return lista;
  }

  /* ================================================================== */
  /* Mutaciones                                                          */
  /* ================================================================== */

  function agregarRegistro({ categoria, tipo, cantidad, fecha, nota }) {
    const t = tipoDe(categoria, tipo);
    const reg = {
      id: 'RA-' + Date.now().toString().slice(-6),
      fecha: fecha || hoyISO(),
      categoria, tipo,
      cantidad: +cantidad,
      unidad: CATEGORIAS[categoria].unidad,
      co2: +(cantidad * t.factor).toFixed(3),
      nota: nota || '',
      manual: true
    };
    state.registros.push(reg);
    persistir();
    return reg;
  }

  function eliminarRegistro(id) {
    const i = state.registros.findIndex(r => r.id === id);
    if (i >= 0) { state.registros.splice(i, 1); persistir(); }
  }

  function marcarLeidas(ids) {
    state.notificaciones.forEach(n => { if (!ids || ids.includes(n.id)) n.leida = true; });
    persistir();
  }

  function noLeidas() { return state.notificaciones.filter(n => !n.leida).length; }

  /* ================================================================== */
  /* Formato (es-CR: coma decimal, punto de millar)                      */
  /* ================================================================== */
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
                 'agosto','setiembre','octubre','noviembre','diciembre'];
  const MESES_C = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];

  const fmt = {
    n(v, dec = 1) {
      return Number(v).toLocaleString('es-CR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    },
    co2(v) { return fmt.n(v, Math.abs(v) < 10 ? 2 : 1); },
    fecha(iso) {
      const [y, m, d] = iso.split('-').map(Number);
      return `${d} de ${MESES[m - 1]} de ${y}`;
    },
    fechaCorta(iso) {
      const [, m, d] = iso.split('-').map(Number);
      return `${d} ${MESES_C[m - 1]}`;
    },
    mes(iso) {
      const [y, m] = iso.split('-').map(Number);
      return `${MESES_C[m - 1]} ${String(y).slice(2)}`;
    },
    relativo(isoDT) {
      const t = new Date(isoDT), ahora = new Date();
      const min = Math.round((ahora - t) / 60000);
      if (min < 1) return 'ahora';
      if (min < 60) return `hace ${min} min`;
      const hrs = Math.round(min / 60);
      if (hrs < 24) return `hace ${hrs} h`;
      const d = Math.round(hrs / 24);
      if (d === 1) return 'ayer';
      if (d < 7) return `hace ${d} días`;
      return fmt.fechaCorta(isoDT.slice(0, 10));
    },
    iniciales(nombre) {
      return nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
    }
  };

  /* Equivalencias para volver tangible el CO2 (usado en UC4 y UC9). */
  function equivalencia(kg) {
    if (kg <= 0) return 'Complete el formulario para ver el cálculo.';
    const km = kg / 0.192;
    const arboles = kg / 21;      // 1 árbol maduro absorbe ~21 kg CO2 al año
    const cargas = kg / 0.0084;   // carga de un teléfono ≈ 8,4 g CO2e
    if (kg < 1) return `Equivale a no recorrer ${fmt.n(km, 1)} km en auto particular.`;
    if (kg < 25) return `Equivale a no recorrer ${fmt.n(km, 0)} km en auto particular, o a ${fmt.n(cargas, 0)} cargas de teléfono.`;
    return `Equivale al CO₂ que absorben ${fmt.n(arboles, 1)} árboles maduros en un año.`;
  }

  restaurar();

  return {
    CATEGORIAS, CAT_LIST, tipoDe,
    state, persistir,
    insignias, articulos, consejos,
    registrosOrdenados, enUltimosDias, sumaCO2,
    serieDiaria, serieSemanal, serieMensual, porCategoria,
    racha, metricas, logros, tablaComunidad,
    agregarRegistro, eliminarRegistro, marcarLeidas, noLeidas,
    fmt, equivalencia, hoyISO
  };
})();

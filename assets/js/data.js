/* ============================================================================
   data.js — Capa de datos simulada.

   Sustituye al backend Node/Express + MySQL descrito en el Avance 3. Toda
   pantalla lee de aquí y nunca de la red, de modo que el prototipo funciona
   sin servidor. Los nombres de las colecciones siguen el diagrama de clases
   del documento: Usuario, RegistroAccion, AccionSostenible, Insignia,
   LogroUsuario, Notificacion, InformacionAmbiental, ReporteProgreso.

   Los factores de emisión declaran su fuente (ver FUENTES). Los de
   electricidad vienen del Instituto Meteorológico Nacional, que los publica
   por año para Costa Rica; los de transporte, de las tablas de conversión
   del gobierno británico; los de reciclaje y compostaje, del modelo WARM de
   la EPA. Todos se contrastaron contra el documento publicado.

   Quedan dos sin verificar, marcados `porVerificar`: el agua, y el consumo
   por kilómetro que se le supone a un vehículo eléctrico. Salen señalados en
   el reporte para que no se citen sin confirmarlos.
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
  /* Fuentes de los factores de emisión                                  */
  /*                                                                     */
  /* Cada factor del catálogo declara de dónde sale. Un número sin       */
  /* fuente no se puede defender ni citar, y este sistema afirma cosas   */
  /* concretas sobre el impacto de una persona.                          */
  /*                                                                     */
  /* `verificada: false` marca las fuentes cuyo valor exacto todavía no  */
  /* se contrastó contra el documento publicado. Son de referencia       */
  /* razonable, pero antes de citarlas en el artículo hay que abrir la   */
  /* fuente y confirmar la cifra y su edición.                           */
  /* ------------------------------------------------------------------ */
  const FUENTES = {
    imn: {
      sigla: 'IMN 2024',
      titulo: 'Factores de emisión de gases efecto invernadero, 14.ª edición',
      autor: 'Instituto Meteorológico Nacional de Costa Rica',
      anio: 2024,
      url: 'https://cglobal.imn.ac.cr/documentos/publicaciones/factoresemision/factoresemision2024/FactoresEmision-GEI-2024.pdf',
      verificada: true,
      origen: 'Costa Rica'
    },
    defra: {
      sigla: 'DEFRA 2024',
      titulo: 'UK Government GHG Conversion Factors for Company Reporting',
      autor: 'Department for Energy Security and Net Zero, Reino Unido',
      anio: 2024,
      url: 'https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting',
      verificada: true,
      origen: 'Internacional',
      porQue: 'El IMN publica el CO₂ por litro de combustible, no por pasajero-kilómetro. ' +
              'Pasar de uno a otro exigiría el rendimiento y la ocupación media de la flota ' +
              'costarricense, que no están publicados, así que se usa la tabla británica, ' +
              'que sí mide por pasajero-kilómetro sobre datos de flota reales.'
    },
    warm: {
      sigla: 'EPA WARM',
      titulo: 'Waste Reduction Model (WARM), versión 16',
      autor: 'United States Environmental Protection Agency',
      anio: 2023,
      url: 'https://www.epa.gov/waste-reduction-model',
      verificada: true,
      origen: 'Internacional',
      porQue: 'Reciclar evita dos cosas: el metano del relleno y la fabricación con material ' +
              'virgen. El IMN cubre lo primero, pero Costa Rica no publica lo segundo, que es ' +
              'la mayor parte del ahorro. WARM es el modelo de referencia para eso.'
    },
    porVerificar: {
      sigla: 'Por verificar',
      titulo: 'Valor de referencia pendiente de contrastar con su fuente',
      autor: '—',
      anio: null,
      url: '',
      verificada: false,
      origen: '—'
    }
  };

  /* ------------------------------------------------------------------ */
  /* Catálogo de acciones sostenibles (jerarquía AccionSostenible)       */
  /*                                                                     */
  /* factor = kg de CO2e evitados por unidad.                            */
  /*                                                                     */
  /* En transporte, "evitado" es la diferencia contra el viaje que se    */
  /* sustituye: lo que habría emitido un auto particular menos lo que    */
  /* emite el medio elegido. Por eso caminar evita el factor completo    */
  /* del auto y el autobús evita solo la diferencia. Cada tipo lleva su  */
  /* cálculo escrito para que la resta se pueda revisar.                 */
  /* ------------------------------------------------------------------ */

  /* Auto mediano de gasolina, solo la persona que conduce (DEFRA 2024).
     Es la referencia contra la que se mide todo el transporte. */
  const AUTO_KM = 0.187;
  const BUS_KM  = 0.089;   // autobús urbano, por pasajero-kilómetro (DEFRA 2024)
  const TREN_KM = 0.035;   // tren de pasajeros, por pasajero-kilómetro (DEFRA 2024)

  /* Las restas se hacen aquí y no a mano: el número que ve la persona y el
     cálculo que se explica en el reporte salen de la misma línea, así que no
     se pueden desincronizar al retocar uno de los dos. */
  const redondear = v => +v.toFixed(3);

  /* Red eléctrica de Costa Rica, año 2023: el más reciente que publica el IMN
     en su 14.ª edición. */
  const ELECTRICIDAD_KWH = 0.0879;

  /* --- Conversión de las tablas de WARM ---------------------------------
     WARM publica sus factores en toneladas de CO2e por tonelada corta de
     material, y con signo negativo cuando la gestión evita emisiones. Lo que
     se evita al reciclar en vez de enterrar es la diferencia entre las dos
     columnas, y esta app trabaja en kilos por kilo.
     ---------------------------------------------------------------------- */
  const TONELADA_CORTA = 907.185;                    // kg
  const warm = (reciclar, enterrar) =>
    redondear((enterrar - reciclar) * 1000 / TONELADA_CORTA);

  /* --- Residuos con datos costarricenses ---------------------------------
     El IMN publica cuánto metano suelta un kilo de residuo según cómo se
     trate, y los potenciales de calentamiento para convertirlo a CO2e. Con
     eso el compostaje se calcula entero con datos del país, sin recurrir a
     un modelo de otro lado.

     Los potenciales son los de la 14.ª edición (IPCC AR5). La edición
     anterior usaba 21 y 310: mezclar los factores de una edición con los
     potenciales de otra daría un número que no es de ninguna de las dos.
     ---------------------------------------------------------------------- */
  const PCG_CH4 = 28;
  const PCG_N2O = 265;

  const CH4_RELLENO = 0.0519;   // kg CH4 por kg de residuo enterrado
  const CH4_COMPOST = 0.004;    // kg CH4 por kg compostado
  const N2O_COMPOST = 0.00024;  // kg N2O por kg compostado (0,24 g)

  const co2eRelleno = CH4_RELLENO * PCG_CH4;
  const co2eCompost = CH4_COMPOST * PCG_CH4 + N2O_COMPOST * PCG_N2O;

  const CATEGORIAS = {
    reciclaje: {
      id: 'reciclaje', nombre: 'Reciclaje', icono: 'reciclaje', color: '#17493b', colorTexto: '#17493b',
      clase: 'RegistroAccion', unidad: 'kg', ayuda: 'Material separado y entregado a un centro de acopio.',
      /* Cada par de números son las columnas "Net Recycling" y "Net
         Landfilling" de WARM v16. El papel pesa tanto porque su factor
         incluye el carbono forestal que no se corta. */
      tipos: [
        { id: 'papel',    nombre: 'Papel y cartón',     factor: warm(-3.55, 0.02), fuente: 'warm',
          calculo: 'Papel mixto doméstico: reciclar −3,55 frente a enterrar 0,02' },
        { id: 'plastico', nombre: 'Plástico PET',       factor: warm(-1.04, 0.02), fuente: 'warm',
          calculo: 'PET: reciclar −1,04 frente a enterrar 0,02' },
        { id: 'vidrio',   nombre: 'Vidrio',             factor: warm(-0.28, 0.02), fuente: 'warm',
          calculo: 'Vidrio: reciclar −0,28 frente a enterrar 0,02' },
        { id: 'aluminio', nombre: 'Aluminio y latas',   factor: warm(-9.13, 0.02), fuente: 'warm',
          calculo: 'Latas de aluminio: reciclar −9,13 frente a enterrar 0,02' },
        { id: 'organico', nombre: 'Orgánico a compost',
          factor: redondear(co2eRelleno - co2eCompost), fuente: 'imn',
          calculo: 'Metano de relleno 0,0519 kg frente a compostaje 0,004 kg, por kilo' }
      ]
    },
    transporte: {
      id: 'transporte', nombre: 'Transporte', icono: 'transporte', color: '#1d4e9b', colorTexto: '#1d4e9b',
      clase: 'AccionTransporte', unidad: 'km', ayuda: 'Distancia recorrida sin usar vehículo particular.',
      tipos: [
        { id: 'caminar',   nombre: 'A pie o en bicicleta', factor: AUTO_KM, fuente: 'defra',
          calculo: 'Se evita el viaje entero en auto' },
        { id: 'autobus',   nombre: 'Autobús',              factor: redondear(AUTO_KM - BUS_KM), fuente: 'defra',
          calculo: `Auto ${AUTO_KM} − autobús urbano ${BUS_KM}` },
        { id: 'compartido',nombre: 'Viaje compartido',     factor: redondear(AUTO_KM / 2), fuente: 'defra',
          calculo: 'Al ir dos personas, a cada una le toca la mitad' },
        { id: 'tren',      nombre: 'Tren urbano',          factor: redondear(AUTO_KM - TREN_KM), fuente: 'defra',
          calculo: `Auto ${AUTO_KM} − tren de pasajeros ${TREN_KM}` },
        { id: 'electrico', nombre: 'Vehículo eléctrico',   factor: redondear(AUTO_KM - 0.19 * ELECTRICIDAD_KWH),
          fuente: 'porVerificar',
          calculo: `Auto ${AUTO_KM} − 0,19 kWh/km × ${ELECTRICIDAD_KWH}; falta verificar el consumo` }
      ]
    },
    energia: {
      id: 'energia', nombre: 'Energía', icono: 'energia', color: '#b8862a', colorTexto: '#7d5a12',
      clase: 'AccionEnergia', unidad: 'kWh', ayuda: 'Consumo eléctrico evitado respecto a su promedio.',
      /* Se usa el año más reciente que publica el IMN. El salto de 2022
         (0,0534) a 2023 (0,0879) no es un error: 2023 fue seco, entró más
         generación térmica y el factor del país casi se dobló. Aun así sigue
         siendo bajo, y por eso ahorrar electricidad rinde poco aquí. */
      tipos: [
        { id: 'led',     nombre: 'Cambio a iluminación LED',      factor: ELECTRICIDAD_KWH, fuente: 'imn' },
        { id: 'standby', nombre: 'Desconectar equipos en espera', factor: ELECTRICIDAD_KWH, fuente: 'imn' },
        { id: 'termo',   nombre: 'Ducha más corta (calentador)',  factor: ELECTRICIDAD_KWH, fuente: 'imn' },
        { id: 'solar',   nombre: 'Secado de ropa al sol',         factor: ELECTRICIDAD_KWH, fuente: 'imn' }
      ]
    },
    agua: {
      id: 'agua', nombre: 'Agua', icono: 'agua', color: '#4e8f7c', colorTexto: '#2c6152',
      clase: 'RegistroAccion', unidad: 'm³', ayuda: 'Agua potable ahorrada (1 m³ = 1000 litros).',
      tipos: [
        { id: 'fugas',  nombre: 'Reparación de fugas', factor: 0.34, fuente: 'porVerificar' },
        { id: 'lluvia', nombre: 'Captación de lluvia', factor: 0.34, fuente: 'porVerificar' },
        { id: 'riego',  nombre: 'Riego eficiente',     factor: 0.34, fuente: 'porVerificar' },
        { id: 'reuso',  nombre: 'Reúso de agua gris',  factor: 0.34, fuente: 'porVerificar' }
      ]
    }
  };

  /** La ficha completa de la fuente de un tipo de acción. */
  function fuenteDe(tipo) {
    return FUENTES[tipo?.fuente] || FUENTES.porVerificar;
  }

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
      criterio: 'Evitar 100 kg de CO₂ acumulados.', meta: 100, campo: 'co2' },
    { id: 'INS-04', nombre: 'Ruta limpia', icono: 'transporte', tono: 'azul',
      criterio: 'Acumular 150 km en transporte bajo en carbono.', meta: 150, campo: 'km' },
    { id: 'INS-05', nombre: 'Separador', icono: 'reciclaje', tono: 'pine',
      criterio: 'Completar 25 registros de reciclaje.', meta: 25, campo: 'reciclajes' },
    { id: 'INS-06', nombre: 'Mes completo', icono: 'reloj', tono: 'azul',
      criterio: 'Registrar acciones treinta días seguidos.', meta: 30, campo: 'racha' },
    { id: 'INS-07', nombre: 'Media tonelada', icono: 'globo', tono: 'ochre',
      criterio: 'Evitar 500 kg de CO₂ acumulados.', meta: 500, campo: 'co2' },
    { id: 'INS-08', nombre: 'Bandera azul', icono: 'escudo', tono: 'azul',
      criterio: 'Doce semanas seguidas con al menos tres acciones.', meta: 12, campo: 'semanas' },
    { id: 'INS-09', nombre: 'Guardabosques', icono: 'arboles', tono: 'pine',
      criterio: 'Evitar 1 000 kg de CO₂ acumulados.', meta: 1000, campo: 'co2' }
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

  /* ------------------------------------------------------------------ */
  /* Glosario                                                            */
  /*                                                                     */
  /* Una aplicación ambiental está llena de palabras que solo entiende   */
  /* quien ya sabía del tema: "factor de emisión", "CO₂e", "percentil".  */
  /* Si hay que saber el vocabulario para entender la pantalla, la       */
  /* pantalla no está informando a nadie.                                */
  /*                                                                     */
  /* Cada término se explica en dos niveles: `corto` es la frase que se  */
  /* lee de pasada, `largo` es para quien quiso saber más. Ninguno de    */
  /* los dos usa otra palabra que también haya que buscar.               */
  /* ------------------------------------------------------------------ */
  const glosario = {
    co2: {
      termino: 'CO₂',
      corto: 'El gas que más calienta el planeta.',
      largo: `CO₂ es dióxido de carbono, un gas que sale sobre todo de quemar
              combustibles: gasolina, diésel, gas. El problema no es el gas en sí
              —siempre ha existido— sino la cantidad: atrapa calor en la atmósfera
              y por eso el planeta se está calentando.
              Se mide en kilos, igual que cualquier otra cosa que pese.`
    },
    evitado: {
      termino: 'CO₂ evitado',
      corto: 'El gas que NO se produjo porque hiciste algo distinto.',
      largo: `Cuando te vas en bus en vez de en carro, esos kilos de CO₂ que
              habría soltado el carro nunca salieron. Eso es CO₂ evitado: no es
              algo que limpiaste, es algo que no llegó a pasar.
              Por eso la app suma en positivo: cada registro es una emisión que
              no ocurrió.`
    },
    factor: {
      termino: 'Factor de emisión',
      corto: 'Cuánto CO₂ ahorra cada unidad de lo que hiciste.',
      largo: `Es el número por el que se multiplica lo que registraste.
              Reciclar un kilo de aluminio evita 8,14 kg de CO₂, así que su factor
              es 8,14. Un kilómetro en bus evita 0,103 kg, así que su factor es
              0,103.
              La cuenta siempre es la misma: lo que hiciste × su factor = CO₂ evitado.`
    },
    huella: {
      termino: 'Huella de carbono',
      corto: 'Todo el CO₂ que produce una persona con su forma de vivir.',
      largo: `Es la suma del CO₂ que generás con lo que hacés a diario:
              transportarte, comer, usar electricidad, comprar cosas.
              Esta app no mide tu huella completa, sino lo que le vas restando.`
    },
    racha: {
      termino: 'Racha',
      corto: 'Días seguidos en que registraste al menos una acción.',
      largo: `Se cuenta hacia atrás desde hoy. Si un día no registrás nada,
              la racha vuelve a cero.
              No mide cuánto hiciste, mide qué tan constante fuiste — que para
              formar un hábito importa más.`
    },
    promedio: {
      termino: 'Promedio diario',
      corto: 'Cuánto te sale por día si repartís el total entre todos los días.',
      largo: `Se suma todo el CO₂ del periodo y se divide entre la cantidad de
              días, incluidos aquellos en que no registraste nada.
              Sirve para comparar periodos de distinto largo: un mes bueno y una
              semana buena no se pueden comparar por el total, pero sí por el
              promedio.`
    },
    mejorQue: {
      termino: 'Le ganás al X %',
      corto: 'De cada 100 participantes, a cuántos les llevás ventaja.',
      largo: `Si dice que le ganás al 70 %, quiere decir que de cada 100
              participantes hay 70 con menos CO₂ evitado que vos y 30 con más.
              Es otra forma de leer tu puesto que no depende de cuánta gente haya
              en total.`
    },
    ods13: {
      termino: 'ODS 13',
      corto: 'La meta mundial de actuar contra el cambio climático.',
      largo: `Los Objetivos de Desarrollo Sostenible son 17 metas que casi todos
              los países del mundo acordaron en 2015 para cumplir al 2030.
              El número 13 es "Acción por el clima".
              Este sistema existe para ese objetivo: que una persona pueda ver y
              medir lo que aporta.`
    },
    anonimo: {
      termino: 'Alias',
      corto: 'El nombre falso con el que aparecés ante los demás.',
      largo: `En la comparación con otras personas nunca se muestra tu nombre
              ni tu correo: solo un alias que el sistema arma con una especie
              costarricense y un número, como "Yigüirro-418".
              Los demás ven ese alias, tu provincia y tu total. Nada más.`
    }
  };

  const consejos = [
    { titulo: 'Separá el aluminio aparte', texto: 'Reciclar un kilo de aluminio evita alrededor de 8 kg de CO₂: es, por peso, el material con mayor retorno ambiental de todos los que se recolectan.' },
    { titulo: 'Los viajes cortos pesan más', texto: 'Un motor frío consume hasta un 30 % más en los primeros kilómetros. Sustituir un trayecto de 3 km por caminata rinde más de lo que sugiere la distancia.' },
    { titulo: 'Revisá el medidor de agua', texto: 'Cerrá todas las llaves y quedate viendo el medidor diez minutos. Si avanza, hay una fuga: arreglarla puede ahorrar varios metros cúbicos al mes.' },
    { titulo: 'El compost cierra el ciclo', texto: 'Los residuos orgánicos en relleno sanitario generan metano. Compostarlos en casa evita esa emisión y produce abono.' }
  ];

  /* ------------------------------------------------------------------ */
  /* Comunidad (UC8) — comparativa anónima                               */
  /* Los alias usan especies y ecosistemas del país; nunca nombres reales.*/
  /* ------------------------------------------------------------------ */
  /* El reparto por provincia no es casual. La comparativa exige un mínimo de
     participantes para significar algo (ver MINIMO_PARTICIPANTES en la
     pantalla UC8), así que los datos de demostración incluyen provincias que
     superan ese mínimo —San José, Alajuela y Cartago— y provincias que no,
     para que ambos comportamientos se puedan ver de verdad al filtrar. */
  const comunidad = [
    { alias: 'Quetzal-089',  co2: 168.4, acciones: 141, zona: 'San José' },
    { alias: 'Manglar-450',  co2: 141.2, acciones: 122, zona: 'Puntarenas' },
    { alias: 'Ceiba-077',    co2: 118.6, acciones: 107, zona: 'Alajuela' },
    { alias: 'Yigüirro-418', co2: 0,     acciones: 0,   zona: 'San José', esYo: true },
    { alias: 'Jaguar-274',   co2: 105.3, acciones: 96,  zona: 'Alajuela' },
    { alias: 'Danta-902',    co2: 96.4,  acciones: 92,  zona: 'Heredia' },
    { alias: 'Irazú-330',    co2: 92.7,  acciones: 88,  zona: 'Cartago' },
    { alias: 'Colibrí-312',  co2: 88.1,  acciones: 84,  zona: 'San José' },
    { alias: 'Guaria-118',   co2: 79.5,  acciones: 71,  zona: 'Cartago' },
    { alias: 'Tucán-806',    co2: 74.8,  acciones: 66,  zona: 'Heredia' },
    { alias: 'Cocobolo-145', co2: 71.2,  acciones: 63,  zona: 'Guanacaste' },
    { alias: 'Poás-651',     co2: 63.9,  acciones: 58,  zona: 'Alajuela' },
    { alias: 'Perezoso-621', co2: 58.3,  acciones: 49,  zona: 'Limón' },
    { alias: 'Orosi-482',    co2: 51.6,  acciones: 44,  zona: 'Cartago' },
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
        texto: 'La semana pasada evitó 9,4 kg de CO₂ con 11 registros. Es un 18 % más que la semana anterior.' },
      { id: 'N-4', tipo: 'recordatorio', origen: 'sistema', leida: true, fecha: h(3, '19:00'),
        titulo: 'Faltan 8 días para cerrar el mes',
        texto: 'Va en 31,2 kg de 45 kg de su meta mensual. Necesita cerca de 1,7 kg diarios para alcanzarla.' },
      { id: 'N-5', tipo: 'alerta', origen: 'sistema', leida: true, fecha: h(5, '11:30'),
        titulo: 'Revisá la cantidad de un registro',
        texto: 'El registro RA-1043 dice 148 kg de papel reciclado en un solo día. Confirmá la cantidad o corregila.' },
      { id: 'N-6', tipo: 'logro', origen: 'sistema', leida: true, fecha: h(9, '16:45'),
        titulo: 'Insignia obtenida: Cien kilos',
        texto: 'Superó los 100 kg de CO₂ evitados desde que creó la cuenta.' },
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
    insigniasNuevas: [],          // se llena al desbloquear una insignia en UC4

    /* 'local' = datos simulados en el navegador (sin conexión o sin Firebase).
       'nube'  = cuentas y datos reales en Firebase Auth + Cloud Firestore.
       Las pantallas no consultan este valor: leen siempre de `state` y las
       escrituras se replican solas. Solo la pantalla de acceso lo mira, para
       explicar con qué está trabajando la persona. */
    modo: 'local',
    uid: null,
    comunidadReal: []
  };

  /* Cola de escrituras: replica en Firestore lo que ya se aplicó en memoria.
     La interfaz nunca espera a la red; si una escritura falla se avisa, pero
     la pantalla no se queda bloqueada. */
  function replicar(operacion, descripcion) {
    if (state.modo !== 'nube' || !state.uid || !window.Nube) return;
    Promise.resolve()
      .then(operacion)
      .catch(e => {
        console.error('Firestore (' + descripcion + '):', e);
        window.UI?.toast('No se pudo guardar en la nube', Nube.traducir(e), 'error', 8000);
      });
  }

  /** Perfil inicial de una cuenta recién creada. */
  function perfilNuevo({ uid, nombre, correo, provincia }) {
    const n = Math.floor(Math.random() * 900) + 100;
    return {
      id: 'USR-' + uid.slice(0, 8).toUpperCase(),
      nombre, correo,
      alias: 'Yigüirro-' + n,
      provincia: provincia || 'San José',
      canton: '',
      meta: 45,
      desde: hoyISO(),
      notificaciones: { recordatorio: true, logros: true, resumen: true, comunidad: false },
      frecuencia: 'diaria',
      hora: '19:00'
    };
  }

  /** Historial de ejemplo para sembrar una cuenta nueva que lo pida. */
  function datosDeEjemplo() {
    return { registros: generarHistorial(), notificaciones: generarNotificaciones() };
  }

  /* ------------------------------------------------------------------ */
  /* Cambios de modo                                                     */
  /* ------------------------------------------------------------------ */

  /** Vuelca en memoria lo que se descargó de Firestore. */
  function iniciarNube(uid, correo, datos, comunidad) {
    state.modo = 'nube';
    state.uid = uid;
    state.autenticado = true;
    state.usuario = datos.perfil
      ? { ...usuario, ...datos.perfil, correo: correo || datos.perfil.correo }
      : perfilNuevo({ uid, nombre: correo, correo, provincia: 'San José' });
    state.registros = datos.registros || [];
    state.notificaciones = datos.notificaciones || [];
    state.logrosGuardados = datos.logros || [];
    state.comunidadReal = comunidad || [];
  }

  /** Sesión cerrada: se limpia todo rastro del usuario anterior. */
  function cerrarNube() {
    state.modo = 'nube';
    state.uid = null;
    state.autenticado = false;
    state.registros = [];
    state.notificaciones = [];
    state.logrosGuardados = [];
    state.comunidadReal = [];
  }

  /** Repliegue a los datos simulados cuando Firebase no está disponible. */
  function usarLocal() {
    state.modo = 'local';
    state.uid = null;
    state.usuario = { ...usuario };
    state.registros = generarHistorial();
    state.notificaciones = generarNotificaciones();
    state.logrosGuardados = [];
    state.comunidadReal = [];
    restaurar();
  }

  function persistir() {
    // En modo nube manda Firestore: el almacenamiento local solo sirve para
    // que el prototipo conserve estado cuando corre sin conexión.
    if (state.modo === 'nube') return;
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
    if (state.modo === 'nube') return;
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
    const guardados = Object.fromEntries((state.logrosGuardados || []).map(l => [l.id, l]));
    return insignias.map(i => {
      const valor = m[i.campo] || 0;
      const pct = Math.min(100, Math.round(valor / i.meta * 100));
      const obtenida = valor >= i.meta;
      return {
        ...i, valor: +valor.toFixed(1), pct, obtenida,
        // La fecha viene de Firestore; en modo local la insignia no la lleva.
        desde: guardados[i.id]?.fecha || null
      };
    });
  }

  /** Deja constancia de una insignia recién obtenida (clase LogroUsuario). */
  function anotarLogro(insignia) {
    if ((state.logrosGuardados || []).some(l => l.id === insignia.id)) return;
    const l = { id: insignia.id, nombre: insignia.nombre, fecha: new Date().toISOString() };
    (state.logrosGuardados = state.logrosGuardados || []).push(l);
    replicar(() => Nube.registrarLogro(state.uid, insignia.id, insignia.nombre), 'logro');
  }

  /**
   * Tabla de la comparativa comunitaria (UC8).
   * En modo nube se usan los participantes reales de la colección `comunidad`.
   * Si todavía hay menos de cinco cuentas registradas, se completa con los
   * participantes simulados para que la pantalla siga siendo demostrable; en
   * ese caso quedan marcados con `simulado` y la pantalla lo advierte.
   */
  function tablaComunidad() {
    const miCo2 = +sumaCO2(state.registros).toFixed(1);
    const yo = {
      alias: state.usuario.alias, zona: state.usuario.provincia,
      co2: miCo2, acciones: state.registros.length, esYo: true
    };

    let lista;
    if (state.modo === 'nube') {
      const otros = state.comunidadReal
        .filter(c => c.uid !== state.uid)
        .map(c => ({ alias: c.alias, zona: c.zona, co2: +(c.co2 || 0), acciones: c.acciones || 0 }));
      const relleno = otros.length >= 4
        ? []
        : comunidad.filter(c => !c.esYo).slice(0, 9 - otros.length).map(c => ({ ...c, simulado: true }));
      lista = [yo, ...otros, ...relleno];
    } else {
      lista = comunidad.map(c => c.esYo ? yo : { ...c, simulado: true });
    }

    lista.sort((a, b) => b.co2 - a.co2);
    lista.forEach((c, i) => c.pos = i + 1);
    return lista;
  }

  /** Cuántos participantes de la tabla son simulados (aviso de la pantalla). */
  function comunidadSimulada() {
    return tablaComunidad().filter(c => c.simulado).length;
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
    replicar(() => Nube.agregarRegistro(state.uid, reg), 'registro nuevo');
    return reg;
  }

  function eliminarRegistro(id) {
    const i = state.registros.findIndex(r => r.id === id);
    if (i < 0) return;
    state.registros.splice(i, 1);
    persistir();
    replicar(() => Nube.eliminarRegistro(state.uid, id), 'borrado de registro');
  }

  function marcarLeidas(ids) {
    const tocadas = state.notificaciones
      .filter(n => !n.leida && (!ids || ids.includes(n.id)))
      .map(n => n.id);
    state.notificaciones.forEach(n => { if (!ids || ids.includes(n.id)) n.leida = true; });
    persistir();
    if (tocadas.length) replicar(() => Nube.marcarNotificaciones(state.uid, tocadas), 'notificaciones leídas');
  }

  /** Alta de notificación generada por el temporizador simulado (UC6). */
  function agregarNotificacion(n) {
    state.notificaciones.unshift(n);
    persistir();
    replicar(() => Nube.crearNotificacion(state.uid, n), 'notificación nueva');
  }

  /** Guarda el perfil editado en UC10. */
  function guardarPerfil(cambios) {
    Object.assign(state.usuario, cambios);
    persistir();
    replicar(() => Nube.guardarPerfil(state.uid, state.usuario), 'perfil');
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
    if (kg <= 0) return 'Llená el formulario y aquí aparece el cálculo.';
    const km = kg / 0.192;
    const arboles = kg / 21;      // 1 árbol maduro absorbe ~21 kg CO2 al año
    const cargas = kg / 0.0084;   // carga de un teléfono ≈ 8,4 g CO2e
    if (kg < 1) return `Equivale a no recorrer ${fmt.n(km, 1)} km en auto particular.`;
    if (kg < 25) return `Equivale a no recorrer ${fmt.n(km, 0)} km en auto particular, o a ${fmt.n(cargas, 0)} cargas de teléfono.`;
    return `Equivale al CO₂ que absorben ${fmt.n(arboles, 1)} árboles maduros en un año.`;
  }

  restaurar();

  return {
    CATEGORIAS, CAT_LIST, tipoDe, FUENTES, fuenteDe,
    state, persistir,
    insignias, articulos, consejos, glosario,
    registrosOrdenados, enUltimosDias, sumaCO2,
    serieDiaria, serieSemanal, serieMensual, porCategoria,
    racha, metricas, logros, tablaComunidad,
    agregarRegistro, eliminarRegistro, marcarLeidas, noLeidas,
    agregarNotificacion, guardarPerfil, anotarLogro, comunidadSimulada,
    perfilNuevo, datosDeEjemplo, iniciarNube, cerrarNube, usarLocal,
    fmt, equivalencia, hoyISO
  };
})();

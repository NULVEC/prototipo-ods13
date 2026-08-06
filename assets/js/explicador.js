/* ============================================================================
   explicador.js — "¿Cómo funciona esto?"

   Alguien que abre la aplicación por primera vez se encuentra con kilos de
   CO₂, factores, rachas y un bosque. Cada cosa por separado se entiende, pero
   nadie le ha dicho de qué va el conjunto.

   Esto lo resuelve con cuatro pasos, en el orden en que surgen las preguntas:
   qué mide, de dónde sale el número, para qué sirve y qué hacer ahora. Se
   abre solo la primera vez y después queda a mano en la barra superior.

   La regla al escribirlo: ninguna frase puede necesitar otra explicación.
   Si una palabra no se entiende sin haber llevado el curso, no va.
   ========================================================================= */

const Explicador = (() => {

  const VISTO = 'ods13.explicador.visto';

  const PASOS = [
    {
      icono: 'globo',
      titulo: '¿Qué mide esta app?',
      texto: `Los kilos de CO₂ que <b>no</b> se fueron al aire gracias a algo que
              hiciste. Si te vas en bus en vez de en carro, el CO₂ que habría
              soltado ese carro nunca salió. Eso es lo que la app cuenta.`,
      pie: 'Por eso todo suma en positivo: cada registro es algo que no pasó.'
    },
    {
      icono: 'accion',
      titulo: '¿De dónde sale el número?',
      texto: `De una multiplicación, nada más. Anotás <b>cuánto</b> hiciste
              (5 km en bus, 2 kg de latas) y la app lo multiplica por lo que
              ahorra cada unidad.`,
      /* El ejemplo se calcula con el factor de verdad. Escrito a mano se quedó
         viejo una vez ya —decía 0,103 cuando el factor pasó a 0,098— y le
         enseñaba al recién llegado una cuenta que no cuadraba con la pantalla
         que iba a ver a continuación. */
      pie: () => {
        const bus = DB.tipoDe('transporte', 'autobus').factor;
        return `5 km en bus × ${DB.fmt.n(bus, 3)} = ${DB.fmt.n(5 * bus, 2)} kg de CO₂ evitados.`;
      }
    },
    {
      icono: 'arboles',
      titulo: '¿Y por qué un bosque?',
      texto: `Porque "104 kg de CO₂" no le dice nada a nadie. Cada acción que
              registrás siembra un árbol en tu bosque, y los kilos se dibujan
              como el cubo de aire que ocuparían de verdad.`,
      pie: 'Es el mismo dato, contado de una forma que se puede ver.'
    },
    {
      icono: 'insignia',
      titulo: '¿Qué hago ahora?',
      texto: `Registrá algo que ya hayas hecho hoy. Con eso arranca tu racha,
              crece tu bosque y subís en la tabla de la comunidad —donde nadie
              ve tu nombre, solo un alias.`,
      pie: 'Se puede registrar de días pasados, así que no perdiste nada.'
    }
  ];

  let paso = 0;

  /* ------------------------------------------------------------------ */
  function pintar() {
    const p = PASOS[paso];
    const ultimo = paso === PASOS.length - 1;

    const scrim = UI.modal({
      etiqueta: 'Cómo funciona la aplicación',
      ancho: 520,
      cuerpo: `
        <div class="explica">
          <span class="explica-sello">${Icon.get(p.icono, 30, 1.6)}</span>
          <span class="label-micro">Paso ${paso + 1} de ${PASOS.length}</span>
          <h2>${p.titulo}</h2>
          <p class="explica-texto">${p.texto}</p>
          <p class="explica-pie">${Icon.get('info', 14)}<span>${
            typeof p.pie === 'function' ? UI.esc(p.pie()) : p.pie
          }</span></p>
          <div class="explica-puntos" aria-hidden="true">
            ${PASOS.map((_, i) => `<i class="${i === paso ? 'is-aqui' : ''}"></i>`).join('')}
          </div>
        </div>`,
      acciones: [
        { texto: paso ? 'Atrás' : 'Saltar', clase: 'btn-ghost', onClick: () => {
            if (paso) { paso--; pintar(); return false; }
            cerrar();
          } },
        { texto: ultimo ? '¡Entendido!' : 'Siguiente',
          clase: 'btn-primary', icono: ultimo ? 'check' : 'flechaDer',
          onClick: () => {
            if (ultimo) { cerrar(); return; }
            paso++; pintar(); return false;
          } }
      ]
    });
    return scrim;
  }

  function cerrar() {
    try { localStorage.setItem(VISTO, '1'); } catch (e) { /* sin almacenamiento: da igual */ }
    UI.cerrarModal();
  }

  /** Lo abre desde el principio. Lo llama el botón de la barra superior. */
  function abrir() { paso = 0; pintar(); }

  /**
   * Primera visita: se muestra solo. Se espera un momento para que la
   * pantalla ya esté dibujada detrás y no aparezca sobre un fondo vacío.
   */
  function siEsLaPrimeraVez() {
    let visto = true;
    try { visto = !!localStorage.getItem(VISTO); } catch (e) { visto = true; }
    if (visto || !DB.state.autenticado) return;
    setTimeout(abrir, 900);
  }

  return { abrir, siEsLaPrimeraVez, PASOS };
})();

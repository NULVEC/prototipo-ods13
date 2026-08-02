/* ============================================================================
   screens/inicio.js — UC3 Visualizar información ambiental.

   La pantalla combina el estado de la persona (lo primero que quiere ver al
   entrar) con el contenido educativo del caso de uso. El contenido llega con
   un estado de carga real para mostrar cómo respondería el backend.

   Es también la pantalla donde vive el bosque: cada acción registrada es un
   árbol. Es la traducción más directa que tiene el sistema entre un dato y
   algo que se entiende sin explicar.
   ========================================================================= */

Screens.inicio = {

  render() {
    const u = DB.state.usuario;
    const hora = new Date().getHours();
    const saludo = hora < 12 ? '¡Buenos días' : hora < 18 ? '¡Qué tal' : '¡Buenas noches';

    const mes = DB.state.registros.filter(r => r.fecha.slice(0, 7) === DB.hoyISO().slice(0, 7));
    const co2Mes = DB.sumaCO2(mes);
    const pctMeta = Math.min(100, Math.round(co2Mes / u.meta * 100));
    const falta = Math.max(0, u.meta - co2Mes);
    const total = DB.sumaCO2(DB.state.registros);
    const sem = DB.enUltimosDias(7);
    const semAnterior = DB.state.registros.filter(r => {
      const d = new Date(r.fecha + 'T00:00:00');
      const diff = (new Date().setHours(0, 0, 0, 0) - d) / 86400000;
      return diff >= 7 && diff < 14;
    });
    const varSem = DB.sumaCO2(semAnterior) > 0
      ? Math.round((DB.sumaCO2(sem) / DB.sumaCO2(semAnterior) - 1) * 100) : 0;

    const racha = DB.racha();
    const tabla = DB.tablaComunidad();
    const miPos = tabla.find(t => t.alias === u.alias)?.pos ?? '—';
    const ultimos = DB.registrosOrdenados().slice(0, 5);
    const consejo = DB.consejos[new Date().getDate() % DB.consejos.length];

    /* El titular del mes cambia según qué tan cerca está la meta: si ya la
       cerró no tiene sentido seguir diciéndole cuánto le falta. */
    const frase = pctMeta >= 100
      ? `Ya cerraste la meta del mes: <b>${DB.fmt.co2(co2Mes)} kg</b> de ${u.meta}. Lo que sigue es pura ganancia.`
      : pctMeta >= 75
      ? `Llevás <b>${DB.fmt.co2(co2Mes)} kg</b> de CO₂ que no se fueron al aire este mes.
         Te faltan ${DB.fmt.co2(falta)} para la meta — ya casi.`
      : `Llevás <b>${DB.fmt.co2(co2Mes)} kg</b> de CO₂ que no se fueron al aire este mes.
         Te faltan ${DB.fmt.co2(falta)} para llegar a los ${u.meta}.`;

    return `
      <section class="home-head">
        <div>
          <h1>${saludo}, ${UI.esc(u.nombre.split(' ')[0])}!</h1>
          <p>${frase}</p>
          <div class="bar is-azul" style="--p:${pctMeta}%;max-width:420px;margin-top:var(--s-4)"
               role="progressbar" aria-valuenow="${pctMeta}" aria-valuemin="0" aria-valuemax="100"
               aria-label="Avance de la meta mensual"><i></i></div>
        </div>
        <div class="streak ${racha >= 7 ? 'is-fuego' : ''}">
          <span class="label-micro">${Icon.get('llama', 13)}Racha${UI.ayuda('racha')}</span>
          <span class="n">${racha}</span>
          <small>${racha === 1 ? 'día seguido registrando' : 'días seguidos registrando'}</small>
        </div>
      </section>

      <section class="section grid grid-4">
        ${UI.readout({ etiqueta: `CO₂ que no llegó al aire${UI.ayuda('evitado')}`, icono: 'globo',
          valor: `<span data-contar="${total.toFixed(1)}" data-dec="1">0,0</span>`, unidad: 'kg',
          pie: `Desde el ${DB.fmt.fecha(u.desde)}` })}
        ${UI.readout({ etiqueta: 'Esta semana', icono: 'pulso', tono: 'is-accent',
          valor: `<span data-contar="${DB.sumaCO2(sem).toFixed(2)}" data-dec="2">0,00</span>`, unidad: 'kg',
          pie: `<span class="delta ${varSem >= 0 ? 'delta-up' : 'delta-down'}">
                  ${Icon.get(varSem >= 0 ? 'subiendo' : 'bajando', 13)}
                  ${varSem >= 0 ? '+' : ''}${varSem} %</span> ${varSem >= 0 ? 'mejor' : 'menos'} que la semana pasada` })}
        ${UI.readout({ etiqueta: 'Acciones registradas', icono: 'accion',
          valor: `<span data-contar="${DB.state.registros.length}" data-dec="0">0</span>`, unidad: '',
          pie: `${sem.length} en los últimos 7 días` })}
        ${UI.readout({ etiqueta: `Puesto en la comunidad${UI.ayuda('mejorQue')}`, icono: 'comunidad', tono: 'is-ochre',
          valor: '#' + miPos, unidad: '',
          pie: `Entre ${tabla.length} participantes anónimos` })}
      </section>

      <!-- ================= EL BOSQUE ================= -->
      <section class="section">
        <div class="panel panel-dark escena-panel">
          <div class="panel-head">
            ${Icon.get('arboles', 18)}
            <h3>Tu bosque</h3>
            <span class="tag tag-3d">${Icon.get('diagonal', 12)}3D</span>
          </div>
          <div class="escena-grid is-bosque">
            <div class="escena-lienzo is-alto" id="escena-bosque">
              <p class="escena-cargando">Sembrando…</p>
            </div>
            <div class="escena-datos" id="bosque-datos"></div>
          </div>
          <div class="panel-foot escena-pie">
            Cada acción que registrás siembra un árbol. Arrastrá para girar el bosque.
          </div>
        </div>
      </section>

      <!-- ================= EL CUBO DE CO₂ ================= -->
      <section class="section">
        <div class="panel panel-dark escena-panel">
          <div class="panel-head">
            ${Icon.get('globo', 18)}
            <h3>El tamaño de lo que no emitiste</h3>
            <span class="tag tag-3d">${Icon.get('diagonal', 12)}3D</span>
          </div>
          <div class="escena-grid">
            <div class="escena-lienzo" id="escena-carbono">
              <p class="escena-cargando">Preparando la escena…</p>
            </div>
            <div class="escena-datos" id="escena-datos"></div>
          </div>
          <div class="panel-foot escena-pie">
            Arrastrá para girar. El suelo está cuadriculado en metros y la figura mide 1,70 m.
          </div>
        </div>
      </section>

      <section class="section grid grid-main-aside">

        <div class="panel">
          <div class="panel-head">
            ${Icon.get('bombilla', 18)}
            <h3>Lo que está pasando con el clima</h3>
            <span class="tag">ODS 13${UI.ayuda('ods13')}</span>
          </div>
          <div class="panel-body" id="articulos">
            ${UI.esqueleto(3)}
            <div class="skeleton sk-line" style="height:60px;margin-top:20px"></div>
          </div>
          <div class="panel-foot">
            Los datos citados son de referencia académica para el prototipo.
          </div>
        </div>

        <div class="stack">
          <div class="panel">
            <div class="panel-head">${Icon.get('brote', 18)}<h3>El tip de hoy</h3></div>
            <div class="panel-body">
              <div class="tip">
                <h3>${UI.esc(consejo.titulo)}</h3>
                <p>${UI.esc(consejo.texto)}</p>
              </div>
              <a class="btn btn-accent btn-sm" href="#/nueva-accion" style="margin-top:var(--s-5)">
                ${Icon.get('accion', 16)}<span>Registrar esta acción</span>
              </a>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              ${Icon.get('reloj', 18)}<h3>Lo último que hiciste</h3>
              <a class="btn btn-ghost btn-sm" href="#/progreso">Ver todo ${Icon.get('chevronDer', 14)}</a>
            </div>
            ${ultimos.length ? `<ul class="feed">${ultimos.map(r => {
              const cat = DB.CATEGORIAS[r.categoria];
              const tipo = DB.tipoDe(r.categoria, r.tipo);
              return `<li>
                <span class="feed-icon">${Icon.get(cat.icono, 17)}</span>
                <div class="feed-body">
                  <b>${UI.esc(tipo.nombre)}</b>
                  <p>${DB.fmt.n(r.cantidad, 1)} ${cat.unidad} · ${DB.fmt.fechaCorta(r.fecha)}</p>
                </div>
                <div class="feed-meta">+${DB.fmt.co2(r.co2)}<br><span class="label-micro">kg CO₂</span></div>
              </li>`;
            }).join('')}</ul>` : `
              <div class="empty">${Icon.get('bandeja', 34, 1.5)}
                <h3>Todavía no hay nada</h3>
                <p>Apenas registrés tu primera acción va a aparecer aquí.</p>
                <a class="btn btn-primary" href="#/nueva-accion">Registrar acción</a>
              </div>`}
          </div>
        </div>
      </section>`;
  },

  mount() {
    this.montarBosque();
    this.montarEscena();

    /* Carga diferida del contenido educativo: es la parte que en la
       arquitectura real vendría del backend (InformacionAmbiental). */
    setTimeout(() => {
      const cont = document.getElementById('articulos');
      if (!cont) return;
      cont.innerHTML = DB.articulos.map(a => `
        <article class="article">
          <div class="art-fig">
            ${a.cifra}${a.unidadCifra ? `<span style="font-size:.6em">${a.unidadCifra}</span>` : ''}
            <small>${UI.esc(a.etiqueta)}</small>
          </div>
          <div>
            <h3>${UI.esc(a.titulo)}</h3>
            <p>${UI.esc(a.texto)}</p>
            <p class="src">Fuente: ${UI.esc(a.fuente)}</p>
          </div>
        </article>`).join('');
    }, 620);
  },

  /* --------------------------------------------------------------------
     Un árbol por acción registrada.
     ------------------------------------------------------------------ */
  montarBosque() {
    const lienzo = document.getElementById('escena-bosque');
    const datos = document.getElementById('bosque-datos');
    if (!lienzo || !datos) return;

    const registros = DB.state.registros;
    const bosque = window.Bosque3D ? Bosque3D.montar('escena-bosque', registros) : null;

    if (!bosque) {
      lienzo.innerHTML = `
        <div class="escena-sin3d">
          ${Icon.get('arboles', 30, 1.5)}
          <p>Tu navegador no da para el 3D, pero el dato es el mismo:
             llevás <b>${registros.length} acciones</b> registradas.
             Si cada una fuera un árbol, ya tendrías un bosque de
             <b>${registros.length}</b>.</p>
        </div>`;
      datos.innerHTML = '';
      return;
    }

    datos.innerHTML = `
      <p class="label-micro">Árboles sembrados</p>
      <p class="escena-cifra">${bosque.total}<span class="u">árboles</span></p>
      <p class="escena-lado">Uno por cada acción que registraste</p>

      <ul class="escena-equiv">
        ${bosque.porCategoria.map(c => {
          const cat = DB.CATEGORIAS[c.id];
          if (!cat) return '';
          return `<li>
            <span class="punto" style="--c:#${(Bosque3D.COLOR_CATEGORIA[c.id] ?? 0x3f8a63).toString(16).padStart(6, '0')}"></span>
            <span>${UI.esc(cat.nombre)}</span>
            <b class="mono">${c.n}</b>
          </li>`;
        }).join('')}
      </ul>

      <p class="escena-nota">
        ${bosque.recortado
          ? `Se dibujan los ${bosque.dibujados} más recientes para que la escena
             siga siendo fluida; el total sigue contando ${bosque.total}.`
          : 'El color de cada copa dice de qué categoría vino esa acción.'}
      </p>`;
  },

  /* --------------------------------------------------------------------
     El volumen del carbono en tres dimensiones.
     Si WebGL no está disponible, o el módulo no cargó, el mismo dato se
     presenta en texto: la pantalla nunca queda con un hueco.
     ------------------------------------------------------------------ */
  montarEscena() {
    const kg = DB.sumaCO2(DB.state.registros);
    const datos = document.getElementById('escena-datos');
    const lienzo = document.getElementById('escena-carbono');
    if (!datos || !lienzo) return;

    const escena = window.Escena3D ? Escena3D.montar('escena-carbono', kg) : null;

    if (!escena) {
      const m3 = kg * 0.5562;
      lienzo.innerHTML = `
        <div class="escena-sin3d">
          ${Icon.get('globo', 30, 1.5)}
          <p>Tu navegador no da para dibujar la escena en 3D, pero igual mirá el dato:
             esos ${DB.fmt.n(kg, 1)} kg de CO₂ ocuparían
             <b>${DB.fmt.n(m3, 1)} m³</b>, un cubo de
             <b>${DB.fmt.n(Math.cbrt(m3), 2)} m</b> de lado.</p>
        </div>`;
      datos.innerHTML = '';
      return;
    }

    datos.innerHTML = `
      <p class="label-micro">CO₂ que no llegó al aire${UI.ayuda('co2')}</p>
      <p class="escena-cifra">${DB.fmt.n(escena.volumen, 1)}<span class="u">m³</span></p>
      <p class="escena-lado">Un cubo de <b>${DB.fmt.n(escena.lado, 2)} m</b> de lado</p>

      <ul class="escena-equiv">
        ${escena.equivalencias.map(e => `
          <li>${Icon.get(e.icono, 15)}<span>${e.texto}</span></li>`).join('')}
      </ul>

      <p class="escena-nota">
        A 25 °C y una atmósfera, un kilo de CO₂ ocupa 0,556 m³.
        Tus ${DB.fmt.n(kg, 1)} kg evitados son ese volumen de gas.
      </p>`;
  }
};

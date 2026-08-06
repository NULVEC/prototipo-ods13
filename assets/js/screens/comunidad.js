/* ============================================================================
   screens/comunidad.js — UC8 Ver comparativa comunitaria.

   El caso de uso exige que la comparación sea anónima. Por eso la tabla usa
   alias generados por el sistema (especie o ecosistema + número) y en ningún
   punto se muestran nombres, correos ni ubicaciones exactas.

   El podio va en 3D: la altura de cada columna es el CO₂ evitado, así que el
   ranking se entiende antes de leerlo. La tabla completa sigue debajo, porque
   una escena es buena para captar la idea y mala para consultar un dato.
   ========================================================================= */

/* Participantes mínimos para que la comparativa signifique algo. Tres es el
   primer número con el que existe un "en medio": con dos, cada quien es solo
   el mejor o el peor, y además sabe quién es el otro. */
const MINIMO_PARTICIPANTES = 3;

Screens.comunidad = {

  zona: 'todas',

  render() {
    const alias = DB.state.usuario.alias;
    const completa = DB.tablaComunidad();
    const yo = completa.find(c => c.alias === alias);
    /* Con la comparativa desactivada en el perfil, `completa` puede quedar
       vacía: hay que salir antes de dividir por su tamaño. */
    const promedio = completa.length
      ? completa.reduce((a, c) => a + c.co2, 0) / completa.length : 0;
    const lider = completa[0];
    const dif = yo ? yo.co2 - promedio : 0;
    const porEncima = completa.filter(c => c.co2 < (yo?.co2 ?? 0)).length;
    /* El denominador es "los demás", no "todos": uno no se compara consigo
       mismo. Con un solo participante daría 0/0 = NaN y la pantalla mostraría
       «Le ganás al NaN %», así que se acota. */
    const otros = Math.max(1, completa.length - 1);
    const percentil = yo ? Math.round(porEncima / otros * 100) : 0;

    /* Si la persona se salió de la comparativa (UC10 → Privacidad), esta
       pantalla no tiene nada que decirle: se explica y se ofrece el camino de
       vuelta, en lugar de dibujar un ranking donde no está. */
    if (!DB.enComunidad()) {
      return `
        <div class="panel">
          <div class="empty">
            ${Icon.get('escudo', 34, 1.5)}
            <h3>Estás fuera de la comparativa</h3>
            <p>Pediste no participar, así que no aparecés en la tabla ni en el podio y tu
               fila se retiró. Tu progreso propio sigue intacto en Mi progreso.</p>
            <button class="btn btn-primary" type="button" data-ir="/perfil">
              ${Icon.get('perfil', 16)}<span>Cambiarlo en mi perfil</span>
            </button>
          </div>
        </div>`;
    }

    /* Mensaje según dónde quedó: felicitar a quien va primero y no regañar a
       quien va último es la diferencia entre motivar y desanimar. */
    const veredicto = !yo ? ''
      : yo.pos === 1 ? '¡Vas de primero en toda la comunidad!'
      : yo.pos <= 3 ? `Estás en el podio, puesto ${yo.pos}. Falta poquito para el primero.`
      : dif >= 0 ? `Vas arriba del promedio por ${DB.fmt.n(dif, 1)} kg. Nada mal.`
      : `Te faltan ${DB.fmt.n(-dif, 1)} kg para llegar al promedio. Se alcanza.`;

    return `
      <section class="section grid grid-4">
        ${UI.readout({ etiqueta: 'Tu puesto', icono: 'comunidad', tono: 'is-accent',
          valor: '#' + (yo?.pos ?? '—'), unidad: `/ ${completa.length}`,
          pie: `Le ganás al ${percentil} % de la gente${UI.ayuda('mejorQue')}` })}
        ${UI.readout({ etiqueta: 'Tu CO₂ evitado', icono: 'globo',
          valor: `<span data-contar="${(yo?.co2 ?? 0).toFixed(1)}" data-dec="1">0,0</span>`, unidad: 'kg',
          pie: `${yo?.acciones ?? 0} acciones registradas` })}
        ${UI.readout({ etiqueta: 'Promedio de todos', icono: 'pulso',
          valor: DB.fmt.n(promedio, 1), unidad: 'kg',
          pie: `<span class="delta ${dif >= 0 ? 'delta-up' : 'delta-down'}">
                  ${Icon.get(dif >= 0 ? 'subiendo' : 'bajando', 13)}
                  ${dif >= 0 ? '+' : ''}${DB.fmt.n(dif, 1)} kg</span> de diferencia` })}
        ${UI.readout({ etiqueta: 'Quien va ganando', icono: 'insignia', tono: 'is-ochre',
          valor: DB.fmt.n(lider.co2, 1), unidad: 'kg',
          pie: `Alias ${UI.esc(lider.alias)}` })}
      </section>

      <!-- ================= EL PODIO ================= -->
      <section class="section">
        <div class="panel panel-dark escena-panel">
          <div class="panel-head">
            ${Icon.get('insignia', 18)}
            <h3>El podio</h3>
            <span class="tag tag-3d">${Icon.get('diagonal', 12)}3D</span>
            ${veredicto ? `<span class="presenta-veredicto">${UI.esc(veredicto)}</span>` : ''}
          </div>
          <div class="escena-lienzo is-podio" id="escena-podio">
            <p class="escena-cargando">Armando el podio…</p>
          </div>
          <div class="panel-foot escena-pie">
            La altura de cada columna es el CO₂ evitado. La azul con el aro sos vos.
            Arrastrá para girar.
          </div>
        </div>
      </section>

      <section class="section grid grid-main-aside">
        <div class="panel">
          <div class="panel-head">
            ${Icon.get('progreso', 18)}<h3>Vos contra el promedio, semana a semana</h3>
          </div>
          <div class="panel-body">
            <div class="chart-box is-tall"><canvas id="g-comparativa"
              aria-label="Comparación del acumulado propio con el promedio de la comunidad" role="img"></canvas></div>
            <div class="legend">
              <span><i style="background:${Charts.PALETA.azul}"></i>Vos</span>
              <span><i style="background:${Charts.PALETA.tinta3}"></i>Promedio de la comunidad</span>
            </div>
          </div>
        </div>

        <div class="stack">
          <div class="rank-me">
            <span class="pos">#${yo?.pos ?? '—'}</span>
            <div class="txt">
              <b>${UI.esc(alias)}${UI.ayuda('anonimo')}</b>
              <p>Así te ven los demás. Nadie ve tu nombre ni tu correo.</p>
            </div>
          </div>

          <div class="notice notice-ok">
            ${Icon.get('escudo', 17)}
            <div>
              <b>Todo es anónimo.</b> Solo se comparten el alias, la provincia y el total de
              CO₂ evitado. Podés salirte de la comparación desde tu perfil.
            </div>
          </div>
        </div>
      </section>

      <div id="zona-tabla">${this.tablaCompleta()}</div>`;
  },

  /* --------------------------------------------------------------------
     La tabla completa, aparte del resto de la pantalla.

     Está separada porque es lo único que cambia al filtrar por provincia.
     Antes el filtro llamaba a `Router.resolver()` y con eso se rehacía toda
     la pantalla: se liberaba el contexto WebGL del podio para volver a
     crearlo, con su animación desde cero, y se reconstruía el gráfico de
     Chart.js. Todo para cambiar unas filas.
     ------------------------------------------------------------------ */
  tablaCompleta() {
    const alias = DB.state.usuario.alias;
    const completa = DB.tablaComunidad();
    const zonas = ['todas', ...new Set(completa.map(c => c.zona))];
    const tabla = this.zona === 'todas'
      ? completa
      : completa.filter(c => c.zona === this.zona || c.alias === alias);
    const promedio = completa.length
      ? completa.reduce((a, c) => a + c.co2, 0) / completa.length : 0;
    const simulados = tabla.filter(c => c.simulado).length;

    return `
      <section class="section">
        <div class="section-head">
          <h2>La tabla completa</h2>
          <div class="section-aside">
            <label class="label-micro" for="c-zona">Filtrar por provincia</label>
            <select class="select" id="c-zona" style="width:auto;min-width:170px">
              ${zonas.map(z => `<option value="${z}" ${this.zona === z ? 'selected' : ''}>
                ${z === 'todas' ? 'Todas las provincias' : z}</option>`).join('')}
            </select>
          </div>
        </div>

        ${/* ----------------------------------------------------------------
             Validación de RF-08 (UC8 Ver comparativa comunitaria).

             Una comparativa necesita contra quién compararse. Con una o dos
             personas el ranking existe, pero no dice nada: quedar "de
             segundo entre dos" no informa del propio desempeño, y encima
             deja de ser anónimo, porque con dos participantes cada quien
             sabe exactamente quién es el otro.

             Por eso se exige un mínimo de participantes antes de dibujar la
             tabla. Es la misma razón por la que la pantalla completa la
             comunidad con participantes simulados mientras crece.
             --------------------------------------------------------------- */''}
        ${tabla.length < MINIMO_PARTICIPANTES ? `
          <div class="panel">
            <div class="empty">
              ${Icon.get('comunidad', 34, 1.5)}
              <h3>Faltan participantes para comparar</h3>
              <p>En ${UI.esc(this.zona)} hay ${tabla.length}
                 ${tabla.length === 1 ? 'participante' : 'participantes'}, y con menos de
                 ${MINIMO_PARTICIPANTES} la comparación no dice nada útil —además de que
                 dejaría de ser anónima.</p>
              <button class="btn btn-primary" type="button" data-ver-todas>
                ${Icon.get('comunidad', 16)}<span>Ver todas las provincias</span>
              </button>
            </div>
          </div>` : `
        <div class="table-wrap es-ficha">
          <table class="data">
            <caption class="sr-only">Comparativa comunitaria anónima</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Alias</th>
                <th scope="col">Provincia</th>
                <th scope="col" class="align-r">Acciones</th>
                <th scope="col" class="align-r">CO₂ evitado</th>
                <th scope="col" class="align-r">vs. promedio</th>
              </tr>
            </thead>
            <tbody>
              ${tabla.map(c => {
                const d = c.co2 - promedio;
                return `<tr class="${c.alias === alias ? 'is-me' : ''}">
                  <td class="mono" data-col="Puesto">${c.pos}</td>
                  <td data-col="Alias"><span style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span class="avatar avatar-sm">${c.alias.slice(0, 2).toUpperCase()}</span>
                    <b>${UI.esc(c.alias)}</b>
                    ${c.alias === alias ? '<span class="tag tag-azul">vos</span>' : ''}
                    ${c.simulado ? '<span class="tag">simulado</span>' : ''}
                  </span></td>
                  <td data-col="Provincia">${UI.esc(c.zona)}</td>
                  <td class="align-r mono" data-col="Acciones">${c.acciones}</td>
                  <td class="align-r mono" data-col="CO₂ evitado"><b>${DB.fmt.n(c.co2, 1)}</b> kg</td>
                  <td class="align-r mono" data-col="vs. promedio">
                    <span class="delta ${d >= 0 ? 'delta-up' : 'delta-down'}">
                      ${d >= 0 ? '+' : ''}${DB.fmt.n(d, 1)}
                    </span>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}

        ${simulados ? `
          <p class="text-sm muted" style="margin-top:var(--s-4);display:flex;gap:8px;align-items:flex-start">
            ${Icon.get('info', 15)}
            <span>${simulados} de los ${tabla.length} participantes son simulados. Están ahí
            para que la comparación se lea mientras la comunidad crece; se van yendo conforme
            se registran cuentas reales.</span>
          </p>` : ''}
      </section>`;
  },

  mount() {
    if (!DB.enComunidad()) return;

    const alias = DB.state.usuario.alias;
    const completa = DB.tablaComunidad();

    this.montarPodio(completa, alias);
    Charts.contraComunidad('g-comparativa', DB.serieSemanal(12));

    /* El filtro de provincia solo cambia la tabla, así que solo se redibuja la
       tabla. Antes llamaba a `Router.resolver()`, que rehacía la pantalla
       entera: eso liberaba el contexto WebGL del podio y lo volvía a crear —
       con su animación de crecimiento desde cero— y reconstruía el gráfico de
       Chart.js, todo para cambiar seis filas de un `<tbody>`. */
    document.getElementById('c-zona')?.addEventListener('change', e => {
      this.zona = e.target.value;
      this.repintarTabla();
    });

    this.conectarSalida();
  },

  /** Vuelve a dibujar solo la sección de la tabla completa. */
  repintarTabla() {
    const caja = document.getElementById('zona-tabla');
    if (!caja) return;
    caja.innerHTML = this.tablaCompleta();
    this.conectarSalida();
    // El desplegable se rehace con la tabla: hay que volver a enlazarlo.
    document.getElementById('c-zona')?.addEventListener('change', e => {
      this.zona = e.target.value;
      this.repintarTabla();
    });
  },

  conectarSalida() {
    // Salida del estado sin comparación: vuelve a todas las provincias.
    UI.$$('[data-ver-todas]').forEach(b => b.addEventListener('click', () => {
      this.zona = 'todas';
      this.repintarTabla();
    }));
  },

  /* --------------------------------------------------------------------
     El podio en 3D. Sin WebGL se cae al podio plano de siempre, que sigue
     diciendo lo mismo con menos espectáculo.
     ------------------------------------------------------------------ */
  montarPodio(completa, alias) {
    const lienzo = document.getElementById('escena-podio');
    if (!lienzo) return;

    const podio = window.Podio3D ? Podio3D.montar('escena-podio', completa, alias) : null;
    if (podio) return;

    const tres = [completa[1], completa[0], completa[2]].filter(Boolean);
    lienzo.innerHTML = `
      <div class="podium">
        ${tres.map(c => `
          <div class="step ${c.alias === alias ? 'is-me' : ''}">
            <div class="stand"><span class="pos">${c.pos}</span></div>
            <div class="who">
              <b>${UI.esc(c.alias)}</b>
              <span>${DB.fmt.n(c.co2, 1)} kg</span>
            </div>
          </div>`).join('')}
      </div>`;
  }
};

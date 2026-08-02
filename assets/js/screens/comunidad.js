/* ============================================================================
   screens/comunidad.js — UC8 Ver comparativa comunitaria.

   El caso de uso exige que la comparación sea anónima. Por eso la tabla usa
   alias generados por el sistema (especie o ecosistema + número) y en ningún
   punto se muestran nombres, correos ni ubicaciones exactas.

   El podio va en 3D: la altura de cada columna es el CO₂ evitado, así que el
   ranking se entiende antes de leerlo. La tabla completa sigue debajo, porque
   una escena es buena para captar la idea y mala para consultar un dato.
   ========================================================================= */

Screens.comunidad = {

  zona: 'todas',

  render() {
    const alias = DB.state.usuario.alias;
    const completa = DB.tablaComunidad();
    const zonas = ['todas', ...new Set(completa.map(c => c.zona))];
    const tabla = this.zona === 'todas'
      ? completa
      : completa.filter(c => c.zona === this.zona || c.alias === alias);

    const simulados = tabla.filter(c => c.simulado).length;
    const yo = completa.find(c => c.alias === alias);
    const promedio = completa.reduce((a, c) => a + c.co2, 0) / completa.length;
    const lider = completa[0];
    const dif = yo ? yo.co2 - promedio : 0;
    const porEncima = completa.filter(c => c.co2 < (yo?.co2 ?? 0)).length;
    const percentil = Math.round(porEncima / (completa.length - 1) * 100);

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

        <div class="grid grid-aside-main">
          <div class="panel">
            <div class="panel-head">${Icon.get('progreso', 18)}<h3>CO₂ evitado por participante</h3></div>
            <div class="panel-body">
              <div class="chart-box is-tall"><canvas id="g-ranking"
                aria-label="Ranking anónimo de CO2 evitado por participante" role="img"></canvas></div>
            </div>
          </div>

          <div class="table-wrap">
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
                    <td class="mono">${c.pos}</td>
                    <td><span style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap">
                      <span class="avatar avatar-sm">${c.alias.slice(0, 2).toUpperCase()}</span>
                      <b>${UI.esc(c.alias)}</b>
                      ${c.alias === alias ? '<span class="tag tag-azul">vos</span>' : ''}
                      ${c.simulado ? '<span class="tag">simulado</span>' : ''}
                    </span></td>
                    <td>${UI.esc(c.zona)}</td>
                    <td class="align-r mono">${c.acciones}</td>
                    <td class="align-r mono"><b>${DB.fmt.n(c.co2, 1)}</b> kg</td>
                    <td class="align-r mono">
                      <span class="delta ${d >= 0 ? 'delta-up' : 'delta-down'}">
                        ${d >= 0 ? '+' : ''}${DB.fmt.n(d, 1)}
                      </span>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

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
    const alias = DB.state.usuario.alias;
    const completa = DB.tablaComunidad();
    const tabla = this.zona === 'todas'
      ? completa
      : completa.filter(c => c.zona === this.zona || c.alias === alias);

    this.montarPodio(completa, alias);

    Charts.contraComunidad('g-comparativa', DB.serieSemanal(12));
    Charts.ranking('g-ranking', tabla, alias);

    document.getElementById('c-zona').addEventListener('change', e => {
      this.zona = e.target.value;
      Router.resolver();
    });
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

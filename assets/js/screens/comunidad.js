/* ============================================================================
   screens/comunidad.js — UC8 Ver comparativa comunitaria.

   El caso de uso exige que la comparación sea anónima. Por eso la tabla usa
   alias generados por el sistema (especie o ecosistema + número) y en ningún
   punto se muestran nombres, correos ni ubicaciones exactas.
   ========================================================================= */

Screens.comunidad = {

  zona: 'todas',

  render() {
    const alias = DB.state.usuario.alias;
    const completa = DB.tablaComunidad();
    const zonas = ['todas', ...new Set(completa.map(c => c.zona))];
    const tabla = this.zona === 'todas' ? completa : completa.filter(c => c.zona === this.zona || c.alias === alias);

    const simulados = tabla.filter(c => c.simulado).length;
    const yo = completa.find(c => c.alias === alias);
    const promedio = completa.reduce((a, c) => a + c.co2, 0) / completa.length;
    const lider = completa[0];
    const dif = yo ? yo.co2 - promedio : 0;
    const porEncima = completa.filter(c => c.co2 < (yo?.co2 ?? 0)).length;
    const percentil = Math.round(porEncima / (completa.length - 1) * 100);

    return `
      <section class="section grid grid-4">
        ${UI.readout({ etiqueta: 'Su posición', icono: 'comunidad', tono: 'is-accent',
          valor: '#' + (yo?.pos ?? '—'), unidad: `/ ${completa.length}`,
          pie: `Mejor que el ${percentil} % de los participantes` })}
        ${UI.readout({ etiqueta: 'Su CO₂e evitado', icono: 'globo',
          valor: DB.fmt.n(yo?.co2 ?? 0, 1), unidad: 'kg',
          pie: `${yo?.acciones ?? 0} acciones registradas` })}
        ${UI.readout({ etiqueta: 'Promedio comunitario', icono: 'pulso',
          valor: DB.fmt.n(promedio, 1), unidad: 'kg',
          pie: `<span class="delta ${dif >= 0 ? 'delta-up' : 'delta-down'}">
                  ${Icon.get(dif >= 0 ? 'subiendo' : 'bajando', 13)}
                  ${dif >= 0 ? '+' : ''}${DB.fmt.n(dif, 1)} kg</span> de diferencia` })}
        ${UI.readout({ etiqueta: 'Primer lugar', icono: 'insignia', tono: 'is-ochre',
          valor: DB.fmt.n(lider.co2, 1), unidad: 'kg',
          pie: `Alias ${UI.esc(lider.alias)}` })}
      </section>

      <section class="section grid grid-main-aside">
        <div class="panel">
          <div class="panel-head">
            ${Icon.get('progreso', 18)}<h3>Acumulado propio frente al promedio</h3>
          </div>
          <div class="panel-body">
            <div class="chart-box is-tall"><canvas id="g-comparativa"
              aria-label="Comparación del acumulado propio con el promedio de la comunidad" role="img"></canvas></div>
            <div class="legend">
              <span><i style="background:${Charts.PALETA.azul}"></i>Usted</span>
              <span><i style="background:${Charts.PALETA.tinta3}"></i>Promedio de la comunidad</span>
            </div>
          </div>
        </div>

        <div class="stack">
          <div class="panel">
            <div class="panel-head">${Icon.get('insignia', 18)}<h3>Primeros lugares</h3></div>
            <div class="panel-body">
              <div class="podium">
                ${[completa[1], completa[0], completa[2]].map(c => `
                  <div class="step">
                    <div class="stand"><span class="pos">${c.pos}</span></div>
                    <div class="who">
                      <b>${UI.esc(c.alias)}</b>
                      <span>${DB.fmt.n(c.co2, 1)} kg</span>
                    </div>
                  </div>`).join('')}
              </div>
            </div>
          </div>

          <div class="rank-me">
            <span class="pos">#${yo?.pos ?? '—'}</span>
            <div class="txt">
              <b>${UI.esc(alias)}</b>
              <p>Su alias en la comunidad. Nadie ve su nombre ni su correo.</p>
            </div>
          </div>

          <div class="notice notice-ok">
            ${Icon.get('escudo', 17)}
            <div>
              <b>Comparación anónima.</b> Solo se comparten el alias, la provincia y el total de
              CO₂e evitado. Puede desactivar su participación desde el perfil.
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Tabla de la comunidad</h2>
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
            <div class="panel-head">${Icon.get('progreso', 18)}<h3>CO₂e evitado por participante</h3></div>
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
                  <th scope="col" class="align-r">CO₂e evitado</th>
                  <th scope="col" class="align-r">Frente al promedio</th>
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
                      ${c.alias === alias ? '<span class="tag tag-azul">usted</span>' : ''}
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
            <span>${simulados} de los ${tabla.length} participantes son simulados. Se incluyen
            para que la comparativa sea legible mientras la comunidad crece; desaparecen a medida
            que se registran cuentas reales.</span>
          </p>` : ''}
      </section>`;
  },

  mount() {
    const alias = DB.state.usuario.alias;
    const completa = DB.tablaComunidad();
    const tabla = this.zona === 'todas' ? completa : completa.filter(c => c.zona === this.zona || c.alias === alias);

    Charts.contraComunidad('g-comparativa', DB.serieSemanal(12));
    Charts.ranking('g-ranking', tabla, alias);

    document.getElementById('c-zona').addEventListener('change', e => {
      this.zona = e.target.value;
      Router.resolver();
    });
  }
};

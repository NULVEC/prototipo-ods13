/* ============================================================================
   screens/insignias.js — UC7 Recibir insignia o logro.

   Cada insignia declara su criterio y su avance real: el usuario debe poder
   saber exactamente qué le falta. Un catálogo de medallas sin criterio
   visible no informa, solo decora.
   ========================================================================= */

Screens.insignias = {

  filtro: 'todas',

  render() {
    const logros = DB.logros();
    const obtenidas = logros.filter(l => l.obtenida);
    const pendientes = logros.filter(l => !l.obtenida).sort((a, b) => b.pct - a.pct);
    const proxima = pendientes[0];

    const visibles = this.filtro === 'obtenidas' ? obtenidas
                   : this.filtro === 'pendientes' ? pendientes
                   : [...obtenidas, ...pendientes];

    const unidad = campo => ({ co2: 'kg CO₂e', km: 'km', racha: 'días',
                               registros: 'registros', reciclajes: 'registros',
                               semanas: 'semanas' }[campo] || '');

    return `
      <section class="section grid grid-3">
        ${UI.readout({ etiqueta: 'Insignias obtenidas', icono: 'insignia', tono: 'is-ochre',
          valor: obtenidas.length, unidad: `/ ${logros.length}`,
          pie: `${Math.round(obtenidas.length / logros.length * 100)} % del catálogo` })}
        ${UI.readout({ etiqueta: 'Próxima insignia', icono: 'meta', tono: 'is-accent',
          valor: proxima ? proxima.pct + ' %' : '100 %',
          pie: proxima ? UI.esc(proxima.nombre) : 'Catálogo completo' })}
        ${UI.readout({ etiqueta: 'Racha actual', icono: 'llama',
          valor: DB.racha(), unidad: 'días',
          pie: 'Días seguidos con al menos un registro' })}
      </section>

      ${proxima ? `
      <section class="section">
        <div class="panel panel-dark">
          <div class="panel-body" style="display:flex;gap:var(--s-6);align-items:center;flex-wrap:wrap">
            <span class="seal is-${proxima.tono}" style="flex:none">${Icon.get(proxima.icono, 30, 1.8)}</span>
            <div style="flex:1;min-width:240px">
              <span class="label-micro" style="color:rgba(194,211,203,.6)">Le falta poco</span>
              <h2 style="margin:var(--s-2) 0 var(--s-2)">${UI.esc(proxima.nombre)}</h2>
              <p class="text-sm" style="color:var(--pine-on-dark);margin-bottom:var(--s-4)">${UI.esc(proxima.criterio)}</p>
              <div class="bar is-azul" style="--p:${proxima.pct}%" role="progressbar"
                   aria-valuenow="${proxima.pct}" aria-valuemin="0" aria-valuemax="100"><i></i></div>
              <p class="mono text-sm" style="color:var(--pine-on-dark);margin:var(--s-2) 0 0">
                ${DB.fmt.n(proxima.valor, 1)} de ${DB.fmt.n(proxima.meta, 0)} ${unidad(proxima.campo)}
              </p>
            </div>
            <a class="btn btn-accent" href="#/nueva-accion">
              ${Icon.get('accion', 16)}<span>Registrar acción</span>
            </a>
          </div>
        </div>
      </section>` : ''}

      <section class="section">
        <div class="section-head">
          <h2>Catálogo de insignias</h2>
          <div class="section-aside" id="filtros-ins">
            <button class="chip" type="button" data-f="todas" aria-pressed="${this.filtro === 'todas'}">Todas</button>
            <button class="chip" type="button" data-f="obtenidas" aria-pressed="${this.filtro === 'obtenidas'}">Obtenidas (${obtenidas.length})</button>
            <button class="chip" type="button" data-f="pendientes" aria-pressed="${this.filtro === 'pendientes'}">Pendientes (${pendientes.length})</button>
          </div>
        </div>

        <div class="badge-grid">
          ${visibles.map(l => `
            <article class="badge-card ${l.obtenida ? '' : 'is-locked'}">
              <span class="seal ${l.obtenida ? 'is-' + l.tono : ''}">${Icon.get(l.icono, 28, 1.8)}</span>
              <h3>${UI.esc(l.nombre)}</h3>
              <p>${UI.esc(l.criterio)}</p>
              ${l.obtenida
                ? `<span class="tag tag-ochre earned">${Icon.get('check', 12)} Obtenida</span>`
                : `<div style="margin-top:var(--s-4)">
                     <div class="bar" style="--p:${l.pct}%"><i></i></div>
                     <p class="mono text-sm muted" style="margin:6px 0 0">
                       ${DB.fmt.n(l.valor, 1)} / ${DB.fmt.n(l.meta, 0)} ${unidad(l.campo)}
                     </p>
                   </div>`}
            </article>`).join('')}
        </div>
      </section>

      <section class="section">
        <div class="notice notice-info">
          ${Icon.get('info', 17)}
          <div>
            <b>Cómo se otorgan.</b> Las insignias se evalúan cada vez que guarda una acción sostenible.
            Si el registro hace que alcance una meta, el sistema la entrega en ese momento y le avisa
            en pantalla y en la bandeja de notificaciones.
          </div>
        </div>
      </section>`;
  },

  mount() {
    UI.$$('#filtros-ins .chip').forEach(b => b.addEventListener('click', () => {
      this.filtro = b.dataset.f;
      Router.resolver();
    }));
  }
};

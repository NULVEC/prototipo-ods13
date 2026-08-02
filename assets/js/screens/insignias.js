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

    const unidad = campo => ({ co2: 'kg CO₂', km: 'km', racha: 'días',
                               registros: 'registros', reciclajes: 'registros',
                               semanas: 'semanas' }[campo] || '');

    return `
      <section class="section grid grid-3">
        ${UI.readout({ etiqueta: 'Insignias que ya tenés', icono: 'insignia', tono: 'is-ochre',
          valor: obtenidas.length, unidad: `/ ${logros.length}`,
          pie: `${Math.round(obtenidas.length / logros.length * 100)} % de todas` })}
        ${UI.readout({ etiqueta: 'La que sigue', icono: 'meta', tono: 'is-accent',
          valor: proxima ? proxima.pct + ' %' : '100 %',
          pie: proxima ? UI.esc(proxima.nombre) : '¡Las tenés todas!' })}
        ${UI.readout({ etiqueta: 'Tu racha', icono: 'llama',
          valor: DB.racha(), unidad: 'días',
          pie: 'Días seguidos registrando algo' })}
      </section>

      ${proxima ? `
      <section class="section">
        <div class="panel panel-dark">
          <div class="panel-body" style="display:flex;gap:var(--s-6);align-items:center;flex-wrap:wrap">
            <span class="seal is-${proxima.tono}" style="flex:none">${Icon.get(proxima.icono, 30, 1.8)}</span>
            <div style="flex:1;min-width:240px">
              <span class="label-micro" style="color:rgba(194,211,203,.6)">Ya casi la tenés</span>
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
          <h2>Todas las insignias</h2>
          <div class="section-aside" id="filtros-ins">
            <button class="chip" type="button" data-f="todas" aria-pressed="${this.filtro === 'todas'}">Todas</button>
            <button class="chip" type="button" data-f="obtenidas" aria-pressed="${this.filtro === 'obtenidas'}">Obtenidas (${obtenidas.length})</button>
            <button class="chip" type="button" data-f="pendientes" aria-pressed="${this.filtro === 'pendientes'}">Pendientes (${pendientes.length})</button>
          </div>
        </div>

        <div class="badge-grid">
          ${visibles.map(l => `
            <article class="badge-card ${l.obtenida ? '' : 'is-locked'}"
                     tabindex="0" role="button" data-insignia="${l.id}"
                     aria-label="${l.obtenida ? 'Insignia obtenida' : 'Insignia bloqueada'}: ${UI.esc(l.nombre)}">
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

    /* ------------------------------------------------------------------
       Validación de RF-07 (UC7 Recibir insignia o logro).

       Una insignia no se puede reclamar: se otorga sola cuando el registro
       de una acción alcanza la meta (relación «extend» del Avance 3). Al
       tocar una bloqueada, el sistema comprueba el criterio y responde con
       exactamente cuánto falta, en lugar de dejar la tarjeta muda o de
       insinuar que se puede pedir.
       ------------------------------------------------------------------ */
    const unidad = campo => ({ co2: 'kg de CO₂', km: 'km', racha: 'días',
                               registros: 'registros', reciclajes: 'registros de reciclaje',
                               semanas: 'semanas' }[campo] || '');

    const abrir = id => {
      const l = DB.logros().find(x => x.id === id);
      if (!l) return;

      if (l.obtenida) {
        UI.modal({
          titulo: l.nombre,
          cuerpo: `
            <div class="modal-seal"><span class="seal is-${l.tono}">${Icon.get(l.icono, 32, 1.8)}</span></div>
            <p style="text-align:center"><b>Ya es tuya.</b> ${UI.esc(l.criterio)}</p>
            ${l.desde ? `<p class="text-sm muted" style="text-align:center">
              La ganaste el ${DB.fmt.fecha(l.desde.slice(0, 10))}.</p>` : ''}`,
          acciones: [{ texto: 'Cerrar', clase: 'btn-primary' }]
        });
        return;
      }

      const falta = Math.max(0, l.meta - l.valor);
      UI.modal({
        titulo: l.nombre,
        cuerpo: `
          <div class="modal-seal"><span class="seal">${Icon.get(l.icono, 32, 1.8)}</span></div>
          <p style="text-align:center">${UI.esc(l.criterio)}</p>
          <div class="bar is-azul" style="--p:${l.pct}%;margin:var(--s-5) 0 var(--s-3)"
               role="progressbar" aria-valuenow="${l.pct}" aria-valuemin="0" aria-valuemax="100"><i></i></div>
          <p class="mono text-sm" style="text-align:center;margin:0">
            Vas en ${DB.fmt.n(l.valor, 1)} de ${DB.fmt.n(l.meta, 0)} ${unidad(l.campo)}
          </p>
          <p style="text-align:center;margin:var(--s-4) 0 0">
            <b>Te faltan ${DB.fmt.n(falta, falta < 10 ? 1 : 0)} ${unidad(l.campo)}.</b>
          </p>
          <p class="text-sm muted" style="text-align:center;margin:var(--s-2) 0 0">
            No hace falta pedirla: se entrega sola en cuanto registrés la acción que te lleve a la meta.
          </p>`,
        acciones: [
          { texto: 'Cerrar', clase: 'btn-ghost' },
          { texto: 'Registrar una acción', clase: 'btn-primary', icono: 'accion',
            onClick: () => Router.ir('/nueva-accion') }
        ]
      });
    };

    UI.$$('[data-insignia]').forEach(c => {
      c.addEventListener('click', () => abrir(c.dataset.insignia));
      // Con teclado se abre igual: la tarjeta declara role="button".
      c.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(c.dataset.insignia); }
      });
    });
  }
};

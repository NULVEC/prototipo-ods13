/* ============================================================================
   screens/reporte.js — UC9 Generar reporte de emisiones estimadas.

   Esta pantalla se lee como un documento, no como un tablero: encabezado con
   metadatos, cuerpo con el cálculo y una nota metodológica al final. Es la
   salida que el usuario descargaría o presentaría, y por eso declara de forma
   explícita sus supuestos y sus límites.
   ========================================================================= */

Screens.reporte = {

  meses: 6,

  render() {
    const u = DB.state.usuario;
    const dias = this.meses * 30;
    const lista = DB.enUltimosDias(dias);
    const cats = DB.porCategoria(lista);
    const total = DB.sumaCO2(lista);
    const serie = DB.serieMensual(this.meses);
    const folio = 'RPT-' + DB.hoyISO().replace(/-/g, '') + '-' + u.id.slice(-4);

    /* Emisión de referencia: lo que habría emitido de no realizar ninguna
       de las acciones registradas. Sirve para dar contexto al total. */
    const lineaBase = total / 0.18;   // el ahorro representa ~18 % de la línea base simulada

    return `
      <section class="section">
        <div class="report-head">
          <div style="display:flex;align-items:flex-start;gap:var(--s-5);flex-wrap:wrap">
            <div style="flex:1;min-width:260px">
              <span class="label-micro">Documento generado por el sistema</span>
              <h1 style="margin:var(--s-2) 0 var(--s-3)">Tu reporte de CO₂ evitado</h1>
              <p class="muted" style="max-width:62ch;margin:0">
                Todo el CO₂ que ${UI.esc(u.nombre)} no soltó al aire gracias a las acciones que
                registró aquí: lo que le fue restando a su ${UI.termino('huella', 'huella de carbono')}.
                Es un cálculo aproximado, hecho con lo que anotó cada día, y se puede descargar
                o imprimir para entregarlo.
              </p>
            </div>
            <div style="display:flex;gap:var(--s-2);flex-wrap:wrap">
              <div class="period-switch" role="group" aria-label="Periodo del reporte">
                <button type="button" data-m="3"  aria-pressed="${this.meses === 3}">3 meses</button>
                <button type="button" data-m="6"  aria-pressed="${this.meses === 6}">6 meses</button>
                <button type="button" data-m="12" aria-pressed="${this.meses === 12}">12 meses</button>
              </div>
              <button class="btn" type="button" id="r-descargar">
                ${Icon.get('descargar', 16)}<span>Descargar</span>
              </button>
              <button class="btn btn-ghost btn-icon" type="button" id="r-imprimir" aria-label="Imprimir el reporte">
                ${Icon.get('imprimir', 18)}
              </button>
            </div>
          </div>

          <div class="meta">
            <div><span class="label-micro">Folio</span><b>${folio}</b></div>
            <div><span class="label-micro">Usuario</span><b>${UI.esc(u.id)}</b></div>
            <div><span class="label-micro">Periodo</span><b>${this.meses} meses</b></div>
            <div><span class="label-micro">Acciones</span><b>${lista.length}</b></div>
            <div><span class="label-micro">Emitido el</span><b>${DB.fmt.fecha(DB.hoyISO())}</b></div>
          </div>
        </div>
      </section>

      <section class="section grid grid-3">
        ${UI.readout({ etiqueta: 'CO₂ que no soltaste', icono: 'globo',
          valor: DB.fmt.n(total, 1), unidad: 'kg',
          pie: `Lo mismo que capturan ${DB.fmt.n(total / 21, 1)} árboles en todo un año` })}
        ${UI.readout({ etiqueta: 'Lo que habrías soltado', icono: 'fabrica', tono: 'is-ember',
          valor: DB.fmt.n(lineaBase, 0), unidad: 'kg',
          pie: 'Si no hubieras hecho ninguna de estas acciones' })}
        ${UI.readout({ etiqueta: 'Lo que te ahorraste', icono: 'bajando', tono: 'is-accent',
          valor: '18,0', unidad: '%',
          pie: 'De todo eso, esta parte no llegó a pasar' })}
      </section>

      <section class="section">
        <div class="panel">
          <div class="panel-head">
            ${Icon.get('progreso', 18)}<h3>Mes a mes, y de dónde vino cada kilo</h3>
            <span class="tag">en kg de CO₂</span>
          </div>
          <div class="panel-body">
            <div class="chart-box is-tall"><canvas id="g-mensual"
              aria-label="Barras apiladas del CO2 evitado por mes y categoría" role="img"></canvas></div>
            <div class="legend">
              ${DB.CAT_LIST.map(c => `<span><i style="background:${c.color}"></i>${c.nombre}</span>`).join('')}
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>La cuenta, categoría por categoría</h2></div>
        <div class="table-wrap">
          <table class="data">
            <caption class="sr-only">Detalle del cálculo de emisiones evitadas por categoría</caption>
            <thead>
              <tr>
                <th scope="col">Categoría</th>
                <th scope="col">Clase del modelo</th>
                <th scope="col" class="align-r">Acciones</th>
                <th scope="col" class="align-r">Cuánto en total</th>
                <th scope="col" class="align-r">CO₂ evitado</th>
                <th scope="col" class="align-r">Qué tanto pesa</th>
              </tr>
            </thead>
            <tbody>
              ${cats.map(c => `
                <tr>
                  <td><span style="display:inline-flex;align-items:center;gap:8px;color:${DB.CATEGORIAS[c.id].colorTexto}">
                    ${Icon.get(DB.CATEGORIAS[c.id].icono, 16)}
                    <b style="color:var(--ink)">${c.nombre}</b></span></td>
                  <td class="mono text-sm">${DB.CATEGORIAS[c.id].clase}</td>
                  <td class="align-r mono">${c.registros}</td>
                  <td class="align-r mono">${DB.fmt.n(c.cantidad, 1)} ${c.unidad}</td>
                  <td class="align-r mono"><b>${DB.fmt.co2(c.co2)}</b> kg</td>
                  <td class="align-r mono">${total ? DB.fmt.n(c.co2 / total * 100, 1) : '0,0'} %</td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="background:var(--paper-sunken);font-weight:600">
                <td colspan="4"><b>Todo junto</b></td>
                <td class="align-r mono"><b>${DB.fmt.n(total, 1)} kg</b></td>
                <td class="align-r mono">100,0 %</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section class="section grid grid-2">
        <div class="panel">
          <div class="panel-head">${Icon.get('info', 18)}<h3>Cuánto ahorra cada cosa</h3></div>
          <div class="panel-body">
            <dl class="dl">
              ${DB.CAT_LIST.map(c => `
                <dt>${c.nombre}</dt>
                <dd>${DB.fmt.n(Math.min(...c.tipos.map(t => t.factor)), 3)} – ${DB.fmt.n(Math.max(...c.tipos.map(t => t.factor)), 3)} kg de CO₂ por cada ${c.unidad}</dd>`).join('')}
            </dl>
          </div>
          <div class="panel-foot">
            Estos son los números por los que se multiplica lo que registrás. El de electricidad es bajo
            (0,035 por kWh) porque casi toda la del país ya es renovable.
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">${Icon.get('alerta', 18)}<h3>Letra chica: cómo se hizo esta cuenta</h3></div>
          <div class="panel-body">
            <p class="text-sm">Cada acción se multiplica por un número fijo, y se da por hecho que
            reemplazaste la opción de siempre: que ese kilómetro en bus lo habrías hecho en carro de gasolina.</p>
            <p class="text-sm">Las cantidades las escribís vos y nadie las verifica, así que esto sirve para
            seguirte la pista a vos mismo, no como un certificado oficial de nada.</p>
            <p class="text-sm" style="margin-bottom:0">Los valores de este prototipo son de referencia
            académica y no provienen de un inventario oficial.</p>
          </div>
        </div>
      </section>`;
  },

  mount() {
    Charts.mensualApilado('g-mensual', DB.serieMensual(this.meses));

    UI.$$('.period-switch button').forEach(b => b.addEventListener('click', () => {
      this.meses = +b.dataset.m;
      Router.resolver();
    }));

    document.getElementById('r-descargar').addEventListener('click', async e => {
      await UI.cargando(e.currentTarget, 1100);
      UI.toast('Reporte generado',
        'En la versión final, el backend devuelve el archivo PDF por la API REST.', 'info');
    });

    document.getElementById('r-imprimir').addEventListener('click', () => window.print());
  }
};

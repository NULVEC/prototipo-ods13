/* ============================================================================
   screens/progreso.js — UC5 Consultar progreso personal.

   Según el Avance 3, UC5 «incluye» a UC9: el resumen de avance siempre
   presenta el cálculo de CO₂ evitado. Esa relación se refleja con el enlace
   permanente al reporte de emisiones en la cabecera de la sección.
   ========================================================================= */

Screens.progreso = {

  periodo: 84,        // días visibles; 84 = 12 semanas completas
  filtro: 'todas',

  render() {
    const p = this.periodo;
    const lista = DB.enUltimosDias(p);
    const cats = DB.porCategoria(lista);
    const total = DB.sumaCO2(lista);
    const dias = DB.serieDiaria(p);
    const activos = dias.filter(d => d.co2 > 0).length;
    const mejor = dias.reduce((a, b) => b.co2 > a.co2 ? b : a, dias[0]);

    return `
      <section class="section">
        <div class="section-head">
          <h2>Resumen de avance</h2>
          <div class="section-aside">
            <div class="period-switch" role="group" aria-label="Periodo del resumen">
              <button type="button" data-p="28" ${p === 28 ? 'aria-pressed="true"' : 'aria-pressed="false"'}>4 semanas</button>
              <button type="button" data-p="84" ${p === 84 ? 'aria-pressed="true"' : 'aria-pressed="false"'}>12 semanas</button>
              <button type="button" data-p="365" ${p === 365 ? 'aria-pressed="true"' : 'aria-pressed="false"'}>Un año</button>
            </div>
            <a class="btn btn-sm" href="#/reporte">${Icon.get('reporte', 15)}<span>Reporte de emisiones</span></a>
          </div>
        </div>

        <div class="grid grid-4">
          ${UI.readout({ etiqueta: 'CO₂e evitado en el periodo', icono: 'globo',
            valor: DB.fmt.n(total, 1), unidad: 'kg', pie: `${lista.length} registros` })}
          ${UI.readout({ etiqueta: 'Promedio diario', icono: 'pulso', tono: 'is-accent',
            valor: DB.fmt.n(total / p, 2), unidad: 'kg', pie: `Sobre ${p} días` })}
          ${UI.readout({ etiqueta: 'Días con actividad', icono: 'calendario',
            valor: activos, unidad: `/ ${p}`, pie: `${Math.round(activos / p * 100)} % de constancia` })}
          ${UI.readout({ etiqueta: 'Mejor día', icono: 'insignia', tono: 'is-ochre',
            valor: DB.fmt.co2(mejor.co2), unidad: 'kg', pie: DB.fmt.fecha(mejor.fecha) })}
        </div>
      </section>

      <section class="section grid grid-main-aside">
        <div class="panel">
          <div class="panel-head">
            ${Icon.get('progreso', 18)}<h3>Evolución semanal del CO₂e evitado</h3>
          </div>
          <div class="panel-body">
            <div class="chart-box is-tall"><canvas id="g-evolucion"
              aria-label="Gráfico de líneas con el CO2 evitado por semana" role="img"></canvas></div>
          </div>
          <div class="panel-foot">Cada punto agrupa siete días. La zona sombreada marca el acumulado.</div>
        </div>

        <div class="panel">
          <div class="panel-head">${Icon.get('filtro', 18)}<h3>Reparto por categoría</h3></div>
          <div class="panel-body">
            <div class="chart-box"><canvas id="g-reparto"
              aria-label="Gráfico de anillo con el reparto por categoría" role="img"></canvas></div>
            <div class="legend">
              ${cats.map(c => `<span><i style="background:${c.color}"></i>${c.nombre}</span>`).join('')}
            </div>
          </div>
        </div>
      </section>

      <section class="section grid grid-2">
        <div class="panel">
          <div class="panel-head">${Icon.get('calendario', 18)}<h3>Distribución por día de la semana</h3></div>
          <div class="panel-body">
            <div class="chart-box is-short"><canvas id="g-dias"
              aria-label="Gráfico de barras por día de la semana" role="img"></canvas></div>
          </div>
          <div class="panel-foot">Las barras claras corresponden al fin de semana.</div>
        </div>

        <div class="panel">
          <div class="panel-head">${Icon.get('pulso', 18)}<h3>Detalle por categoría</h3></div>
          <div class="panel-body">
            <ul class="breakdown">
              ${cats.map(c => `
                <li>
                  <div class="bk-top">
                    <b>${c.nombre}</b>
                    <span class="pct">${total ? Math.round(c.co2 / total * 100) : 0} %</span>
                    <span class="v">${DB.fmt.co2(c.co2)} kg</span>
                  </div>
                  <div class="bar" style="--p:${total ? c.co2 / total * 100 : 0}%"><i style="background:${c.color}"></i></div>
                  <p class="text-sm muted" style="margin:6px 0 0">
                    ${c.registros} registros · ${DB.fmt.n(c.cantidad, 1)} ${c.unidad} acumulados
                  </p>
                </li>`).join('')}
            </ul>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Historial de registros</h2>
          <div class="section-aside" id="filtros-cat">
            <button class="chip" type="button" data-f="todas" aria-pressed="${this.filtro === 'todas'}">Todas</button>
            ${DB.CAT_LIST.map(c => `
              <button class="chip" type="button" data-f="${c.id}" aria-pressed="${this.filtro === c.id}">
                ${Icon.get(c.icono, 14)}${c.nombre}
              </button>`).join('')}
          </div>
        </div>
        <div id="tabla-historial">${this.tabla(lista)}</div>
      </section>`;
  },

  /** Tabla del historial, redibujada al cambiar el filtro. */
  tabla(lista) {
    const filtrada = this.filtro === 'todas' ? lista : lista.filter(r => r.categoria === this.filtro);
    const orden = [...filtrada].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id)).slice(0, 40);

    if (!orden.length) {
      return `<div class="panel"><div class="empty">
        ${Icon.get('buscar', 34, 1.5)}
        <h3>Sin registros en este filtro</h3>
        <p>Pruebe con otra categoría o amplíe el periodo del resumen.</p>
      </div></div>`;
    }

    return `
      <div class="table-wrap">
        <table class="data">
          <caption class="sr-only">Historial de acciones sostenibles registradas</caption>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Categoría</th>
              <th scope="col">Tipo de acción</th>
              <th scope="col" class="align-r">Cantidad</th>
              <th scope="col" class="align-r">CO₂e evitado</th>
              <th scope="col"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            ${orden.map(r => {
              const c = DB.CATEGORIAS[r.categoria];
              const t = DB.tipoDe(r.categoria, r.tipo);
              return `<tr>
                <td class="mono">${DB.fmt.fechaCorta(r.fecha)}</td>
                <td><span class="tag" style="border-color:${c.color}55;color:${c.colorTexto}">${c.nombre}</span></td>
                <td>${UI.esc(t.nombre)}${r.nota ? `<br><span class="text-sm muted">${UI.esc(r.nota)}</span>` : ''}</td>
                <td class="align-r mono">${DB.fmt.n(r.cantidad, 2)} ${c.unidad}</td>
                <td class="align-r mono"><b>${DB.fmt.co2(r.co2)}</b> kg</td>
                <td class="align-r">
                  <button class="btn btn-icon" type="button" data-borrar="${r.id}"
                          aria-label="Eliminar el registro del ${DB.fmt.fecha(r.fecha)}">
                    ${Icon.get('basura', 16)}
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-sm muted" style="margin-top:var(--s-3)">
        Mostrando ${orden.length} de ${filtrada.length} registros del periodo.
      </p>`;
  },

  mount() {
    const p = this.periodo;
    const lista = DB.enUltimosDias(p);

    Charts.evolucion('g-evolucion', DB.serieSemanal(Math.round(p / 7)));
    Charts.reparto('g-reparto', DB.porCategoria(lista).filter(c => c.co2 > 0));
    Charts.porDiaSemana('g-dias', lista);

    /* Cambio de periodo: vuelve a dibujar toda la pantalla. */
    UI.$$('.period-switch button').forEach(b => b.addEventListener('click', () => {
      this.periodo = +b.dataset.p;
      Router.resolver();
    }));

    /* Filtro por categoría: solo redibuja la tabla. */
    UI.$$('#filtros-cat .chip').forEach(b => b.addEventListener('click', () => {
      this.filtro = b.dataset.f;
      UI.$$('#filtros-cat .chip').forEach(o => o.setAttribute('aria-pressed', o === b));
      document.getElementById('tabla-historial').innerHTML = this.tabla(DB.enUltimosDias(this.periodo));
      this.conectarBorrado();
    }));

    this.conectarBorrado();
  },

  conectarBorrado() {
    UI.$$('[data-borrar]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.borrar;
      UI.modal({
        titulo: 'Eliminar el registro',
        cuerpo: `<p>Se eliminará el registro <span class="mono">${UI.esc(id)}</span> y su CO₂e dejará de
                 contar en el progreso, en la comparativa y en el reporte. Esta acción no se puede deshacer.</p>`,
        acciones: [
          { texto: 'Conservar', clase: 'btn-ghost' },
          { texto: 'Eliminar', clase: 'btn-danger', icono: 'basura', onClick: () => {
              DB.eliminarRegistro(id);
              UI.toast('Registro eliminado', 'El progreso se recalculó.', 'info');
              Router.resolver();
            } }
        ]
      });
    }));
  }
};

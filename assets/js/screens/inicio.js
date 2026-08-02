/* ============================================================================
   screens/inicio.js — UC3 Visualizar información ambiental.

   La pantalla combina el estado del usuario (lo primero que quiere ver al
   entrar) con el contenido educativo del caso de uso. El contenido llega
   con un estado de carga real para mostrar cómo respondería el backend.
   ========================================================================= */

Screens.inicio = {
  render() {
    const u = DB.state.usuario;
    const hoy = new Date();
    const hora = hoy.getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

    const mes = DB.state.registros.filter(r => r.fecha.slice(0, 7) === DB.hoyISO().slice(0, 7));
    const co2Mes = DB.sumaCO2(mes);
    const pctMeta = Math.min(100, Math.round(co2Mes / u.meta * 100));
    const total = DB.sumaCO2(DB.state.registros);
    const sem = DB.enUltimosDias(7);
    const semAnterior = DB.state.registros.filter(r => {
      const d = new Date(r.fecha + 'T00:00:00');
      const diff = (new Date().setHours(0,0,0,0) - d) / 86400000;
      return diff >= 7 && diff < 14;
    });
    const varSem = DB.sumaCO2(semAnterior) > 0
      ? Math.round((DB.sumaCO2(sem) / DB.sumaCO2(semAnterior) - 1) * 100) : 0;

    const tabla = DB.tablaComunidad();
    const miPos = tabla.find(t => t.alias === u.alias)?.pos ?? '—';
    const ultimos = DB.registrosOrdenados().slice(0, 5);
    const consejo = DB.consejos[new Date().getDate() % DB.consejos.length];

    return `
      <section class="home-head">
        <div>
          <h1>${saludo}, ${UI.esc(u.nombre.split(' ')[0])}</h1>
          <p>Este mes ha evitado <b>${DB.fmt.co2(co2Mes)} kg de CO₂e</b> de una meta de
             ${u.meta} kg. Faltan ${DB.fmt.co2(Math.max(0, u.meta - co2Mes))} kg para cerrarla.</p>
          <div class="bar is-azul" style="--p:${pctMeta}%;max-width:420px;margin-top:var(--s-4)"
               role="progressbar" aria-valuenow="${pctMeta}" aria-valuemin="0" aria-valuemax="100"
               aria-label="Avance de la meta mensual"><i></i></div>
        </div>
        <div class="streak">
          <span class="label-micro">Racha activa</span>
          <span class="n">${DB.racha()}</span>
          <small>días seguidos con registro</small>
        </div>
      </section>

      <section class="section grid grid-4">
        ${UI.readout({ etiqueta: 'CO₂e evitado en total', icono: 'globo',
          valor: DB.fmt.n(total, 1), unidad: 'kg',
          pie: `Desde el ${DB.fmt.fecha(u.desde)}` })}
        ${UI.readout({ etiqueta: 'Últimos 7 días', icono: 'pulso', tono: 'is-accent',
          valor: DB.fmt.co2(DB.sumaCO2(sem)), unidad: 'kg',
          pie: `<span class="delta ${varSem >= 0 ? 'delta-up' : 'delta-down'}">
                  ${Icon.get(varSem >= 0 ? 'subiendo' : 'bajando', 13)}
                  ${varSem >= 0 ? '+' : ''}${varSem} %</span> frente a la semana anterior` })}
        ${UI.readout({ etiqueta: 'Acciones registradas', icono: 'accion',
          valor: DB.state.registros.length, unidad: '',
          pie: `${sem.length} en la última semana` })}
        ${UI.readout({ etiqueta: 'Posición en la comunidad', icono: 'comunidad', tono: 'is-ochre',
          valor: '#' + miPos, unidad: '',
          pie: `Entre ${tabla.length} participantes anónimos` })}
      </section>

      <section class="section grid grid-main-aside">

        <div class="panel">
          <div class="panel-head">
            ${Icon.get('bombilla', 18)}
            <h3>Información ambiental</h3>
            <span class="tag">ODS 13</span>
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
            <div class="panel-head">${Icon.get('brote', 18)}<h3>Consejo de hoy</h3></div>
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
              ${Icon.get('reloj', 18)}<h3>Últimos registros</h3>
              <a class="btn btn-ghost btn-sm" href="#/progreso">Ver todos ${Icon.get('chevronDer', 14)}</a>
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
                <div class="feed-meta">+${DB.fmt.co2(r.co2)}<br><span class="label-micro">kg CO₂e</span></div>
              </li>`;
            }).join('')}</ul>` : `
              <div class="empty">${Icon.get('bandeja', 34, 1.5)}
                <h3>Todavía no hay registros</h3>
                <p>Cuando registre su primera acción sostenible aparecerá aquí.</p>
                <a class="btn btn-primary" href="#/nueva-accion">Registrar acción</a>
              </div>`}
          </div>
        </div>
      </section>`;
  },

  mount() {
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
  }
};

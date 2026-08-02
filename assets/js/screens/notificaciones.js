/* ============================================================================
   screens/notificaciones.js — UC6 Recibir notificaciones y recordatorios.

   El actor de este caso de uso no es la persona sino el temporizador del
   sistema. Para que eso sea visible en el prototipo, cada mensaje muestra su
   origen y hay un control que dispara el temporizador manualmente.
   ========================================================================= */

Screens.notificaciones = {

  filtro: 'todas',

  TIPOS: {
    recordatorio: { nombre: 'Recordatorio', icono: 'reloj',     clase: 'is-azul'  },
    logro:        { nombre: 'Logro',        icono: 'insignia',  clase: 'is-ochre' },
    resumen:      { nombre: 'Resumen',      icono: 'reporte',   clase: ''         },
    alerta:       { nombre: 'Revisión',     icono: 'alerta',    clase: 'is-ember' }
  },

  render() {
    const u = DB.state.usuario;
    const sinLeer = DB.noLeidas();

    return `
      <div class="grid grid-main-aside">

        <section>
          <div class="section-head">
            <h2>Bandeja de notificaciones</h2>
            <div class="section-aside" id="filtros-notif">
              <button class="chip" type="button" data-f="todas" aria-pressed="${this.filtro === 'todas'}">Todas</button>
              <button class="chip" type="button" data-f="sinleer" aria-pressed="${this.filtro === 'sinleer'}">Sin leer (${sinLeer})</button>
              ${Object.entries(this.TIPOS).map(([k, t]) => `
                <button class="chip" type="button" data-f="${k}" aria-pressed="${this.filtro === k}">${t.nombre}</button>`).join('')}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              ${Icon.get('bandeja', 18)}
              <h3>${sinLeer ? `${sinLeer} sin leer` : 'Todo al día'}</h3>
              <button class="btn btn-sm" type="button" id="n-todas" ${sinLeer ? '' : 'disabled'}>
                ${Icon.get('check', 15)}<span>Marcar todas como leídas</span>
              </button>
            </div>
            <div id="lista-notif">${this.lista()}</div>
          </div>
        </section>

        <aside class="stack">
          <div class="panel">
            <div class="panel-head">${Icon.get('ajustes', 18)}<h3>Preferencias de aviso</h3></div>
            <form class="panel-body" id="form-notif">
              <div class="field">
                <span class="field-label">Qué quiere recibir</span>
                ${[
                  ['recordatorio', 'Recordatorios de registro'],
                  ['logros', 'Insignias y logros'],
                  ['resumen', 'Resumen semanal por correo'],
                  ['comunidad', 'Movimientos en la comparativa']
                ].map(([k, txt]) => `
                  <label class="switch" style="margin-bottom:var(--s-3)">
                    <input type="checkbox" name="${k}" ${u.notificaciones[k] ? 'checked' : ''}>
                    <span class="track"></span>
                    <span class="text-sm">${txt}</span>
                  </label>`).join('')}
              </div>

              <div class="field">
                <label for="n-frec">Frecuencia del recordatorio</label>
                <select class="select" id="n-frec" name="frecuencia">
                  ${['diaria', 'cada dos días', 'semanal'].map(f =>
                    `<option value="${f}" ${u.frecuencia === f ? 'selected' : ''}>${f[0].toUpperCase() + f.slice(1)}</option>`).join('')}
                </select>
              </div>

              <div class="field">
                <label for="n-hora">Hora de envío</label>
                <input class="input" id="n-hora" name="hora" type="time" value="${u.hora}">
                <span class="hint">Hora de Costa Rica (UTC−6).</span>
              </div>

              <button class="btn btn-primary btn-block" type="submit" id="n-guardar">
                ${Icon.get('guardar', 17)}<span>Guardar preferencias</span>
              </button>
            </form>
          </div>

          <div class="panel panel-dark">
            <div class="panel-head">${Icon.get('recargar', 18)}<h3>Temporizador del sistema</h3></div>
            <div class="panel-body">
              <p class="text-sm" style="color:var(--pine-on-dark)">
                En la arquitectura propuesta, el backend envía estos avisos de forma automática
                mediante SMTP. Pulse el botón para simular una ejecución del temporizador.
              </p>
              <button class="btn btn-accent btn-block" type="button" id="n-disparar" style="margin-top:var(--s-4)">
                ${Icon.get('campana', 16)}<span>Ejecutar ahora</span>
              </button>
            </div>
          </div>
        </aside>
      </div>`;
  },

  lista() {
    let items = DB.state.notificaciones;
    if (this.filtro === 'sinleer') items = items.filter(n => !n.leida);
    else if (this.filtro !== 'todas') items = items.filter(n => n.tipo === this.filtro);
    items = [...items].sort((a, b) => b.fecha.localeCompare(a.fecha));

    if (!items.length) {
      return `<div class="empty">
        ${Icon.get('checkCirculo', 34, 1.5)}
        <h3>No hay mensajes en este filtro</h3>
        <p>Cuando el temporizador envíe un aviso nuevo aparecerá aquí.</p>
      </div>`;
    }

    return `<ul class="feed">${items.map(n => {
      const t = this.TIPOS[n.tipo];
      return `<li class="${n.leida ? '' : 'is-unread'}">
        <span class="feed-icon ${t.clase}">${Icon.get(t.icono, 17)}</span>
        <div class="feed-body">
          <b>${UI.esc(n.titulo)}</b>
          <p>${UI.esc(n.texto)}</p>
          <p style="margin-top:6px">
            <span class="tag">${t.nombre}</span>
            <span class="tag">origen: ${n.origen === 'sistema' ? 'temporizador' : n.origen}</span>
          </p>
        </div>
        <div class="feed-meta">
          ${DB.fmt.relativo(n.fecha)}
          ${n.leida ? '' : `<br><button class="btn btn-ghost btn-sm" type="button" data-leer="${n.id}"
             style="margin-top:6px">Marcar leída</button>`}
        </div>
      </li>`;
    }).join('')}</ul>`;
  },

  mount() {
    const refrescar = () => {
      document.getElementById('lista-notif').innerHTML = this.lista();
      this.conectar();
    };

    UI.$$('#filtros-notif .chip').forEach(b => b.addEventListener('click', () => {
      this.filtro = b.dataset.f;
      UI.$$('#filtros-notif .chip').forEach(o => o.setAttribute('aria-pressed', o === b));
      refrescar();
    }));

    document.getElementById('n-todas').addEventListener('click', () => {
      DB.marcarLeidas(null);
      UI.toast('Bandeja al día', 'Todas las notificaciones quedaron marcadas como leídas.', 'info');
      Router.resolver();
    });

    document.getElementById('n-disparar').addEventListener('click', async e => {
      await UI.cargando(e.currentTarget, 800);
      const pendiente = DB.enUltimosDias(1).length === 0;
      DB.agregarNotificacion({
        id: 'N-' + Date.now().toString().slice(-5),
        tipo: pendiente ? 'recordatorio' : 'resumen',
        origen: 'sistema', leida: false, fecha: new Date().toISOString(),
        titulo: pendiente ? 'Recordatorio: hoy no hay registros' : 'Corte del día generado',
        texto: pendiente
          ? `Su racha de ${DB.racha()} días se mantiene si registra una acción antes de la medianoche.`
          : `Hoy lleva ${DB.fmt.co2(DB.sumaCO2(DB.enUltimosDias(1)))} kg de CO₂e evitados. Buen cierre de jornada.`
      });
      UI.toast('Temporizador ejecutado', 'Se generó un aviso nuevo en la bandeja.', 'info');
      Router.resolver();
    });

    const form = document.getElementById('form-notif');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      await UI.cargando(document.getElementById('n-guardar'), 750);
      const d = new FormData(form);
      const u = DB.state.usuario;
      ['recordatorio', 'logros', 'resumen', 'comunidad'].forEach(k => u.notificaciones[k] = d.has(k));
      u.frecuencia = d.get('frecuencia');
      u.hora = d.get('hora');
      DB.guardarPerfil({ notificaciones: u.notificaciones, frecuencia: u.frecuencia, hora: u.hora });
      UI.toast('Preferencias guardadas', `Recibirá el recordatorio ${u.frecuencia} a las ${u.hora}.`);
    });

    this.conectar();
  },

  conectar() {
    UI.$$('[data-leer]').forEach(b => b.addEventListener('click', () => {
      DB.marcarLeidas([b.dataset.leer]);
      Router.resolver();
    }));
  }
};

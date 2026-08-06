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
            <h2>Tus avisos</h2>
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
            <div class="panel-head">${Icon.get('ajustes', 18)}<h3>¿De qué te avisamos?</h3></div>
            <form class="panel-body" id="form-notif">
              <div class="field">
                <span class="field-label">Qué querés recibir</span>
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
            <div class="panel-head">${Icon.get('recargar', 18)}<h3>Cómo llegan estos avisos</h3></div>
            <div class="panel-body">
              <p class="text-sm" style="color:var(--on-deep)">
                En la arquitectura propuesta, el backend manda estos avisos solo, por correo.
                Tocá el botón para simular una corrida del temporizador y ver qué llega.
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
        <h3>Nada por aquí</h3>
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
      refrescar();
      this.refrescarCabecera();
      Router.refrescarAvisos();
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
          ? `Tu racha de ${DB.racha()} días se mantiene si registrás algo antes de la medianoche.`
          : `Hoy llevás ${DB.fmt.co2(DB.sumaCO2(DB.enUltimosDias(1)))} kg de CO₂ evitados. Buen cierre de jornada.`
      });
      UI.toast('Temporizador ejecutado', 'Se generó un aviso nuevo en la bandeja.', 'info');
      refrescar();
      this.refrescarCabecera();
      Router.refrescarAvisos();
    });

    const form = document.getElementById('form-notif');
    const hora = document.getElementById('n-hora');

    /* Guarda de verdad. Se separa del envío para poder llamarla también
       después de que la persona confirme que quiere quedarse sin avisos. */
    const guardar = async () => {
      await UI.cargando(document.getElementById('n-guardar'), 750);
      const d = new FormData(form);
      const u = DB.state.usuario;
      ['recordatorio', 'logros', 'resumen', 'comunidad'].forEach(k => u.notificaciones[k] = d.has(k));
      u.frecuencia = d.get('frecuencia');
      u.hora = d.get('hora');
      DB.guardarPerfil({ notificaciones: u.notificaciones, frecuencia: u.frecuencia, hora: u.hora });
      UI.toast('Listo, quedó guardado',
        d.has('recordatorio')
          ? `Te vamos a escribir ${u.frecuencia === 'diaria' ? 'todos los días' : u.frecuencia} a las ${u.hora}.`
          : 'No vas a recibir recordatorios.');
    };

    /* ------------------------------------------------------------------
       Validación de RF-06 (UC6 Recibir notificaciones y recordatorios).

       Dos comprobaciones, porque son dos errores distintos:

       1. Si el recordatorio está activo, la hora es obligatoria. El actor
          Temporizador del Avance 3 dispara a una hora concreta; sin ella no
          hay nada que programar y la preferencia quedaría sin efecto.
       2. Apagar los cuatro avisos es una decisión legítima, no un error,
          así que no se bloquea: se confirma. Es la diferencia entre "no
          podés" y "asegurate de que es lo que querés".
       ------------------------------------------------------------------ */
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const d = new FormData(form);

      if (d.has('recordatorio') && !d.get('hora')) {
        UI.marcar(hora, 'Poné la hora a la que querés que te escribamos.');
        hora.focus();
        UI.toast('Falta la hora', 'El recordatorio necesita una hora para poder programarse.', 'error');
        return;
      }
      UI.marcar(hora, null);

      const ninguno = !['recordatorio', 'logros', 'resumen', 'comunidad'].some(k => d.has(k));
      if (ninguno) {
        UI.modal({
          titulo: '¿Seguro que no querés ningún aviso?',
          cuerpo: `<p>Vas a apagar los cuatro. La app va a seguir funcionando igual, pero nadie te
                   va a recordar registrar, ni te vamos a avisar cuando ganés una insignia.</p>
                   <p class="text-sm muted">Lo podés volver a encender cuando querás.</p>`,
          acciones: [
            { texto: 'Mejor dejo alguno', clase: 'btn-ghost' },
            { texto: 'Sí, apagar todo', clase: 'btn-danger', onClick: guardar }
          ]
        });
        return;
      }

      guardar();
    });

    // Al corregir la hora se limpia el error, sin esperar a que reenvíe.
    hora.addEventListener('input', () => { if (hora.value) UI.marcar(hora, null); });

    this.conectar();
  },

  conectar() {
    /* Marcar UNA notificación como leída no justifica redibujar la pantalla.
       Antes llamaba a `Router.resolver()`, así que al marcar la primera de la
       lista se rehacía todo el panel y la posición de desplazamiento saltaba
       arriba — con siete avisos, marcarlos de a uno era ir persiguiendo la
       lista. Ahora se apaga esa fila y se refresca el contador del armazón. */
    UI.$$('[data-leer]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.leer;
      DB.marcarLeidas([id]);

      const fila = b.closest('li');
      fila?.classList.remove('is-unread');
      b.remove();

      this.refrescarCabecera();
      Router.refrescarAvisos();
    }));
  },

  /** Pone al día el rótulo y el botón de "marcar todas" sin rehacer la lista. */
  refrescarCabecera() {
    const sinLeer = DB.noLeidas();
    const titulo = document.querySelector('#lista-notif')?.closest('.panel')?.querySelector('.panel-head h3');
    if (titulo) titulo.textContent = sinLeer ? `${sinLeer} sin leer` : 'Todo al día';
    const todas = document.getElementById('n-todas');
    if (todas) todas.disabled = !sinLeer;
    const chip = document.querySelector('#filtros-notif [data-f="sinleer"]');
    if (chip) chip.textContent = `Sin leer (${sinLeer})`;
    /* Si se está mirando el filtro "sin leer", la fila que se acaba de marcar
       ya no pertenece a la lista: ahí sí hay que rehacerla. */
    if (this.filtro === 'sinleer') {
      document.getElementById('lista-notif').innerHTML = this.lista();
      this.conectar();
    }
  }
};

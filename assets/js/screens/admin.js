/* ============================================================================
   screens/admin.js — Panel de control (papel de administrador).

   Un panel de administración se justifica solo si administra algo que de
   verdad cambia para las demás personas. Si no, es una pantalla de adorno con
   un candado dibujado.

   Aquí administra tres cosas, y las tres tienen consecuencias visibles:

     1. La información ambiental del UC3. Hasta ahora esos cuatro artículos
        eran una constante dentro del código, así que la frase del Avance 3
        —"el sistema muestra información ambiental actualizada"— no tenía a
        nadie detrás que la actualizara. Lo que se publique aquí es lo que ve
        todo el mundo al entrar.

     2. La comparativa comunitaria del UC8. Un alias puede ser ofensivo o una
        cifra puede ser absurda; retirar esa fila es moderación, y solo un
        administrador puede hacerlo. No puede EDITAR la cifra de nadie: eso
        convertiría el ranking en una opinión.

     3. La auditoría de los factores de emisión. La aplicación afirma cosas
        concretas sobre el impacto de una persona; qué factores están
        contrastados contra su fuente publicada y cuáles no es exactamente el
        dato que hay que revisar antes de citar el sistema en el artículo.

   Lo que NO hace, y es a propósito: leer los registros de otras personas. Las
   reglas de Firestore no lo permiten y no se les va a abrir una excepción. Un
   administrador no necesita ver la vida de nadie para moderar un alias, y el
   caso de uso del UC8 promete anonimato — un panel que rompiera eso volvería
   falsa la promesa de toda la aplicación.
   ========================================================================= */

Screens.admin = {

  seccion: 'contenido',      // contenido · comunidad · factores

  /* Borrador de la lista de artículos. Se edita en memoria y solo se escribe
     al publicar: así se puede reordenar y corregir sin que cada tecla salga
     hacia la base y sin que nadie lea un contenido a medio escribir. */
  borrador: null,

  /* ------------------------------------------------------------------ */
  render() {
    const u = DB.state.usuario;
    const verificado = DB.rolVerificado();
    const tabla = DB.tablaComunidad();
    const reales = tabla.filter(c => !c.simulado);
    const factores = this.factores();
    const sinVerificar = factores.filter(f => !f.verificada).length;

    if (this.borrador === null) this.borrador = DB.articulos.map(a => ({ ...a }));

    return `
      <section class="section">
        <div class="admin-cabecera">
          <span class="admin-sello">${Icon.get('admin', 26, 1.6)}</span>
          <div style="flex:1;min-width:240px">
            <span class="label-micro">Panel de control</span>
            <h1 style="margin:var(--s-2) 0 var(--s-2)">Administración del sistema</h1>
            <p style="margin:0;color:var(--on-deep)">
              Sesión de <b>${UI.esc(u.correo || 'sin correo')}</b>.
              Lo que publiqués acá lo ve toda la gente que use el sistema.
            </p>
          </div>
          <div class="admin-estado">
            ${verificado ? `
              <span class="tag tag-azul">${Icon.get('escudo', 12)} Permiso verificado</span>
              <p class="text-sm" style="margin:var(--s-2) 0 0;color:var(--on-deep-soft)">
                El correo viene firmado por Firebase Authentication y las reglas
                de Firestore comprueban la misma lista.
              </p>` : `
              <span class="tag tag-ochre">${Icon.get('alerta', 12)} Sin verificar</span>
              <p class="text-sm" style="margin:var(--s-2) 0 0;color:var(--on-deep-soft)">
                Modo sin conexión: no hay ningún token que firme este correo, así
                que el papel sirve para mostrar la pantalla pero no es una
                credencial. Contra Firebase, las reglas rechazarían la escritura.
              </p>`}
          </div>
        </div>
      </section>

      <section class="section grid grid-3">
        ${UI.readout({ etiqueta: 'Artículos publicados', icono: 'bombilla',
          valor: DB.articulos.length, unidad: `/ ${40}`,
          pie: 'Es lo que se ve en Inicio (UC3)' })}
        ${UI.readout({ etiqueta: 'Participantes reales', icono: 'comunidad', tono: 'is-accent',
          valor: reales.length, unidad: `/ ${tabla.length}`,
          pie: `${tabla.length - reales.length} son simulados para poder demostrar la pantalla` })}
        ${UI.readout({ etiqueta: 'Factores por verificar', icono: 'alerta',
          tono: sinVerificar ? 'is-ember' : '',
          valor: sinVerificar, unidad: `/ ${factores.length}`,
          pie: sinVerificar ? 'Hay que contrastarlos antes de citarlos' : 'Todos contrastados' })}
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Qué querés administrar</h2>
          <div class="section-aside">
            <div class="period-switch" role="group" aria-label="Sección del panel">
              <button type="button" data-sec="contenido" aria-pressed="${this.seccion === 'contenido'}">Contenido del UC3</button>
              <button type="button" data-sec="comunidad" aria-pressed="${this.seccion === 'comunidad'}">Comunidad</button>
              <button type="button" data-sec="factores"  aria-pressed="${this.seccion === 'factores'}">Factores</button>
            </div>
          </div>
        </div>
        <div id="admin-cuerpo">${this.cuerpo()}</div>
      </section>`;
  },

  cuerpo() {
    if (this.seccion === 'comunidad') return this.vistaComunidad();
    if (this.seccion === 'factores') return this.vistaFactores();
    return this.vistaContenido();
  },

  /* ==================================================================
     1. CONTENIDO AMBIENTAL (UC3)
     ================================================================== */
  vistaContenido() {
    const cambiado = JSON.stringify(this.borrador) !== JSON.stringify(DB.articulos);

    return `
      <div class="panel">
        <div class="panel-head">
          ${Icon.get('bombilla', 18)}
          <h3>Información ambiental de la pantalla de inicio</h3>
          ${cambiado ? '<span class="tag tag-ochre">Sin publicar</span>'
                     : '<span class="tag tag-pine">Publicado</span>'}
        </div>

        <div class="panel-body">
          <div class="notice notice-info" style="margin-bottom:var(--s-5)">
            ${Icon.get('info', 17)}
            <div>
              Cada ficha lleva una <b>cifra</b> grande, un titular, la explicación y la
              fuente. La cifra es lo que la gente recuerda, así que tiene que poder
              defenderse: si no hay una fuente que la respalde, mejor no ponerla.
            </div>
          </div>

          <ol class="admin-fichas" id="admin-fichas">
            ${this.borrador.map((a, i) => this.fichaEditable(a, i)).join('')}
          </ol>

          <button class="btn" type="button" id="admin-agregar" style="margin-top:var(--s-5)"
                  ${this.borrador.length >= 40 ? 'disabled' : ''}>
            ${Icon.get('accion', 16)}<span>Agregar una ficha</span>
          </button>
        </div>

        <div class="panel-foot admin-barra-guardar">
          <span class="text-sm">
            ${cambiado
              ? 'Hay cambios sin publicar. Nadie los ve todavía.'
              : 'Lo que se muestra en Inicio es exactamente esto.'}
          </span>
          <div style="display:flex;gap:var(--s-2);margin-left:auto;flex-wrap:wrap">
            <button class="btn btn-sm" type="button" id="admin-fabrica">
              ${Icon.get('recargar', 15)}<span>Volver al contenido original</span>
            </button>
            <button class="btn btn-sm" type="button" id="admin-descartar" ${cambiado ? '' : 'disabled'}>
              <span>Descartar cambios</span>
            </button>
            <button class="btn btn-sm btn-primary" type="button" id="admin-publicar" ${cambiado ? '' : 'disabled'}>
              ${Icon.get('guardar', 15)}<span>Publicar</span>
            </button>
          </div>
        </div>
      </div>`;
  },

  fichaEditable(a, i) {
    const n = i + 1;
    return `
      <li class="admin-ficha" data-i="${i}">
        <div class="admin-ficha-num">
          <span class="mono">${String(n).padStart(2, '0')}</span>
          <div class="admin-ficha-orden">
            <button class="btn btn-icon btn-sm" type="button" data-subir="${i}"
                    aria-label="Subir la ficha ${n}" ${i === 0 ? 'disabled' : ''}>
              ${Icon.get('chevronArriba', 15)}
            </button>
            <button class="btn btn-icon btn-sm" type="button" data-bajar="${i}"
                    aria-label="Bajar la ficha ${n}"
                    ${i === this.borrador.length - 1 ? 'disabled' : ''}>
              ${Icon.get('chevronAbajo', 15)}
            </button>
          </div>
        </div>

        <div class="admin-ficha-campos">
          <div class="grid grid-2" style="gap:0 var(--s-4)">
            <div class="field">
              <label for="af-cifra-${i}">Cifra</label>
              <div class="input-group">
                <input class="input" id="af-cifra-${i}" data-campo="cifra" value="${UI.esc(a.cifra)}"
                       maxlength="10" placeholder="99">
                <span class="addon" style="padding:0">
                  <input class="input" data-campo="unidadCifra" value="${UI.esc(a.unidadCifra || '')}"
                         maxlength="6" placeholder="%" aria-label="Unidad de la cifra"
                         style="width:64px;border:0;background:transparent;text-align:center">
                </span>
              </div>
            </div>
            <div class="field">
              <label for="af-etiqueta-${i}">Etiqueta</label>
              <input class="input" id="af-etiqueta-${i}" data-campo="etiqueta"
                     value="${UI.esc(a.etiqueta || '')}" maxlength="40"
                     placeholder="Contexto nacional">
            </div>
          </div>

          <div class="field">
            <label for="af-titulo-${i}">Titular</label>
            <input class="input" id="af-titulo-${i}" data-campo="titulo"
                   value="${UI.esc(a.titulo || '')}" maxlength="120">
          </div>

          <div class="field">
            <label for="af-texto-${i}">Explicación</label>
            <textarea class="textarea" id="af-texto-${i}" data-campo="texto"
                      maxlength="600" rows="3">${UI.esc(a.texto || '')}</textarea>
            <span class="hint">Sin palabras que haya que buscar en otro lado.</span>
          </div>

          <div class="field" style="margin-bottom:0">
            <label for="af-fuente-${i}">Fuente</label>
            <input class="input" id="af-fuente-${i}" data-campo="fuente"
                   value="${UI.esc(a.fuente || '')}" maxlength="120"
                   placeholder="Organización que publicó el dato">
          </div>
        </div>

        <button class="btn btn-icon" type="button" data-quitar="${i}"
                aria-label="Quitar la ficha ${n}">${Icon.get('basura', 16)}</button>
      </li>`;
  },

  /* ==================================================================
     2. MODERACIÓN DE LA COMPARATIVA (UC8)
     ================================================================== */
  vistaComunidad() {
    const tabla = DB.tablaComunidad();
    const puedeModerar = DB.state.modo === 'nube';

    return `
      <div class="panel">
        <div class="panel-head">
          ${Icon.get('comunidad', 18)}
          <h3>Participantes de la comparativa</h3>
          <span class="tag">${tabla.length} filas</span>
        </div>

        <div class="panel-body" style="padding-bottom:0">
          <div class="notice notice-ok">
            ${Icon.get('escudo', 17)}
            <div>
              <b>Esto es todo lo que un administrador puede ver de otra persona:</b>
              su alias, su provincia y sus totales. Ni nombre, ni correo, ni sus
              registros. No es una limitación del panel: las reglas de Firestore no
              dejan leer los datos de nadie más, y el anonimato del UC8 depende de eso.
            </div>
          </div>
        </div>

        <div class="panel-body">
          ${!puedeModerar ? `
            <div class="notice notice-warn" style="margin-bottom:var(--s-4)">
              ${Icon.get('alerta', 17)}
              <div>Sin conexión con Firebase no hay comunidad real que moderar: lo que
              se lista son los participantes simulados.</div>
            </div>` : ''}

          <div class="table-wrap">
            <table class="data">
              <caption class="sr-only">Participantes de la comparativa comunitaria</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Alias</th>
                  <th scope="col">Provincia</th>
                  <th scope="col" class="align-r">Acciones</th>
                  <th scope="col" class="align-r">CO₂ evitado</th>
                  <th scope="col">Origen</th>
                  <th scope="col"><span class="sr-only">Moderación</span></th>
                </tr>
              </thead>
              <tbody>
                ${tabla.map(c => `
                  <tr class="${c.esYo ? 'is-me' : ''}">
                    <td class="mono">${c.pos}</td>
                    <td><b>${UI.esc(c.alias)}</b>${c.esYo ? ' <span class="tag tag-azul">vos</span>' : ''}</td>
                    <td>${UI.esc(c.zona)}</td>
                    <td class="align-r mono">${c.acciones}</td>
                    <td class="align-r mono"><b>${DB.fmt.n(c.co2, 1)}</b> kg</td>
                    <td>${c.simulado
                          ? '<span class="tag">simulado</span>'
                          : '<span class="tag tag-pine">cuenta real</span>'}</td>
                    <td class="align-r">
                      ${c.simulado || c.esYo || !puedeModerar ? '' : `
                        <button class="btn btn-sm btn-danger" type="button"
                                data-retirar="${UI.esc(c.uid || '')}" data-alias="${UI.esc(c.alias)}">
                          ${Icon.get('basura', 14)}<span>Retirar</span>
                        </button>`}
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <p class="text-sm muted" style="margin:var(--s-3) 0 0">
            Retirar una fila la saca de la comparativa. No borra la cuenta ni sus
            registros: la persona sigue viendo su progreso, solo deja de aparecer en
            el ranking hasta que vuelva a registrar algo.
          </p>
        </div>
      </div>`;
  },

  /* ==================================================================
     3. AUDITORÍA DE FACTORES
     ================================================================== */

  /** Un factor por tipo de acción, con su fuente y su estado. */
  factores() {
    return DB.CAT_LIST.flatMap(c => c.tipos.map(t => {
      const f = DB.fuenteDe(t);
      return {
        categoria: c.nombre, unidad: c.unidad, tipo: t.nombre,
        factor: t.factor, calculo: t.calculo || '',
        sigla: f.sigla, origen: f.origen, verificada: f.verificada,
        url: f.url, autor: f.autor
      };
    }));
  },

  vistaFactores() {
    const lista = this.factores();
    // Primero lo que hay que arreglar: los factores sin contrastar.
    const orden = [...lista].sort((a, b) => (a.verificada ? 1 : 0) - (b.verificada ? 1 : 0));
    const pendientes = lista.filter(f => !f.verificada);
    const deCR = lista.filter(f => f.origen === 'Costa Rica').length;

    return `
      <div class="panel">
        <div class="panel-head">
          ${Icon.get('ojoRevision', 18)}
          <h3>Estado de los factores de emisión</h3>
          <span class="tag ${pendientes.length ? 'tag-ember' : 'tag-pine'}">
            ${pendientes.length ? `${pendientes.length} por verificar` : 'todos verificados'}
          </span>
        </div>

        <div class="panel-body">
          <p class="text-sm" style="max-width:70ch">
            Cada cifra que la aplicación le muestra a alguien sale de multiplicar lo que
            registró por uno de estos números. Un factor sin fuente contrastada no se
            puede citar, y ${deCR} de los ${lista.length} son datos publicados para
            Costa Rica — el resto usa referencias internacionales porque el país no
            publica ese dato, y cada uno explica por qué.
          </p>

          ${pendientes.length ? `
            <div class="notice notice-warn" style="margin:var(--s-4) 0">
              ${Icon.get('alerta', 17)}
              <div>
                <b>Pendiente de trabajo, no un error.</b>
                ${pendientes.map(p => UI.esc(p.tipo)).join(', ')}
                ${pendientes.length === 1 ? 'usa un valor' : 'usan valores'}
                de referencia razonable que todavía no se abrió la fuente para confirmar.
                Aparecen marcados en el reporte para que nadie los cite sin revisarlos.
              </div>
            </div>` : ''}

          <div class="table-wrap">
            <table class="data">
              <caption class="sr-only">Auditoría de los factores de emisión</caption>
              <thead>
                <tr>
                  <th scope="col">Estado</th>
                  <th scope="col">Acción</th>
                  <th scope="col" class="align-r">Factor</th>
                  <th scope="col">Fuente</th>
                  <th scope="col">Cómo se calcula</th>
                </tr>
              </thead>
              <tbody>
                ${orden.map(f => `
                  <tr>
                    <td>${f.verificada
                          ? `<span class="tag tag-pine">${Icon.get('check', 11)} verificado</span>`
                          : `<span class="tag tag-ember">${Icon.get('alerta', 11)} pendiente</span>`}</td>
                    <td><b>${UI.esc(f.tipo)}</b><br><span class="text-sm muted">${UI.esc(f.categoria)}</span></td>
                    <td class="align-r mono" style="white-space:nowrap">
                      ${DB.fmt.n(f.factor, 3)}<br><span class="text-sm muted">kg / ${f.unidad}</span>
                    </td>
                    <td class="text-sm">
                      ${f.url
                        ? `<a href="${UI.esc(f.url)}" target="_blank" rel="noopener">${UI.esc(f.sigla)}
                             ${Icon.get('abrirFuera', 11)}</a>`
                        : UI.esc(f.sigla)}
                      <br><span class="muted">${UI.esc(f.origen)}</span>
                    </td>
                    <td class="text-sm muted">${UI.esc(f.calculo) || '—'}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel-foot" style="display:flex;gap:var(--s-3);align-items:center;flex-wrap:wrap">
          <span class="text-sm">Se puede sacar la tabla para revisarla o adjuntarla al documento.</span>
          <button class="btn btn-sm" type="button" id="admin-csv-factores" style="margin-left:auto">
            ${Icon.get('hojaCalculo', 15)}<span>Descargar la auditoría</span>
          </button>
        </div>
      </div>`;
  },

  /* ==================================================================
     MONTAJE
     ================================================================== */
  mount() {
    /* Cambio de sección: solo se redibuja el cuerpo. Volver a resolver la ruta
       rehacía las tres lecturas de arriba y perdía el borrador. */
    UI.$$('[data-sec]').forEach(b => b.addEventListener('click', () => {
      this.seccion = b.dataset.sec;
      UI.$$('[data-sec]').forEach(o => o.setAttribute('aria-pressed', o === b));
      this.repintarCuerpo();
    }));

    if (this.seccion === 'contenido') this.conectarContenido();
    if (this.seccion === 'comunidad') this.conectarComunidad();
    if (this.seccion === 'factores') this.conectarFactores();
  },

  repintarCuerpo() {
    const caja = document.getElementById('admin-cuerpo');
    if (!caja) return;
    caja.innerHTML = this.cuerpo();
    if (this.seccion === 'contenido') this.conectarContenido();
    if (this.seccion === 'comunidad') this.conectarComunidad();
    if (this.seccion === 'factores') this.conectarFactores();
  },

  /* --- Contenido ----------------------------------------------------- */
  conectarContenido() {
    const fichas = document.getElementById('admin-fichas');
    if (!fichas) return;

    /* Se escribe en el borrador mientras se teclea, pero la lista NO se
       redibuja: hacerlo movería el cursor al final del campo en cada letra.
       Solo se refresca el rótulo de "sin publicar". */
    fichas.addEventListener('input', e => {
      const campo = e.target.closest('[data-campo]');
      if (!campo) return;
      const i = +campo.closest('.admin-ficha').dataset.i;
      this.borrador[i][campo.dataset.campo] = campo.value;
      this.marcarPendiente();
    });

    fichas.addEventListener('click', e => {
      const subir = e.target.closest('[data-subir]');
      const bajar = e.target.closest('[data-bajar]');
      const quitar = e.target.closest('[data-quitar]');

      if (subir) { this.mover(+subir.dataset.subir, -1); return; }
      if (bajar) { this.mover(+bajar.dataset.bajar, 1); return; }
      if (quitar) {
        const i = +quitar.dataset.quitar;
        const a = this.borrador[i];
        UI.modal({
          titulo: '¿Quitar esta ficha?',
          cuerpo: `<p>Se quita <b>${UI.esc(a.titulo || 'la ficha sin titular')}</b> de la
                   pantalla de inicio. Todavía no se publica: podés descartar los cambios.</p>`,
          acciones: [
            { texto: 'Mejor no', clase: 'btn-ghost' },
            { texto: 'Quitar', clase: 'btn-danger', icono: 'basura', onClick: () => {
                this.borrador.splice(i, 1);
                this.repintarCuerpo();
              } }
          ]
        });
      }
    });

    document.getElementById('admin-agregar')?.addEventListener('click', () => {
      this.borrador.push({ cifra: '', unidadCifra: '', titulo: '', texto: '', fuente: '', etiqueta: '' });
      this.repintarCuerpo();
      // El foco va al primer campo de la ficha nueva: es lo que sigue.
      document.querySelector('.admin-ficha:last-child [data-campo="cifra"]')?.focus();
    });

    document.getElementById('admin-descartar')?.addEventListener('click', () => {
      this.borrador = DB.articulos.map(a => ({ ...a }));
      this.repintarCuerpo();
      UI.toast('Cambios descartados', 'Volvió a lo que está publicado ahora.', 'info');
    });

    document.getElementById('admin-fabrica')?.addEventListener('click', () => {
      UI.modal({
        titulo: 'Volver al contenido original',
        cuerpo: `<p>Se reemplaza el borrador por las cuatro fichas con las que viene el
                 sistema. Todavía hay que publicar para que la gente lo vea.</p>`,
        acciones: [
          { texto: 'Cancelar', clase: 'btn-ghost' },
          { texto: 'Traer el original', clase: 'btn-primary', icono: 'recargar', onClick: () => {
              this.borrador = DB.articulosDeFabrica();
              this.repintarCuerpo();
            } }
        ]
      });
    });

    document.getElementById('admin-publicar')?.addEventListener('click', e => this.publicar(e.currentTarget));
  },

  mover(i, paso) {
    const j = i + paso;
    if (j < 0 || j >= this.borrador.length) return;
    [this.borrador[i], this.borrador[j]] = [this.borrador[j], this.borrador[i]];
    this.repintarCuerpo();
    // El foco sigue al botón que se pulsó, ahora en su posición nueva.
    document.querySelector(`[data-${paso < 0 ? 'subir' : 'bajar'}="${j}"]`)?.focus();
  },

  /** Solo repinta el aviso de cambios sin publicar, sin tocar los campos. */
  marcarPendiente() {
    const cambiado = JSON.stringify(this.borrador) !== JSON.stringify(DB.articulos);
    const publicar = document.getElementById('admin-publicar');
    const descartar = document.getElementById('admin-descartar');
    if (publicar) publicar.disabled = !cambiado;
    if (descartar) descartar.disabled = !cambiado;
    const etiqueta = document.querySelector('#admin-cuerpo .panel-head .tag');
    if (etiqueta) {
      etiqueta.className = 'tag ' + (cambiado ? 'tag-ochre' : 'tag-pine');
      etiqueta.textContent = cambiado ? 'Sin publicar' : 'Publicado';
    }
  },

  /* Validación del contenido antes de publicarlo.

     Es la contraparte del RF-03: la pantalla de inicio ya sabe avisar si el
     contenido llega vacío, pero lo correcto es no dejar publicar el vacío. Una
     ficha sin titular o sin fuente no informa a nadie. */
  publicar(boton) {
    const problemas = [];
    this.borrador.forEach((a, i) => {
      const n = i + 1;
      if (!String(a.titulo || '').trim()) problemas.push(`La ficha ${n} no tiene titular.`);
      if (!String(a.texto || '').trim()) problemas.push(`La ficha ${n} no tiene explicación.`);
      if (!String(a.fuente || '').trim()) problemas.push(`La ficha ${n} no dice de dónde sale el dato.`);
      if (!String(a.cifra || '').trim()) problemas.push(`La ficha ${n} no tiene cifra.`);
    });

    if (!this.borrador.length) {
      problemas.push('No queda ninguna ficha: la pantalla de inicio quedaría sin contenido.');
    }

    if (problemas.length) {
      UI.modal({
        titulo: 'Falta algo antes de publicar',
        cuerpo: `
          <p>Esto lo va a leer todo el mundo, así que ninguna ficha puede salir
             a medias:</p>
          <ul class="lista-problemas">
            ${problemas.slice(0, 8).map(p => `<li>${UI.esc(p)}</li>`).join('')}
          </ul>
          ${problemas.length > 8
            ? `<p class="text-sm muted">…y ${problemas.length - 8} cosas más.</p>` : ''}`,
        acciones: [{ texto: 'Lo reviso', clase: 'btn-primary' }]
      });
      return;
    }

    UI.modal({
      titulo: '¿Publicar el contenido?',
      cuerpo: `<p>Las ${this.borrador.length} fichas pasan a ser lo que ve
               <b>toda la gente</b> al abrir la pantalla de inicio, ahora mismo.</p>
               <p class="text-sm muted">Se puede volver a editar cuando sea.</p>`,
      acciones: [
        { texto: 'Cancelar', clase: 'btn-ghost' },
        { texto: 'Publicar', clase: 'btn-primary', icono: 'guardar', onClick: () => {
            const limpio = this.borrador.map(a => ({
              cifra: String(a.cifra).trim(),
              unidadCifra: String(a.unidadCifra || '').trim(),
              titulo: String(a.titulo).trim(),
              texto: String(a.texto).trim(),
              fuente: String(a.fuente).trim(),
              etiqueta: String(a.etiqueta || '').trim() || 'Información ambiental'
            }));

            if (!DB.guardarArticulos(limpio)) {
              UI.toast('No se pudo publicar',
                'Esta sesión no tiene permisos de administración.', 'error', 7000);
              return;
            }
            this.borrador = DB.articulos.map(a => ({ ...a }));
            UI.toast('Contenido publicado',
              `${limpio.length} fichas. Ya es lo que se ve en la pantalla de inicio.`);
            this.repintarCuerpo();
            Fiesta.confeti({ cantidad: 60 });
          } }
      ]
    });
    void boton;
  },

  /* --- Comunidad ----------------------------------------------------- */
  conectarComunidad() {
    UI.$$('[data-retirar]').forEach(b => b.addEventListener('click', () => {
      const uid = b.dataset.retirar;
      const alias = b.dataset.alias;
      if (!uid) {
        UI.toast('No se puede retirar', 'Esa fila no tiene una cuenta detrás.', 'error');
        return;
      }
      UI.modal({
        titulo: 'Retirar de la comparativa',
        cuerpo: `
          <p>Se saca <b>${UI.esc(alias)}</b> de la tabla de la comunidad.</p>
          <p class="text-sm muted">No se borra la cuenta ni sus registros: esa persona
             sigue viendo su progreso normalmente. Volverá a aparecer en cuanto registre
             una acción nueva, porque la fila se vuelve a publicar sola.</p>`,
        acciones: [
          { texto: 'Cancelar', clase: 'btn-ghost' },
          { texto: 'Retirar', clase: 'btn-danger', icono: 'basura', onClick: () => {
              if (!DB.moderarComunidad(uid)) {
                UI.toast('No se pudo retirar',
                  'Esta sesión no tiene permisos de moderación.', 'error', 7000);
                return;
              }
              UI.toast('Fila retirada', `${alias} ya no aparece en la comparativa.`, 'info');
              this.repintarCuerpo();
            } }
        ]
      });
    }));
  },

  /* --- Factores ------------------------------------------------------ */
  conectarFactores() {
    document.getElementById('admin-csv-factores')?.addEventListener('click', () => {
      const campos = ['estado', 'categoria', 'tipo', 'factor', 'unidad', 'sigla', 'origen', 'autor', 'calculo', 'url'];
      const celda = v => {
        const s = String(v ?? '');
        return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const filas = this.factores().map(f => campos.map(c => celda(
        c === 'estado' ? (f.verificada ? 'verificado' : 'pendiente') : f[c]
      )).join(';'));
      UI.descargar(UI.nombreArchivo('auditoria-factores-emision', 'csv'),
        '﻿' + [campos.join(';'), ...filas].join('\r\n'), 'text/csv;charset=utf-8');
      UI.toast('Auditoría descargada',
        `${filas.length} factores con su fuente y su estado de verificación.`, 'info');
    });
  }
};

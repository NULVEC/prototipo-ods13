/* ============================================================================
   router.js — Enrutador por fragmento (#/ruta) y armazón de la aplicación.

   Sin backend: cada caso de uso es una ruta, y la navegación real ocurre con
   clics. Las rutas privadas exigen sesión; si no la hay, redirigen a UC2.

   ----------------------------------------------------------------------------
   EL ARMAZÓN SE CONSTRUYE UNA VEZ

   Antes cada navegación reescribía `#app` entero: barra lateral, cabecera,
   cinta de carbono y contenido. Eso significaba, en cada clic del menú,
   rehacer unos 130 elementos que no habían cambiado, volver a lanzar la
   animación de entrada de las 90 barras de la cinta, perder el
   desplazamiento de la barra lateral y devolver el foco al principio del
   documento.

   Ahora el armazón se monta la primera vez y después solo se reemplaza el
   contenido. Lo que cambia se actualiza en su sitio: el título, la etiqueta
   del caso de uso, el elemento marcado del menú, el contador de avisos y la
   meta del mes. La cinta se redibuja únicamente si los registros cambiaron —
   y para saberlo se compara una firma, no la lista entera.

   El resultado se nota en dos cosas concretas: la navegación deja de
   parpadear, y la cinta deja de reanimarse cada vez que uno cambia de
   pantalla, que era lo que hacía que la aplicación pareciera recargarse.
   ========================================================================= */

const Router = (() => {

  /* Mapa de rutas. El título es el que lee la persona, en palabras normales;
     `uc` se muestra al lado en la barra superior para que el prototipo siga
     siendo trazable contra la tabla de casos de uso del Avance 3. Los dos
     conviven: el número no estorba a quien no lo necesita.

     `permiso` marca las rutas que además de sesión exigen una capacidad. */
  const RUTAS = {
    '/registro':      { uc: 'UC1',  titulo: 'Crear cuenta',     publico: true, pantalla: 'registro' },
    '/acceso':        { uc: 'UC2',  titulo: 'Iniciar sesión',   publico: true, pantalla: 'acceso' },
    '/inicio':        { uc: 'UC3',  titulo: 'Inicio',           pantalla: 'inicio' },
    '/nueva-accion':  { uc: 'UC4',  titulo: 'Registrar acción', pantalla: 'accion' },
    '/progreso':      { uc: 'UC5',  titulo: 'Mi progreso',      pantalla: 'progreso' },
    '/notificaciones':{ uc: 'UC6',  titulo: 'Notificaciones',   pantalla: 'notificaciones' },
    '/insignias':     { uc: 'UC7',  titulo: 'Mis insignias',    pantalla: 'insignias' },
    '/comunidad':     { uc: 'UC8',  titulo: 'Comunidad',        pantalla: 'comunidad' },
    '/reporte':       { uc: 'UC9',  titulo: 'Mi reporte',       pantalla: 'reporte' },
    '/perfil':        { uc: 'UC10', titulo: 'Perfil',           pantalla: 'perfil' },
    '/admin':         { uc: 'ADM',  titulo: 'Administración',   pantalla: 'admin',
                        permiso: 'admin.entrar' }
  };

  /* Navegación lateral, agrupada por intención y no por número de caso.
     Un grupo puede exigir un permiso: si la sesión no lo tiene, no se dibuja. */
  const NAV = [
    { grupo: 'Seguimiento', items: [
      { ruta: '/inicio',        icono: 'inicio',    texto: 'Inicio' },
      { ruta: '/nueva-accion',  icono: 'accion',    texto: 'Registrar algo' },
      { ruta: '/progreso',      icono: 'progreso',  texto: 'Mi progreso' }
    ]},
    { grupo: 'Resultados', items: [
      { ruta: '/insignias',     icono: 'insignia',  texto: 'Insignias' },
      { ruta: '/comunidad',     icono: 'comunidad', texto: 'Comunidad' },
      { ruta: '/reporte',       icono: 'reporte',   texto: 'Mi reporte' }
    ]},
    { grupo: 'Cuenta', items: [
      { ruta: '/notificaciones',icono: 'campana',   texto: 'Notificaciones', contador: true },
      { ruta: '/perfil',        icono: 'perfil',    texto: 'Perfil' }
    ]},
    { grupo: 'Administración', permiso: 'admin.entrar', items: [
      { ruta: '/admin',         icono: 'admin',     texto: 'Panel de control' }
    ]}
  ];

  const app = () => document.getElementById('app');

  /* Estado del armazón. `firmaNav` recuerda con qué papel se dibujó el menú:
     si la persona entra como administradora, el grupo nuevo tiene que
     aparecer sin recargar la página. */
  let armazon = null;
  let firmaNav = '';
  let firmaCinta = '';
  let rutaPintada = null;

  function ir(ruta) {
    if (location.hash === '#' + ruta) resolver();
    else location.hash = ruta;
  }

  /* ==================================================================
     PIEZAS DEL ARMAZÓN
     ================================================================== */

  /** Los grupos del menú que la sesión actual tiene permitido ver. */
  const navVisible = () => NAV.filter(g => !g.permiso || DB.puede(g.permiso));

  function marcaNav() {
    return navVisible().map(g => `
      <div class="nav-group">
        <span class="label-micro">${g.grupo}</span>
        ${g.items.map(i => `
          <a class="nav-item" href="#${i.ruta}" data-ruta="${i.ruta}">
            ${Icon.get(i.icono, 17)}
            <span>${i.texto}</span>
            ${i.contador ? `<span class="nav-count" hidden></span>` : ''}
          </a>`).join('')}
      </div>`).join('');
  }

  /* Avance de la meta mensual, al pie de la navegación. Ocupa el espacio
     libre de la barra lateral con el dato que el usuario más consulta. */
  function metaLateral() {
    const u = DB.state.usuario;
    const mes = DB.state.registros.filter(r => r.fecha.slice(0, 7) === DB.hoyISO().slice(0, 7));
    const co2 = DB.sumaCO2(mes);
    const meta = Math.max(1, +u.meta || 1);
    const pct = Math.min(100, Math.round(co2 / meta * 100));
    const nombreMes = new Date().toLocaleDateString('es-CR', { month: 'long' });
    return `
      <span class="label-micro">Meta de ${nombreMes}</span>
      <p class="cifra"><span class="num">${DB.fmt.n(co2, 1)}</span> / ${meta} kg</p>
      <div class="bar is-azul" style="--p:${pct}%" role="progressbar"
           aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
           aria-valuetext="${DB.fmt.n(co2, 1)} de ${meta} kg"
           aria-label="Avance de la meta mensual"><i></i></div>`;
  }

  /** La ficha de la persona al pie de la barra lateral. */
  function marcaUsuario() {
    const u = DB.state.usuario;
    const admin = DB.esAdmin();
    return `
      <button class="sidebar-user" type="button" data-ir="/perfil"
              aria-label="Abrir mi perfil">
        <span class="avatar">${DB.fmt.iniciales(u.nombre)}</span>
        <span class="who">
          <b>${UI.esc(u.nombre.split(' ').slice(0, 2).join(' '))}</b>
          <span>${admin ? 'Administración' : UI.esc(u.alias)}</span>
        </span>
        ${admin ? `<span class="marca-rol" title="Sesión con permisos de administración"
                         aria-label="Sesión con permisos de administración">${Icon.get('admin', 14)}</span>` : ''}
      </button>`;
  }

  /* ------------------------------------------------------------------ */
  /* Armazón privado: barra lateral + cabecera + cinta + contenido       */
  /* Se construye UNA vez. `refrescarArmazon()` mantiene lo que cambia.  */
  /* ------------------------------------------------------------------ */
  function montarArmazon() {
    app().innerHTML = `
      <div class="app-shell">
        <button class="scrim" type="button" aria-label="Cerrar el menú" data-cerrar-nav></button>

        <aside class="sidebar" id="nav-lateral">
          <div class="sidebar-brand">
            <span class="mark">${Icon.mark(19)}</span>
            <span>
              <span class="name">Registro y Seguimiento<br>de Acciones Climáticas</span>
              <span class="ods">ODS 13</span>
            </span>
          </div>

          <nav class="sidebar-nav" aria-label="Navegación principal" id="nav-grupos">${marcaNav()}</nav>

          <div class="sidebar-meta" id="sidebar-meta">${metaLateral()}</div>

          <div class="sidebar-foot" id="sidebar-foot">
            ${marcaUsuario()}
            <a class="nav-item" href="#/acceso" data-salir style="margin-top:4px">
              ${Icon.get('salir', 17)}<span>Cerrar sesión</span>
            </a>
          </div>
        </aside>

        <div class="app-main">
          <header class="topbar">
            <button class="btn btn-icon menu-toggle" type="button" aria-label="Abrir el menú"
                    aria-controls="nav-lateral" aria-expanded="false" data-abrir-nav>${Icon.get('menu', 20)}</button>
            <h1 id="titulo-pantalla"></h1>
            <span class="uc-tag" id="uc-pantalla"></span>
            <div class="topbar-actions">
              <button class="btn btn-sm btn-ghost abrir-paleta" type="button" data-paleta
                      aria-label="Buscar e ir a cualquier parte">
                ${Icon.get('buscar', 15)}<span class="solo-ancho">Buscar</span>
                <kbd class="tecla">${UI.teclaMando()} K</kbd>
              </button>
              <button class="btn btn-icon" type="button" data-cambiar-tema
                      aria-label="Cambiar el tema"></button>
              <button class="btn btn-sm btn-ghost solo-ancho" type="button" data-como-funciona>
                ${Icon.get('info', 16)}<span>¿Cómo funciona?</span>
              </button>
              <a class="btn btn-icon" href="#/notificaciones" id="campana-topbar">
                ${Icon.get('campana', 19)}
              </a>
              <a class="btn btn-primary btn-sm" href="#/nueva-accion">
                ${Icon.get('accion', 16)}<span class="solo-ancho">Nueva acción</span>
              </a>
            </div>
          </header>

          <div id="zona-cinta"></div>

          <main class="content grid-paper" id="contenido" tabindex="-1"></main>
        </div>
      </div>`;

    armazon = {
      titulo: document.getElementById('titulo-pantalla'),
      uc: document.getElementById('uc-pantalla'),
      nav: document.getElementById('nav-grupos'),
      meta: document.getElementById('sidebar-meta'),
      pie: document.getElementById('sidebar-foot'),
      cinta: document.getElementById('zona-cinta'),
      contenido: document.getElementById('contenido'),
      campana: document.getElementById('campana-topbar')
    };
    firmaNav = firmaDeNav();
    firmaCinta = '';
    conectarArmazon();
    UI.pintarBotonTema();
  }

  /* Con qué papel y con qué grupos se dibujó el menú. */
  const firmaDeNav = () => DB.rol() + '|' + navVisible().map(g => g.grupo).join(',');

  /* Firma de los datos que alimentan la cinta. Si no cambió, la cinta no se
     toca: es lo que evita que sus 90 barras se vuelvan a animar en cada clic
     del menú. Basta con el número de registros y el último día con actividad;
     cualquier alta o baja mueve una de las dos cosas. */
  function firmaDeCinta() {
    const r = DB.state.registros;
    let ultima = '';
    for (const x of r) if (x.fecha > ultima) ultima = x.fecha;
    return `${r.length}|${ultima}|${DB.hoyISO()}`;
  }

  /* Contador de avisos sin leer, en el menú y en la campana. Se expone porque
     la pantalla de notificaciones lo necesita al marcar algo como leído: sin
     esto, el globo del menú seguiría diciendo "3" con la bandeja ya vacía, y
     la única forma de corregirlo era redibujar la pantalla completa. */
  function refrescarAvisos() {
    if (!armazon) return;
    const sinLeer = DB.noLeidas();

    const globo = armazon.nav.querySelector('.nav-count');
    if (globo) {
      globo.hidden = !sinLeer;
      globo.textContent = sinLeer || '';
      globo.setAttribute('aria-label', `${sinLeer} sin leer`);
    }

    armazon.campana.setAttribute('aria-label',
      'Notificaciones' + (sinLeer ? `, ${sinLeer} sin leer` : ''));
    const punto = armazon.campana.querySelector('.dot');
    if (sinLeer && !punto) armazon.campana.insertAdjacentHTML('beforeend', '<span class="dot"></span>');
    if (!sinLeer && punto) punto.remove();
  }

  /** Pone al día las partes del armazón que dependen de los datos. */
  function refrescarArmazon(ruta, cfg) {
    // El menú solo se rehace si cambió el papel (por ejemplo, entró un admin).
    if (firmaDeNav() !== firmaNav) {
      armazon.nav.innerHTML = marcaNav();
      armazon.pie.querySelector('.sidebar-user')?.replaceWith(
        document.createRange().createContextualFragment(marcaUsuario()).firstElementChild);
      firmaNav = firmaDeNav();
    }

    armazon.titulo.textContent = cfg.titulo;
    armazon.uc.textContent = cfg.uc;

    // Marca de página actual, sin volver a crear los enlaces.
    armazon.nav.querySelectorAll('.nav-item').forEach(a => {
      if (a.dataset.ruta === ruta) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    refrescarAvisos();
    armazon.meta.innerHTML = metaLateral();

    if (firmaDeCinta() !== firmaCinta) {
      armazon.cinta.innerHTML = UI.cintaCarbono(90);
      UI.conectarCinta(armazon.cinta);
      firmaCinta = firmaDeCinta();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Resolución de la ruta actual                                        */
  /* ------------------------------------------------------------------ */
  function resolver() {
    const ruta = location.hash.replace(/^#/, '') || (DB.state.autenticado ? '/inicio' : '/acceso');
    const cfg = RUTAS[ruta];

    if (!cfg) { ir(DB.state.autenticado ? '/inicio' : '/acceso'); return; }
    if (!cfg.publico && !DB.state.autenticado) { ir('/acceso'); return; }
    // Con sesión abierta no tiene sentido volver a los formularios de acceso.
    if (cfg.publico && DB.state.autenticado) { ir('/inicio'); return; }

    /* Guardia de permisos. Que la ruta exista y haya sesión no basta: hay que
       tener la capacidad. Se explica en lugar de rebotar en silencio, porque
       un enlace guardado en favoritos o un enlace compartido llegan aquí y
       "no pasa nada al pulsar" es el peor mensaje posible. */
    if (cfg.permiso && !DB.puede(cfg.permiso)) {
      ir('/inicio');
      UI.toast('No tenés acceso a esa pantalla',
        `«${cfg.titulo}» es solo para las cuentas con permisos de administración.`,
        'error', 6000);
      return;
    }

    const pantalla = Screens[cfg.pantalla];
    if (!pantalla) {
      console.error('Pantalla no registrada:', cfg.pantalla);
      ir(DB.state.autenticado ? '/inicio' : '/acceso');
      return;
    }

    Charts.destruirTodo();
    /* Libera los contextos WebGL antes de cambiar de pantalla. El navegador
       solo permite unos pocos a la vez, y uno abandonado no se recupera. */
    window.Vistas3D?.destruirTodo();
    Fiesta.limpiar();
    cerrarNav();

    document.title = `${cfg.titulo} · Acciones Climáticas ODS 13`;

    /* Las pantallas públicas no llevan armazón: ocupan la ventana entera. Al
       salir de ellas hay que volver a montarlo. */
    if (cfg.publico) {
      armazon = null;
      app().innerHTML = pantalla.render();
      pintarDespues(pantalla, cfg, ruta);
      return;
    }

    if (!armazon || !document.getElementById('contenido')) montarArmazon();
    refrescarArmazon(ruta, cfg);

    /* La transición entre pantallas la hace el navegador cuando sabe hacerla:
       captura el antes y el después y los mezcla. Donde no exista la API,
       queda la animación de entrada de siempre, que sigue siendo suficiente. */
    const pintar = () => {
      armazon.contenido.innerHTML = pantalla.render();
      armazon.contenido.classList.remove('view-enter');
      // Reinicia la animación sin esperar un cuadro completo.
      void armazon.contenido.offsetWidth;
      armazon.contenido.classList.add('view-enter');
    };

    const conTransicion = document.startViewTransition &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      rutaPintada !== null && rutaPintada !== ruta;

    /* ------------------------------------------------------------------
       OJO CON EL ORDEN: `startViewTransition` es asíncrona.

       No ejecuta su función de inmediato: primero fotografía el estado
       actual y recién en un cuadro posterior llama a la función que cambia
       el árbol. Así que `pintarDespues` —que es quien monta gráficos y
       escenas 3D— NO puede ir justo detrás: se ejecutaría contra el árbol
       VIEJO, montaría los lienzos en nodos que están a punto de
       desaparecer, y la pantalla quedaría con el texto de carga puesto y
       dos contextos WebGL colgando de nodos sueltos.

       `updateCallbackDone` resuelve cuando la función ya corrió y el árbol
       nuevo está en su sitio; ahí sí se puede medir y montar.
       ------------------------------------------------------------------ */
    if (conTransicion) {
      /* Una transición se puede SALTAR —pasa al navegar rápido, o si la
         pestaña se esconde a medias— y entonces `updateCallbackDone` se
         rechaza con AbortError. Eso no es un fallo: es el navegador diciendo
         "no me da tiempo a animar". Pero hay que asegurarse de que el árbol
         quedó pintado y de montar UNA sola vez; montar dos veces dejaría dos
         contextos WebGL y los oyentes duplicados.

         `pintarUnaVez` lo resuelve siendo idempotente: da igual si la llamó el
         navegador o si hay que llamarla a mano. */
      let pintado = false;
      const pintarUnaVez = () => { if (pintado) return; pintado = true; pintar(); };

      const transicion = document.startViewTransition(pintarUnaVez);

      /* Una transición expone tres promesas y las tres se rechazan al saltarse.
         Las que no se usan hay que silenciarlas igual: una promesa rechazada sin
         nadie escuchando se reporta en la consola como error, y ver
         "AbortError" al navegar rápido parece un fallo cuando no lo es. */
      transicion.ready.catch(() => {});
      transicion.finished.catch(() => {});

      transicion.updateCallbackDone
        .catch(() => { /* saltada: el árbol se pinta abajo de todas formas */ })
        .then(() => {
          pintarUnaVez();
          pintarDespues(pantalla, cfg, ruta);
        });
      return;
    }

    pintar();
    pintarDespues(pantalla, cfg, ruta);
  }

  /** Lo que hay que hacer después de escribir el contenido de una pantalla. */
  function pintarDespues(pantalla, cfg, ruta) {
    conectarContenido();
    try {
      pantalla.mount?.();
    } catch (e) {
      /* Un fallo al montar no puede dejar la aplicación muda: se avisa y la
         pantalla queda al menos legible. */
      console.error(`Fallo al montar «${cfg.titulo}»:`, e);
      UI.toast('Algo falló al abrir la pantalla',
        'El contenido se muestra igual, pero puede que algún control no responda.',
        'error', 7000);
    }
    Fiesta.contarTodo();
    Presentacion.actualizar();

    rutaPintada = ruta;
    window.scrollTo({ top: 0 });
    // Se anuncia el cambio de pantalla a los lectores de pantalla.
    const aviso = document.getElementById('anuncio-ruta');
    if (aviso) aviso.textContent = `${cfg.titulo}${cfg.uc !== 'ADM' ? `, caso de uso ${cfg.uc}` : ''}`;
  }

  /* ==================================================================
     MENÚ EN PANTALLAS ANGOSTAS

     El panel deslizante es una trampa de accesibilidad si se hace a
     medias: sin encerrar el foco, tabular desde el último enlace lleva
     al contenido que está detrás del velo, y quien navega con lector de
     pantalla se pierde. Se resuelve aquí, una vez, y no en cada pantalla.
     ================================================================== */
  let foco = null;

  function abrirNav() {
    if (document.body.classList.contains('nav-open')) return;
    foco = document.activeElement;
    document.body.classList.add('nav-open');
    document.querySelector('[data-abrir-nav]')?.setAttribute('aria-expanded', 'true');
    document.querySelector('.sidebar .nav-item')?.focus();
  }

  function cerrarNav({ devolverFoco = false } = {}) {
    if (!document.body.classList.contains('nav-open')) return;
    document.body.classList.remove('nav-open');
    document.querySelector('[data-abrir-nav]')?.setAttribute('aria-expanded', 'false');
    if (devolverFoco) foco?.focus?.();
    foco = null;
  }

  /* Comportamientos del armazón. Se conectan UNA vez, al montarlo. */
  function conectarArmazon() {
    const barra = document.querySelector('.sidebar');

    document.querySelector('[data-abrir-nav]')?.addEventListener('click', abrirNav);
    document.querySelector('[data-cerrar-nav]')?.addEventListener('click',
      () => cerrarNav({ devolverFoco: true }));

    /* El foco no sale del panel mientras está abierto. */
    barra?.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || !document.body.classList.contains('nav-open')) return;
      const focos = UI.focosDe(barra);
      if (!focos.length) return;
      const primero = focos[0], ultimo = focos[focos.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    });
  }

  /* Comportamientos que pertenecen al contenido y se rehacen con él.
     Los `data-*` compartidos van por delegación desde el documento (ver
     `conectarUnaVez`), así que aquí solo queda lo que necesita el nodo. */
  function conectarContenido() {
    UI.conectarRevelar(armazon?.contenido || document);
  }

  /* ==================================================================
     DELEGACIÓN GLOBAL
     Un solo oyente en el documento para los `data-*` que aparecen en
     cualquier pantalla. Antes se volvían a enlazar en cada render, lo
     que multiplicaba oyentes cada vez que una pantalla se redibujaba.
     ================================================================== */
  function conectarUnaVez() {
    document.addEventListener('click', e => {
      const ir_ = e.target.closest('[data-ir]');
      if (ir_) { ir(ir_.dataset.ir); return; }

      if (e.target.closest('[data-como-funciona]')) { Explicador.abrir(); return; }
      if (e.target.closest('[data-paleta]')) { Paleta.abrir(); return; }

      if (e.target.closest('[data-cambiar-tema]')) { UI.alternarTema(); return; }

      const nav = e.target.closest('.sidebar .nav-item');
      if (nav && !nav.hasAttribute('data-salir')) cerrarNav();

      const salir = e.target.closest('[data-salir]');
      if (salir) { e.preventDefault(); cerrarSesion(); }
    });

    window.addEventListener('hashchange', resolver);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') cerrarNav({ devolverFoco: true });
    });
  }

  async function cerrarSesion() {
    if (DB.state.modo === 'nube' && window.Nube && DB.state.uid) {
      try {
        await Nube.salir();   // `onAuthStateChanged` limpia y redibuja
        UI.toast('Sesión cerrada', 'Tus registros quedan guardados en tu cuenta.', 'info');
      } catch (err) {
        UI.toast('No se pudo cerrar la sesión', Nube.traducir(err), 'error');
      }
      return;
    }
    DB.state.autenticado = false;
    DB.persistir();
    armazon = null;
    ir('/acceso');
    UI.toast('Sesión cerrada', 'Tus registros quedan guardados en este dispositivo.', 'info');
  }

  /** Fuerza a rehacer el armazón: lo llama el cambio de sesión. */
  function invalidarArmazon() { armazon = null; firmaNav = ''; firmaCinta = ''; }

  function iniciar() {
    conectarUnaVez();
    Presentacion.iniciar();
    Paleta.iniciar();
    /* Al cambiar de tema, los gráficos y las escenas 3D guardan sus colores y
       no los releen: hay que volver a dibujar la pantalla. */
    Tema.alCambiar(() => { Charts.reset(); resolver(); UI.pintarBotonTema(); });
    resolver();
    Explicador.siEsLaPrimeraVez();
  }

  return { RUTAS, NAV, ir, iniciar, resolver, invalidarArmazon, cerrarNav,
           refrescarAvisos, refrescarMeta: () => { if (armazon) armazon.meta.innerHTML = metaLateral(); },
           /* La cinta se redibuja a petición cuando cambian los registros: la
              usa UC4 al guardar una acción, para que la traza incluya el día
              de hoy sin tener que rehacer la pantalla. */
           refrescarCinta: () => {
             if (!armazon) return;
             armazon.cinta.innerHTML = UI.cintaCarbono(90);
             UI.conectarCinta(armazon.cinta);
             firmaCinta = firmaDeCinta();
           } };
})();

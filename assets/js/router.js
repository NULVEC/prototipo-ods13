/* ============================================================================
   router.js — Enrutador por fragmento (#/ruta) y armazón de la aplicación.

   Sin backend: cada caso de uso es una ruta, y la navegación real ocurre con
   clics. Las rutas privadas exigen sesión; si no la hay, redirigen a UC2.
   ========================================================================= */

const Router = (() => {

  /* Mapa de rutas. `uc` se muestra en la barra superior para que el
     prototipo sea trazable contra la tabla de casos de uso del Avance 3. */
  const RUTAS = {
    '/registro':      { uc: 'UC1', titulo: 'Crear cuenta',            publico: true,  pantalla: 'registro' },
    '/acceso':        { uc: 'UC2', titulo: 'Iniciar sesión',          publico: true,  pantalla: 'acceso' },
    '/inicio':        { uc: 'UC3', titulo: 'Inicio',                  pantalla: 'inicio' },
    '/nueva-accion':  { uc: 'UC4', titulo: 'Registrar acción',        pantalla: 'accion' },
    '/progreso':      { uc: 'UC5', titulo: 'Progreso personal',       pantalla: 'progreso' },
    '/notificaciones':{ uc: 'UC6', titulo: 'Notificaciones',          pantalla: 'notificaciones' },
    '/insignias':     { uc: 'UC7', titulo: 'Insignias y logros',      pantalla: 'insignias' },
    '/comunidad':     { uc: 'UC8', titulo: 'Comparativa comunitaria', pantalla: 'comunidad' },
    '/reporte':       { uc: 'UC9', titulo: 'Reporte de emisiones',    pantalla: 'reporte' },
    '/perfil':        { uc: 'UC10',titulo: 'Perfil',                  pantalla: 'perfil' }
  };

  /* Navegación lateral, agrupada por intención y no por número de caso. */
  const NAV = [
    { grupo: 'Seguimiento', items: [
      { ruta: '/inicio',        icono: 'inicio',    texto: 'Inicio' },
      { ruta: '/nueva-accion',  icono: 'accion',    texto: 'Registrar acción' },
      { ruta: '/progreso',      icono: 'progreso',  texto: 'Mi progreso' }
    ]},
    { grupo: 'Resultados', items: [
      { ruta: '/insignias',     icono: 'insignia',  texto: 'Insignias' },
      { ruta: '/comunidad',     icono: 'comunidad', texto: 'Comunidad' },
      { ruta: '/reporte',       icono: 'reporte',   texto: 'Reporte de emisiones' }
    ]},
    { grupo: 'Cuenta', items: [
      { ruta: '/notificaciones',icono: 'campana',   texto: 'Notificaciones', contador: true },
      { ruta: '/perfil',        icono: 'perfil',    texto: 'Perfil' }
    ]}
  ];

  const app = () => document.getElementById('app');

  function ir(ruta) {
    if (location.hash === '#' + ruta) resolver();
    else location.hash = ruta;
  }

  /* Avance de la meta mensual, al pie de la navegación. Ocupa el espacio
     libre de la barra lateral con el dato que el usuario más consulta. */
  function metaLateral() {
    const u = DB.state.usuario;
    const mes = DB.state.registros.filter(r => r.fecha.slice(0, 7) === DB.hoyISO().slice(0, 7));
    const co2 = DB.sumaCO2(mes);
    const pct = Math.min(100, Math.round(co2 / u.meta * 100));
    return `
      <div class="sidebar-meta">
        <span class="label-micro">Meta de ${new Date().toLocaleDateString('es-CR', { month: 'long' })}</span>
        <p class="cifra"><span class="num">${DB.fmt.n(co2, 1)}</span> / ${u.meta} kg</p>
        <div class="bar is-azul" style="--p:${pct}%" role="progressbar"
             aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
             aria-label="Avance de la meta mensual"><i></i></div>
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Armazón privado: barra lateral + cabecera + cinta + contenido       */
  /* ------------------------------------------------------------------ */
  function armazon(rutaActual, cfg, contenido) {
    const u = DB.state.usuario;
    const sinLeer = DB.noLeidas();

    const nav = NAV.map(g => `
      <div class="nav-group">
        <span class="label-micro">${g.grupo}</span>
        ${g.items.map(i => `
          <a class="nav-item" href="#${i.ruta}"
             ${i.ruta === rutaActual ? 'aria-current="page"' : ''}>
            ${Icon.get(i.icono, 17)}
            <span>${i.texto}</span>
            ${i.contador && sinLeer ? `<span class="nav-count" aria-label="${sinLeer} sin leer">${sinLeer}</span>` : ''}
          </a>`).join('')}
      </div>`).join('');

    return `
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

          <nav class="sidebar-nav" aria-label="Navegación principal">${nav}</nav>

          ${metaLateral()}

          <div class="sidebar-foot">
            <button class="sidebar-user" type="button" data-ir="/perfil">
              <span class="avatar">${DB.fmt.iniciales(u.nombre)}</span>
              <span class="who">
                <b>${UI.esc(u.nombre.split(' ').slice(0, 2).join(' '))}</b>
                <span>${UI.esc(u.alias)}</span>
              </span>
            </button>
            <a class="nav-item" href="#/acceso" data-salir style="margin-top:4px">
              ${Icon.get('salir', 17)}<span>Cerrar sesión</span>
            </a>
          </div>
        </aside>

        <div class="app-main">
          <header class="topbar">
            <button class="btn btn-icon menu-toggle" type="button" aria-label="Abrir el menú"
                    aria-controls="nav-lateral" data-abrir-nav>${Icon.get('menu', 20)}</button>
            <h1>${cfg.titulo}</h1>
            <span class="uc-tag">${cfg.uc}</span>
            <div class="topbar-actions">
              <a class="btn btn-icon" href="#/notificaciones" aria-label="Notificaciones${sinLeer ? `, ${sinLeer} sin leer` : ''}">
                ${Icon.get('campana', 19)}${sinLeer ? '<span class="dot"></span>' : ''}
              </a>
              <a class="btn btn-primary btn-sm" href="#/nueva-accion">
                ${Icon.get('accion', 16)}<span>Nueva acción</span>
              </a>
            </div>
          </header>

          ${UI.cintaCarbono(90)}

          <main class="content grid-paper view-enter" id="contenido" tabindex="-1">${contenido}</main>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Resolución de la ruta actual                                        */
  /* ------------------------------------------------------------------ */
  function resolver() {
    const ruta = location.hash.replace(/^#/, '') || (DB.state.autenticado ? '/inicio' : '/acceso');
    const cfg = RUTAS[ruta];

    if (!cfg) { ir(DB.state.autenticado ? '/inicio' : '/acceso'); return; }
    if (!cfg.publico && !DB.state.autenticado) { ir('/acceso'); return; }
    if (cfg.publico && DB.state.autenticado && ruta !== '/acceso') { /* se permite ver el registro */ }

    Charts.destruirTodo();
    document.body.classList.remove('nav-open');

    const pantalla = Screens[cfg.pantalla];
    if (!pantalla) { app().innerHTML = '<p style="padding:2rem">Pantalla no disponible.</p>'; return; }

    const html = pantalla.render();
    app().innerHTML = cfg.publico ? html : armazon(ruta, cfg, html);
    document.title = `${cfg.titulo} · Acciones Climáticas ODS 13`;

    conectarGlobales();
    pantalla.mount?.();

    window.scrollTo({ top: 0 });
    // Se anuncia el cambio de pantalla a los lectores de pantalla.
    const aviso = document.getElementById('anuncio-ruta');
    if (aviso) aviso.textContent = `${cfg.titulo}, caso de uso ${cfg.uc}`;
  }

  /* Comportamientos comunes a cualquier pantalla ya montada. */
  function conectarGlobales() {
    UI.$$('[data-ir]').forEach(b => b.addEventListener('click', () => ir(b.dataset.ir)));
    UI.$$('[data-abrir-nav]').forEach(b => b.addEventListener('click', () => {
      document.body.classList.add('nav-open');
      document.querySelector('.sidebar .nav-item')?.focus();
    }));
    UI.$$('[data-cerrar-nav]').forEach(b => b.addEventListener('click', () => document.body.classList.remove('nav-open')));
    UI.$$('.sidebar .nav-item').forEach(a => a.addEventListener('click', () => document.body.classList.remove('nav-open')));

    UI.$$('[data-salir]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      DB.state.autenticado = false;
      DB.persistir();
      ir('/acceso');
      UI.toast('Sesión cerrada', 'Sus registros quedan guardados en este dispositivo.', 'info');
    }));

    UI.conectarRevelar();
  }

  function iniciar() {
    window.addEventListener('hashchange', resolver);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') document.body.classList.remove('nav-open');
    });
    resolver();
  }

  return { RUTAS, NAV, ir, iniciar, resolver };
})();

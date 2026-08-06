/* ============================================================================
   paleta.js — Paleta de comandos (Ctrl/⌘ + K).

   Por qué existe. La aplicación tiene once pantallas, cuatro categorías con
   dieciocho tipos de acción y nueve términos de glosario. Llegar a "registrar
   un viaje en autobús" costaba: abrir el menú, entrar a Registrar, elegir la
   categoría, abrir el desplegable y buscar el tipo. Cinco gestos para algo que
   la persona hace todos los días.

   Aquí se escribe "autobús" y se pulsa Enter. El formulario se abre con la
   categoría y el tipo ya puestos, y el cursor en la cantidad. De cinco gestos
   a dos.

   Qué NO es. No es un buscador de datos: no busca dentro de los registros.
   Busca lo que se puede HACER. Mezclar las dos cosas obliga a la persona a
   adivinar qué clase de resultado va a recibir.

   Los resultados se ordenan por cómo encajó lo escrito —empezar por la palabra
   vale más que contenerla en medio— y no por el orden en que están declarados,
   que es lo que hace que el primer resultado suela ser el correcto y se pueda
   pulsar Enter sin leer la lista.
   ========================================================================= */

const Paleta = (() => {

  let abierta = false;
  let scrim = null, campo = null, lista = null;
  let opciones = [];         // las que se están mostrando
  let marcada = 0;
  let focoPrevio = null;

  /* ==================================================================
     CATÁLOGO DE COMANDOS
     Se arma en cada apertura porque depende de la sesión: el papel de la
     persona decide si aparece la administración, y los tipos de acción
     salen del catálogo de datos.
     ================================================================== */
  function catalogo() {
    const cmd = [];

    /* --- Ir a --------------------------------------------------------- */
    Object.entries(Router.RUTAS).forEach(([ruta, c]) => {
      if (c.publico) return;
      if (c.permiso && !DB.puede(c.permiso)) return;
      cmd.push({
        grupo: 'Ir a',
        icono: iconoDeRuta(ruta),
        texto: c.titulo,
        pista: c.uc === 'ADM' ? 'Administración' : c.uc,
        claves: c.titulo,
        hacer: () => Router.ir(ruta)
      });
    });

    /* --- Registrar (atajo directo al formulario, ya rellenado) --------- */
    DB.CAT_LIST.forEach(cat => {
      cat.tipos.forEach(tipo => {
        cmd.push({
          grupo: 'Registrar',
          icono: cat.icono,
          texto: tipo.nombre,
          /* Se escribe la magnitud completa. En reciclaje las dos unidades son
             kilos, así que "3,935 kg/kg" no dice de qué es cada una; con
             "kg CO₂ por kg" se lee sin tener que deducirlo. */
          pista: `${cat.nombre} · ${DB.fmt.n(tipo.factor, 3)} kg CO₂ por ${cat.unidad}`,
          claves: `${tipo.nombre} ${cat.nombre} registrar anotar`,
          hacer: () => {
            Screens.accion.preset = { categoria: cat.id, tipo: tipo.id };
            Router.ir('/nueva-accion');
          }
        });
      });
    });

    /* --- Glosario ----------------------------------------------------- */
    Object.entries(DB.glosario).forEach(([clave, g]) => {
      cmd.push({
        grupo: 'Qué significa',
        icono: 'info',
        texto: g.termino,
        pista: g.corto,
        claves: `${g.termino} ${g.corto} significa glosario qué es`,
        hacer: () => UI.abrirGlosario(clave)
      });
    });

    /* --- Acciones del sistema ----------------------------------------- */
    cmd.push(
      { grupo: 'Sistema', icono: 'contraste', texto: 'Cambiar el tema',
        pista: `Ahora: ${Tema.ROTULOS[Tema.actual()].corto}`,
        claves: 'tema oscuro claro contraste noche modo apariencia',
        hacer: () => UI.alternarTema(), mantener: true },
      { grupo: 'Sistema', icono: 'info', texto: '¿Cómo funciona la aplicación?',
        pista: 'El recorrido de cuatro pasos',
        claves: 'ayuda cómo funciona tutorial recorrido explicación',
        hacer: () => Explicador.abrir() },
      { grupo: 'Sistema', icono: 'teclado', texto: 'Modo presentación',
        pista: 'Recorrer los casos de uso con → y ←',
        claves: 'presentación presentar defensa exposición proyector',
        hacer: () => Presentacion.entrar() },
      { grupo: 'Sistema', icono: 'descargar', texto: 'Descargar mis registros',
        pista: 'Un archivo CSV con el factor de cada cálculo',
        claves: 'exportar descargar csv excel copia respaldo datos',
        hacer: () => {
          UI.descargar(UI.nombreArchivo('mis-acciones-climaticas', 'csv'), DB.csv(),
            'text/csv;charset=utf-8');
          UI.toast('Descarga lista',
            `${DB.state.registros.length} registros, con el factor y la fuente de cada uno.`, 'info');
        } },
      { grupo: 'Sistema', icono: 'salir', texto: 'Cerrar sesión',
        pista: 'Tus registros quedan guardados',
        claves: 'salir cerrar sesión logout desconectar',
        hacer: () => document.querySelector('[data-salir]')?.click() }
    );

    return cmd;
  }

  const ICONOS_RUTA = {
    '/inicio': 'inicio', '/nueva-accion': 'accion', '/progreso': 'progreso',
    '/notificaciones': 'campana', '/insignias': 'insignia', '/comunidad': 'comunidad',
    '/reporte': 'reporte', '/perfil': 'perfil', '/admin': 'admin'
  };
  const iconoDeRuta = r => ICONOS_RUTA[r] || 'chevronDer';

  /* ==================================================================
     BÚSQUEDA

     Sin tildes y sin mayúsculas: nadie escribe "autobús" con tilde
     cuando va con prisa, y "Autobus" tiene que encontrarlo igual.
     ================================================================== */
  const plano = s => String(s)
    .toLowerCase()
    // NFD separa la letra de su tilde; el rango borra las tildes sueltas.
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  /**
   * Puntúa cuánto encaja un comando con lo escrito. Devuelve 0 si no encaja.
   * Se puntúa POR PALABRA para que "bus urbano" encuentre "Autobús" aunque las
   * dos palabras estén separadas en el texto.
   */
  function puntuar(cmd, consulta) {
    const texto = plano(cmd.texto);
    const claves = plano(cmd.claves || '') + ' ' + plano(cmd.grupo);
    let total = 0;

    for (const palabra of consulta.split(/\s+/).filter(Boolean)) {
      let mejor = 0;
      if (texto === palabra) mejor = 100;
      else if (texto.startsWith(palabra)) mejor = 60;
      else if (new RegExp('\\b' + palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(texto)) mejor = 40;
      else if (texto.includes(palabra)) mejor = 25;
      else if (claves.includes(palabra)) mejor = 12;
      if (!mejor) return 0;            // toda palabra escrita tiene que aparecer
      total += mejor;
    }
    return total;
  }

  function buscar(consulta) {
    const q = plano(consulta.trim());
    const todos = catalogo();
    if (!q) {
      /* Sin nada escrito se muestra lo más útil sin desplegar las 30 entradas:
         las pantallas, y el atajo de registrar. */
      return todos.filter(c => c.grupo === 'Ir a' || c.grupo === 'Sistema').slice(0, 9);
    }
    return todos
      .map(c => ({ c, p: puntuar(c, q) }))
      .filter(x => x.p > 0)
      .sort((a, b) => b.p - a.p)
      .slice(0, 12)
      .map(x => x.c);
  }

  /* ==================================================================
     DIBUJO
     ================================================================== */
  function pintarLista() {
    if (!opciones.length) {
      lista.innerHTML = `
        <li class="paleta-vacio">
          ${Icon.get('buscar', 22, 1.6)}
          <p>Nada con ese nombre. Probá con «bus», «insignias» o «reporte».</p>
        </li>`;
      return;
    }

    let grupoPrevio = '';
    lista.innerHTML = opciones.map((c, i) => {
      const cabecera = c.grupo !== grupoPrevio
        ? `<li class="paleta-grupo" role="presentation">${c.grupo}</li>` : '';
      grupoPrevio = c.grupo;
      return cabecera + `
        <li role="option" id="paleta-op-${i}" data-i="${i}"
            class="paleta-op ${i === marcada ? 'is-marcada' : ''}"
            aria-selected="${i === marcada}">
          <span class="paleta-ico">${Icon.get(c.icono, 16)}</span>
          <span class="paleta-txt">
            <b>${UI.esc(c.texto)}</b>
            ${c.pista ? `<small>${UI.esc(c.pista)}</small>` : ''}
          </span>
          ${i === marcada ? `<span class="paleta-enter">${Icon.get('retorno', 13)}</span>` : ''}
        </li>`;
    }).join('');

    campo.setAttribute('aria-activedescendant',
      opciones.length ? `paleta-op-${marcada}` : '');
    lista.querySelector('.is-marcada')?.scrollIntoView({ block: 'nearest' });
  }

  function refrescar() {
    opciones = buscar(campo.value);
    marcada = 0;
    pintarLista();
  }

  /* ==================================================================
     ABRIR Y CERRAR
     ================================================================== */
  function abrir() {
    if (abierta) return;
    if (!DB.state.autenticado) return;   // no hay a dónde ir sin sesión
    abierta = true;
    focoPrevio = document.activeElement;

    scrim = document.createElement('div');
    scrim.className = 'paleta-scrim';
    scrim.innerHTML = `
      <div class="paleta" role="dialog" aria-modal="true" aria-label="Buscar e ir a cualquier parte">
        <div class="paleta-campo">
          ${Icon.get('buscar', 18)}
          <input type="text" id="paleta-entrada" autocomplete="off" spellcheck="false"
                 placeholder="Buscá una pantalla, una acción o una palabra…"
                 role="combobox" aria-expanded="true" aria-controls="paleta-lista"
                 aria-autocomplete="list">
          <kbd class="tecla">Esc</kbd>
        </div>
        <ul class="paleta-lista" id="paleta-lista" role="listbox"
            aria-label="Resultados"></ul>
        <div class="paleta-pie">
          <span><kbd class="tecla">↑</kbd><kbd class="tecla">↓</kbd> moverse</span>
          <span><kbd class="tecla">${Icon.get('retorno', 11)}</kbd> abrir</span>
          <span class="paleta-pie-fin"><kbd class="tecla">${UI.teclaMando()} K</kbd> esta ventana</span>
        </div>
      </div>`;

    document.body.appendChild(scrim);
    document.body.classList.add('con-modal');
    campo = scrim.querySelector('#paleta-entrada');
    lista = scrim.querySelector('#paleta-lista');

    refrescar();
    campo.focus();

    campo.addEventListener('input', refrescar);
    scrim.addEventListener('mousedown', e => { if (e.target === scrim) cerrar(); });

    lista.addEventListener('pointermove', e => {
      const op = e.target.closest('.paleta-op');
      if (op && +op.dataset.i !== marcada) { marcada = +op.dataset.i; pintarLista(); }
    });
    lista.addEventListener('click', e => {
      const op = e.target.closest('.paleta-op');
      if (op) { marcada = +op.dataset.i; ejecutar(); }
    });

    scrim.addEventListener('keydown', enTeclado);
  }

  function cerrar() {
    if (!abierta) return;
    abierta = false;
    scrim?.remove();
    scrim = campo = lista = null;
    document.body.classList.remove('con-modal');
    focoPrevio?.focus?.();
    focoPrevio = null;
  }

  function ejecutar() {
    const c = opciones[marcada];
    if (!c) return;
    /* Algunos comandos —cambiar el tema— tiene sentido repetirlos, así que la
       ventana se queda abierta. El resto llevan a otra parte y cerrarla es
       parte de haber llegado. */
    if (!c.mantener) cerrar();
    c.hacer();
    if (c.mantener) refrescar();
  }

  function enTeclado(e) {
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
    if (e.key === 'Enter') { e.preventDefault(); ejecutar(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!opciones.length) return;
      marcada = (marcada + (e.key === 'ArrowDown' ? 1 : -1) + opciones.length) % opciones.length;
      pintarLista();
      return;
    }
    if (e.key === 'Tab') {
      /* No hay nada más a lo que tabular dentro: el foco se queda en el campo,
         que es donde se escribe. */
      e.preventDefault();
    }
  }

  /* ==================================================================
     ATAJO GLOBAL
     ================================================================== */
  function iniciar() {
    document.addEventListener('keydown', e => {
      const combinacion = (e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K');
      if (!combinacion) return;
      /* Se le gana al buscador del navegador solo cuando hay algo que abrir. */
      if (!DB.state.autenticado) return;
      e.preventDefault();
      abierta ? cerrar() : abrir();
    });
  }

  return { iniciar, abrir, cerrar, get abierta() { return abierta; } };
})();

/* ============================================================================
   presentacion.js — Modo presentación.

   Este prototipo se defiende en voz alta frente a un grupo. En esa situación
   lo peor que puede pasar es tener que buscar el menú, equivocarse de clic o
   quedarse callado tratando de recordar cuál pantalla seguía.

   Con el modo presentación la aplicación se recorre con una sola tecla: → y ←
   pasan de un caso de uso al siguiente, en el orden en que están numerados, y
   una barra abajo dice siempre en cuál se está y cuál viene. Nada más.

   Atajos:
     P        entrar o salir del modo
     → / ←    caso de uso siguiente / anterior
     1 … 8    saltar directo a uno
     Esc      salir

   Las teclas se ignoran mientras el foco está en un campo de texto: si alguien
   escribe "próximo" en una nota, no debe cambiarse la pantalla.
   ========================================================================= */

const Presentacion = (() => {

  /* Recorrido: las rutas privadas en el orden de los casos de uso. Se calcula
     desde el mapa del enrutador para que agregar una ruta no obligue a
     acordarse de actualizar también esta lista. */
  const recorrido = () =>
    Object.entries(Router.RUTAS)
      .filter(([, c]) => !c.publico)
      .map(([ruta, c]) => ({ ruta, ...c }))
      .sort((a, b) => (+a.uc.slice(2)) - (+b.uc.slice(2)));

  let activo = false;
  let barra = null;

  const escribiendo = () => {
    const a = document.activeElement;
    return !!a && (a.matches('input, textarea, select') || a.isContentEditable);
  };

  const indice = () => {
    const r = location.hash.replace(/^#/, '') || '/inicio';
    return recorrido().findIndex(p => p.ruta === r);
  };

  /* ------------------------------------------------------------------ */
  function entrar() {
    if (activo) return;
    if (!DB.state.autenticado) {
      UI.toast('Primero hay que entrar', 'El modo presentación recorre las pantallas de la sesión.', 'info');
      return;
    }
    activo = true;
    document.body.classList.add('presentando');
    construirBarra();
    actualizar();
    UI.toast('Modo presentación activado', 'Usá → y ← para pasar de pantalla. P o Esc para salir.', 'info', 5200);
  }

  function salir() {
    if (!activo) return;
    activo = false;
    document.body.classList.remove('presentando');
    barra?.remove();
    barra = null;
  }

  const alternar = () => (activo ? salir() : entrar());

  /* ------------------------------------------------------------------ */
  function mover(paso) {
    const lista = recorrido();
    const i = indice();
    // Desde una pantalla fuera del recorrido, → entra por la primera.
    const siguiente = i < 0 ? 0 : (i + paso + lista.length) % lista.length;
    Router.ir(lista[siguiente].ruta);
  }

  function saltar(n) {
    const lista = recorrido();
    if (n >= 1 && n <= lista.length) Router.ir(lista[n - 1].ruta);
  }

  /* ------------------------------------------------------------------ */
  function construirBarra() {
    barra = document.createElement('div');
    barra.className = 'presenta-barra';
    barra.setAttribute('role', 'status');
    barra.setAttribute('aria-live', 'polite');
    document.body.appendChild(barra);

    barra.addEventListener('click', e => {
      const b = e.target.closest('[data-paso]');
      if (b) mover(+b.dataset.paso);
      if (e.target.closest('[data-salir-presenta]')) salir();
    });
  }

  /** Redibuja la barra. La llama el enrutador después de cada pantalla. */
  function actualizar() {
    if (!activo || !barra) return;
    const lista = recorrido();
    const i = indice();
    const actual = lista[i];
    const proximo = lista[(i + 1 + lista.length) % lista.length];

    barra.innerHTML = `
      <button type="button" class="presenta-btn" data-paso="-1" aria-label="Pantalla anterior">
        ${Icon.get('flechaIzq', 16)}
      </button>

      <div class="presenta-centro">
        <span class="presenta-uc">${actual ? actual.uc : '—'}</span>
        <b>${actual ? UI.esc(actual.titulo) : 'Fuera del recorrido'}</b>
        <span class="presenta-cuenta">${i < 0 ? '—' : i + 1} de ${lista.length}</span>
      </div>

      <div class="presenta-puntos" aria-hidden="true">
        ${lista.map((p, n) => `<i class="${n === i ? 'is-aqui' : ''}" title="${UI.esc(p.titulo)}"></i>`).join('')}
      </div>

      <span class="presenta-proximo">sigue: <b>${UI.esc(proximo.titulo)}</b></span>

      <button type="button" class="presenta-btn" data-paso="1" aria-label="Pantalla siguiente">
        ${Icon.get('flechaDer', 16)}
      </button>
      <button type="button" class="presenta-btn presenta-cerrar" data-salir-presenta
              aria-label="Salir del modo presentación">${Icon.get('equis', 16)}</button>`;
  }

  /* ------------------------------------------------------------------ */
  function iniciar() {
    document.addEventListener('keydown', e => {
      if (escribiendo() || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); alternar(); return; }
      if (!activo) return;

      if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); }
      else if (e.key === 'Escape') { e.preventDefault(); salir(); }
      else if (/^[1-9]$/.test(e.key)) { e.preventDefault(); saltar(+e.key); }
    });
  }

  return { iniciar, entrar, salir, alternar, actualizar, get activo() { return activo; } };
})();

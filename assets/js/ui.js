/* ============================================================================
   ui.js — Utilidades compartidas por todas las pantallas: avisos emergentes,
   ventanas modales, validación de formularios, simulación de latencia y la
   cinta de carbono (elemento de firma del sistema).
   ========================================================================= */

/* Registro de pantallas. Vive aquí, en el núcleo, y no en la primera pantalla
   que se cargue: son scripts clásicos, así que si dos declararan `Screens` el
   navegador cortaría con un error de sintaxis. Cada archivo de `screens/` solo
   añade su entrada. */
const Screens = {};

const UI = (() => {

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /** Escapa texto que provenga de datos antes de insertarlo como HTML. */
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /** Elementos que pueden recibir el foco dentro de un contenedor. */
  function focosDe(ctx) {
    return $$('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]),' +
              'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', ctx)
      .filter(el => el.offsetParent !== null || el === document.activeElement);
  }

  /** `⌘` en Mac, `Ctrl` en el resto. Para escribir los atajos como son. */
  const teclaMando = () =>
    /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl';

  /* ==================================================================
     AVISOS EMERGENTES

     Se pueden cerrar a mano: un aviso de nueve segundos tapando la
     esquina, sin forma de quitarlo, es peor que no tenerlo. Y se pausan
     al pasar el puntero por encima, para poder acabar de leerlo.
     ================================================================== */
  const MAX_AVISOS = 4;

  function toast(titulo, texto = '', tono = 'ok', ms = 4200) {
    let stack = $('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }

    /* Más de cuatro avisos apilados no se leen y tapan la pantalla: se retira
       el más viejo antes de añadir otro. */
    while (stack.children.length >= MAX_AVISOS) stack.firstElementChild.remove();

    const ico = tono === 'error' ? 'alertaCirculo' : tono === 'info' ? 'info' : 'checkCirculo';
    const el = document.createElement('div');
    el.className = `toast is-${tono}`;
    el.innerHTML = `
      ${Icon.get(ico, 18)}
      <div class="toast-txt"><b>${esc(titulo)}</b>${texto ? `<p>${esc(texto)}</p>` : ''}</div>
      <button class="toast-x" type="button" aria-label="Cerrar el aviso">${Icon.get('equis', 14)}</button>`;

    const quitar = () => {
      if (!el.isConnected) return;
      el.classList.add('is-out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
      // Si la animación no corre (movimiento reducido), se retira igual.
      setTimeout(() => el.remove(), 400);
    };

    let reloj = setTimeout(quitar, ms);
    el.addEventListener('pointerenter', () => clearTimeout(reloj));
    el.addEventListener('pointerleave', () => { reloj = setTimeout(quitar, 1600); });
    el.querySelector('.toast-x').addEventListener('click', () => { clearTimeout(reloj); quitar(); });

    stack.appendChild(el);
    return el;
  }

  /* ==================================================================
     VENTANA MODAL  (foco encerrado + cierre con Escape)
     ================================================================== */
  let modalPrevio = null;

  /* `etiqueta` nombra el diálogo para los lectores de pantalla cuando no
     lleva título visible (por ejemplo, la celebración de una insignia). */
  function modal({ titulo, etiqueta, cuerpo, acciones = [], ancho, alCerrar }) {
    cerrarModal();
    modalPrevio = document.activeElement;

    const scrim = document.createElement('div');
    scrim.className = 'modal-scrim';
    scrim.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(etiqueta || titulo || 'Diálogo')}"
           tabindex="-1" ${ancho ? `style="width:min(${ancho}px,100%)"` : ''}>
        ${titulo ? `<div class="modal-head"><h2>${esc(titulo)}</h2></div>` : ''}
        <div class="modal-body">${cuerpo}</div>
        ${acciones.length ? '<div class="modal-foot"></div>' : ''}
      </div>`;

    const caja = $('.modal', scrim);
    const foot = $('.modal-foot', scrim);
    acciones.forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.clase || '');
      b.innerHTML = (a.icono ? Icon.get(a.icono, 16) : '') + `<span>${esc(a.texto)}</span>`;
      b.addEventListener('click', () => { if (!a.onClick || a.onClick() !== false) cerrarModal(); });
      foot.appendChild(b);
    });

    scrim.addEventListener('mousedown', e => { if (e.target === scrim) cerrarModal(); });
    modal.alCerrar = alCerrar || null;
    document.body.appendChild(scrim);
    /* El desplazamiento del fondo se bloquea: si no, la rueda del ratón mueve
       la página detrás del diálogo y se pierde la referencia de dónde estaba. */
    document.body.classList.add('con-modal');

    /* El foco arranca en el primer campo si lo hay —es lo que la persona vino
       a hacer— y si no, en la acción principal. Antes iba siempre al último
       botón, así que en el diálogo de "escribí ELIMINAR" había que tabular
       hacia atrás para llegar al campo. */
    const primerCampo = $('input:not([type="hidden"]), textarea, select', caja);
    (primerCampo || foot?.lastElementChild || caja).focus();

    document.addEventListener('keydown', enTeclado, true);
    return scrim;
  }

  /* El foco no puede salirse del diálogo: es lo que lo vuelve modal de verdad.
     Sin esto, tabular desde el último botón llevaba al contenido de detrás,
     que sigue en el árbol y responde a la navegación por teclado. */
  function enTeclado(e) {
    const scrim = $('.modal-scrim');
    if (!scrim) return;

    if (e.key === 'Escape') { e.stopPropagation(); cerrarModal(); return; }
    if (e.key !== 'Tab') return;

    const caja = $('.modal', scrim);
    const focos = focosDe(caja);
    if (!focos.length) { e.preventDefault(); caja.focus(); return; }

    const primero = focos[0], ultimo = focos[focos.length - 1];
    const dentro = caja.contains(document.activeElement);

    if (!dentro) { e.preventDefault(); (e.shiftKey ? ultimo : primero).focus(); }
    else if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }

  function cerrarModal() {
    const s = $('.modal-scrim');
    if (!s) return;
    s.remove();
    document.removeEventListener('keydown', enTeclado, true);
    document.body.classList.remove('con-modal');
    const cb = modal.alCerrar;
    modal.alCerrar = null;
    modalPrevio?.focus?.();
    modalPrevio = null;
    cb?.();
  }

  /* ==================================================================
     BOTONES CON ESTADO DE CARGA

     La espera solo se simula cuando NO hay nada que esperar: en modo
     local no existe backend, y un guardado instantáneo se lee como si el
     botón no hubiera hecho nada. Contra Firebase la escritura de verdad
     ya tarda lo que tarda, así que añadirle 900 ms encima era hacer la
     aplicación más lenta a propósito.
     ================================================================== */
  function cargando(btn, ms = 900) {
    if (!btn) return Promise.resolve();
    const espera = DB.state.modo === 'nube' ? Math.min(ms, 220) : ms;
    return new Promise(res => {
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
      setTimeout(() => {
        btn.classList.remove('is-loading');
        btn.removeAttribute('aria-busy');
        res();
      }, espera);
    });
  }

  /** Marca un botón como ocupado mientras corre una promesa de verdad. */
  async function conBoton(btn, tarea) {
    btn?.classList.add('is-loading');
    btn?.setAttribute('aria-busy', 'true');
    try { return await tarea(); }
    finally {
      btn?.classList.remove('is-loading');
      btn?.removeAttribute('aria-busy');
    }
  }

  /* ==================================================================
     VALIDACIÓN DE FORMULARIOS
     Reglas declarativas por campo. El mensaje se muestra debajo del
     control y se enlaza con aria-describedby.
     ================================================================== */
  const reglas = {
    requerido: v => v.trim() ? null : 'Este campo no puede quedar vacío.',
    correo: v => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()) ? null : 'Ese correo no tiene buena pinta. Debe ser algo como nombre@ufide.ac.cr.',
    clave: v => v.length >= 8 ? null : 'La contraseña necesita al menos 8 caracteres.',
    numero: v => (v !== '' && !isNaN(v) && +v > 0) ? null : 'Poné un número mayor que cero.',
    nombre: v => v.trim().split(/\s+/).length >= 2 ? null : 'Escribí tu nombre y al menos un apellido.'
  };

  /** Marca un campo como válido o inválido y devuelve si pasó. */
  function marcar(campo, error) {
    const cont = campo.closest('.field');
    if (!cont) return !error;
    let msg = cont.querySelector('.field-msg');
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'field-msg';
      msg.id = (campo.id || 'f' + Math.random().toString(36).slice(2)) + '-msg';
      cont.appendChild(msg);
    }
    cont.classList.toggle('is-invalid', !!error);
    cont.classList.toggle('is-valid', !error && campo.value.trim() !== '');
    campo.setAttribute('aria-invalid', error ? 'true' : 'false');
    campo.setAttribute('aria-describedby', msg.id);
    /* El estado válido no imprime texto: el borde verde ya lo comunica y, si
       insertáramos una línea, el formulario crecería al salir de cada campo y
       desplazaría el botón justo cuando la persona va a pulsarlo. */
    msg.innerHTML = error
      ? Icon.get('alertaCirculo', 14) + `<span>${esc(error)}</span>`
      : '';
    return !error;
  }

  /**
   * Valida un formulario. Cada control declara sus reglas en data-reglas
   * (separadas por espacio) y opcionalmente data-igual="#otroCampo".
   */
  function validar(form) {
    let ok = true, primero = null;
    $$('[data-reglas]', form).forEach(campo => {
      const lista = campo.dataset.reglas.split(/\s+/);
      let error = null;
      for (const r of lista) {
        error = reglas[r] ? reglas[r](campo.value) : null;
        if (error) break;
      }
      if (!error && campo.dataset.igual) {
        const otro = form.querySelector(campo.dataset.igual);
        if (otro && otro.value !== campo.value) error = 'Las dos contraseñas no son iguales.';
      }
      if (!error && campo.type === 'checkbox' && campo.required && !campo.checked) {
        error = 'Hay que aceptar para seguir.';
      }
      if (error) { ok = false; primero = primero || campo; }
      marcar(campo, error);
    });
    if (primero) primero.focus();
    return ok;
  }

  /** Valida al salir del campo y limpia el error mientras se corrige. */
  function validacionEnVivo(form) {
    $$('[data-reglas]', form).forEach(campo => {
      campo.addEventListener('blur', () => {
        if (campo.value.trim() === '' && !campo.dataset.reglas.includes('requerido')) return;
        const lista = campo.dataset.reglas.split(/\s+/);
        let error = null;
        for (const r of lista) { error = reglas[r] ? reglas[r](campo.value) : null; if (error) break; }
        if (!error && campo.dataset.igual) {
          const otro = form.querySelector(campo.dataset.igual);
          if (otro && otro.value !== campo.value) error = 'Las dos contraseñas no son iguales.';
        }
        marcar(campo, error);
      });
      campo.addEventListener('input', () => {
        const cont = campo.closest('.field');
        if (cont?.classList.contains('is-invalid')) {
          cont.classList.remove('is-invalid');
          cont.querySelector('.field-msg')?.replaceChildren();
        }
      });
    });
  }

  /** Fortaleza de contraseña: longitud + variedad de caracteres. */
  function fortaleza(v) {
    let n = 0;
    if (v.length >= 8) n++;
    if (v.length >= 12) n++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) n++;
    if (/\d/.test(v) && /[^\w\s]/.test(v)) n++;
    return Math.min(4, n);
  }

  /** Conecta el botón de mostrar/ocultar contraseña. */
  function conectarRevelar(ctx = document) {
    $$('.reveal', ctx).forEach(b => {
      b.addEventListener('click', () => {
        const input = b.parentElement.querySelector('input');
        const ver = input.type === 'password';
        input.type = ver ? 'text' : 'password';
        b.innerHTML = Icon.get(ver ? 'ojoOff' : 'ojo', 17);
        b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
        input.focus();
      });
    });
  }

  /* ==================================================================
     CINTA DE CARBONO — elemento de firma
     Traza de 90 días del CO2 evitado, presente en todas las pantallas
     autenticadas. Funciona como el "pulso" del instrumento: da
     continuidad entre casos de uso y contexto permanente al usuario.
     ================================================================== */
  /* Datos de la cinta ya dibujada, para poder leerlos al pasar el puntero
     sin recalcular la serie de noventa días en cada movimiento. */
  let cintaDatos = null;

  function cintaCarbono(dias = 90) {
    const serie = DB.serieDiaria(dias);
    /* La escala usa el percentil 90 y no el máximo: un solo día atípico
       (por ejemplo, una entrega grande de aluminio) aplastaría toda la
       traza y la cinta dejaría de leerse. Los días por encima se recortan. */
    const ordenados = serie.map(d => d.co2).sort((a, b) => a - b);
    const max = Math.max(ordenados[Math.floor(ordenados.length * 0.9)] || 0, 0.5);
    const total = serie.reduce((a, d) => a + d.co2, 0);
    const prom = total / serie.length;
    const hoy = DB.hoyISO();
    const mejor = serie.reduce((a, d) => d.co2 > a.co2 ? d : a, serie[0]);
    cintaDatos = serie;

    /* ------------------------------------------------------------------
       Las barras NO son botones.

       Lo eran, y eso ponía noventa controles enfocables —que además no
       hacían nada al pulsarlos— delante del contenido de TODAS las
       pantallas privadas. Con teclado había que pasar noventa veces por el
       tabulador antes de llegar al primer enlace útil.

       Ahora la cinta es una figura: el dato completo va en su descripción
       de texto, que es lo que lee un lector de pantalla, y el detalle día
       a día aparece en la cabecera al pasar el puntero o el dedo. Un solo
       control queda en el orden de tabulación —el enlace al historial—,
       que es lo que alguien querría hacer al mirar la traza.
       ------------------------------------------------------------------ */
    const barras = serie.map((d, i) => {
      const h = Math.min(100, Math.max(3, Math.round(d.co2 / max * 100)));
      const cls = d.fecha === hoy ? 'is-today' : d.co2 === 0 ? 'is-zero' : '';
      return `<i class="ribbon-bar ${cls}" style="--h:${h}%;--d:${i * 5}ms"
                 data-dia="${i}" aria-hidden="true"></i>`;
    }).join('');

    return `
      <figure class="ribbon" id="cinta">
        <div class="ribbon-head">
          <span class="label-micro">Tus últimos ${dias} días</span>
          <span class="ribbon-read" id="cinta-lectura" data-reposo="1">
            En total <b>${DB.fmt.n(total, 1)} kg</b> &nbsp;·&nbsp;
            unos <b>${DB.fmt.n(prom, 2)} kg</b> por día
          </span>
        </div>
        <div class="ribbon-track" style="--avg:${Math.min(96, Math.round(prom / max * 100))}%">
          ${barras}
          <span class="ribbon-cursor" hidden aria-hidden="true"></span>
        </div>
        <figcaption class="ribbon-axis">
          <span>${DB.fmt.fechaCorta(serie[0].fecha)}</span>
          <span class="ribbon-nota">una barra por día · la línea punteada es tu promedio</span>
          <span>hoy</span>
        </figcaption>
        <p class="sr-only">
          Traza de los últimos ${dias} días. En total evitaste
          ${DB.fmt.n(total, 1)} kilos de CO₂, un promedio de ${DB.fmt.n(prom, 2)} kilos
          por día. Tu mejor día fue el ${DB.fmt.fecha(mejor.fecha)}, con
          ${DB.fmt.co2(mejor.co2)} kilos. El detalle día por día está en la
          tabla de Mi progreso.
        </p>
      </figure>`;
  }

  /** Lectura de un día concreto al pasar por encima de su barra. */
  function conectarCinta(ctx = document) {
    const cinta = $('#cinta', ctx);
    if (!cinta) return;
    const pista = $('.ribbon-track', cinta);
    const lectura = $('#cinta-lectura', cinta);
    const cursor = $('.ribbon-cursor', cinta);
    if (!pista || !lectura) return;

    const reposo = lectura.innerHTML;

    const mostrar = barra => {
      const d = cintaDatos?.[+barra.dataset.dia];
      if (!d) return;
      lectura.innerHTML = d.co2 > 0
        ? `<b>${DB.fmt.fechaCorta(d.fecha)}</b> &nbsp;·&nbsp; <b>${DB.fmt.co2(d.co2)} kg</b> evitados`
        : `<b>${DB.fmt.fechaCorta(d.fecha)}</b> &nbsp;·&nbsp; sin registros ese día`;
      lectura.removeAttribute('data-reposo');
      cinta.querySelector('.ribbon-bar.is-hover')?.classList.remove('is-hover');
      barra.classList.add('is-hover');
      if (cursor) { cursor.hidden = false; cursor.style.left = barra.offsetLeft + barra.offsetWidth / 2 + 'px'; }
    };

    const limpiar = () => {
      lectura.innerHTML = reposo;
      lectura.setAttribute('data-reposo', '1');
      cinta.querySelector('.ribbon-bar.is-hover')?.classList.remove('is-hover');
      if (cursor) cursor.hidden = true;
    };

    /* Un solo oyente en la pista en lugar de noventa en las barras. */
    pista.addEventListener('pointermove', e => {
      const barra = e.target.closest('.ribbon-bar');
      if (barra) mostrar(barra);
    });
    pista.addEventListener('pointerleave', limpiar);
    pista.addEventListener('pointercancel', limpiar);
  }

  /* ==================================================================
     Bloques de contenido repetidos
     ================================================================== */

  /**
   * Lectura destacada (KPI del instrumento).
   *
   * `etiqueta`, `valor` y `pie` se insertan como HTML y no se escapan: las
   * tres las escribe una pantalla, nunca vienen de la base ni de un
   * formulario, y necesitan admitir marcado — un botón del glosario en la
   * etiqueta, una variación con signo en el pie. Lo que sí venga de datos se
   * escapa en el sitio donde se arma, con `UI.esc`.
   */
  function readout({ etiqueta, valor, unidad = '', pie = '', tono = '', icono = '' }) {
    return `
      <article class="readout ${tono}">
        <p class="label-micro">${icono ? Icon.get(icono, 13) : ''}${etiqueta}</p>
        <p class="value">${valor}${unidad ? `<span class="unit">${esc(unidad)}</span>` : ''}</p>
        ${pie ? `<p class="foot">${pie}</p>` : ''}
      </article>`;
  }

  /** Esqueleto mientras "responde el servidor". */
  function esqueleto(n = 3) {
    return `<div aria-hidden="true">${'<div class="skeleton sk-line"></div>'.repeat(n)}</div>`;
  }

  /* ==================================================================
     GLOSARIO EN LÍNEA

     Ninguna palabra técnica debería obligar a salirse de la pantalla
     para entenderla. `ayuda('co2')` deja un botón discreto al lado del
     término; al pulsarlo se abre la explicación completa.

     Se conecta una sola vez, sobre el documento, en lugar de por botón:
     las pantallas se redibujan enteras a cada rato y así los botones
     nuevos funcionan sin tener que volver a enlazarlos.
     ================================================================== */

  /** Botón de "¿qué es esto?" para un término del glosario. */
  function ayuda(clave) {
    const g = DB.glosario[clave];
    if (!g) return '';
    return `<button class="ayuda" type="button" data-ayuda="${clave}"
              aria-label="Qué significa ${esc(g.termino)}"
              title="¿Qué significa ${esc(g.termino)}?">?</button>`;
  }

  /** El término escrito, con su botón de ayuda pegado. */
  function termino(clave, texto) {
    const g = DB.glosario[clave];
    if (!g) return esc(texto || '');
    return `<span class="con-ayuda">${esc(texto || g.termino)}${ayuda(clave)}</span>`;
  }

  function abrirGlosario(clave) {
    const g = DB.glosario[clave];
    if (!g) return;
    /* `largo` puede ser una función cuando la definición cita cifras del
       catálogo: así se leen del dato en vez de repetirse a mano y quedarse
       viejas. Ver `glosario.factor` en data.js. */
    const largo = typeof g.largo === 'function' ? g.largo() : g.largo;
    modal({
      titulo: g.termino,
      cuerpo: `
        <p class="glos-corto">${esc(g.corto)}</p>
        <p class="glos-largo">${esc(largo.replace(/\s+/g, ' ').trim())}</p>`,
      acciones: [{ texto: 'Entendido', clase: 'btn-primary' }],
      ancho: 460
    });
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ayuda]');
    if (b) abrirGlosario(b.dataset.ayuda);
  });

  /* ==================================================================
     TEMA
     El botón vive en la barra superior y cuenta los tres estados con su
     icono. `Tema` guarda y aplica; aquí solo se pinta y se avisa.
     ================================================================== */
  function pintarBotonTema() {
    /* `[data-cambiar-tema]` y no `[data-tema]`: ese último lo lleva el <html>
       para aplicar el tema, así que el selector habría devuelto la raíz del
       documento en lugar del botón. */
    const b = $('[data-cambiar-tema]');
    if (!b || typeof Tema === 'undefined') return;
    const r = Tema.ROTULOS[Tema.actual()];
    b.innerHTML = Icon.get(r.icono, 18);
    b.setAttribute('aria-label', `${r.texto}. Cambiar el tema`);
    b.setAttribute('title', `${r.texto} · pulsá para cambiarlo`);
  }

  function alternarTema() {
    const nuevo = Tema.alternar();
    pintarBotonTema();
    toast(Tema.ROTULOS[nuevo].texto,
      nuevo === 'auto' ? 'La aplicación sigue lo que tenga configurado tu dispositivo.' : '',
      'info', 2600);
  }

  /* ==================================================================
     DESCARGAR UN ARCHIVO

     El navegador sabe escribir archivos, así que no hace falta ningún
     backend para entregar uno. Antes los botones de exportar y de
     descargar el reporte solo avisaban de que "el backend enviaría el
     archivo": prometían algo que no pasaba.
     ================================================================== */
  function descargar(nombre, contenido, mime = 'application/json;charset=utf-8') {
    const blob = new Blob([contenido], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    /* La URL temporal se suelta después: revocarla en el mismo momento del
       clic puede cancelar la descarga en algunos navegadores. */
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /** Nombre de archivo con la fecha, para que no se pisen entre descargas. */
  const nombreArchivo = (base, ext) =>
    `${base}-${DB.hoyISO()}.${ext}`;

  return { $, $$, esc, focosDe, teclaMando,
           toast, modal, cerrarModal, cargando, conBoton,
           validar, validacionEnVivo, marcar, fortaleza, conectarRevelar,
           cintaCarbono, conectarCinta, readout, esqueleto,
           ayuda, termino, abrirGlosario,
           pintarBotonTema, alternarTema, descargar, nombreArchivo };
})();

/* `const` en un script clásico no crea una propiedad de `window`. Se publica a
   mano porque `data.js` y `nube.js` avisan de los fallos de escritura con
   `window.UI?.toast(...)`: sin esto, el `?.` descartaba el aviso en silencio y
   un error al guardar en la nube no llegaba nunca a la pantalla. */
window.UI = UI;
window.Screens = Screens;

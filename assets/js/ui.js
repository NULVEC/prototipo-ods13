/* ============================================================================
   ui.js — Utilidades compartidas por todas las pantallas: avisos emergentes,
   ventanas modales, validación de formularios, simulación de latencia y la
   cinta de carbono (elemento de firma del sistema).
   ========================================================================= */

const UI = (() => {

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /** Escapa texto que provenga de datos antes de insertarlo como HTML. */
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ==================================================================
     AVISOS EMERGENTES
     ================================================================== */
  function toast(titulo, texto = '', tono = 'ok', ms = 4200) {
    let stack = $('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const ico = tono === 'error' ? 'alertaCirculo' : tono === 'info' ? 'info' : 'checkCirculo';
    const el = document.createElement('div');
    el.className = `toast is-${tono}`;
    el.innerHTML = `${Icon.get(ico, 18)}<div><b>${esc(titulo)}</b>${texto ? `<p>${esc(texto)}</p>` : ''}</div>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, ms);
  }

  /* ==================================================================
     VENTANA MODAL  (foco atrapado + cierre con Escape)
     ================================================================== */
  let modalPrevio = null;

  /* `etiqueta` nombra el diálogo para los lectores de pantalla cuando no
     lleva título visible (por ejemplo, la celebración de una insignia). */
  function modal({ titulo, etiqueta, cuerpo, acciones = [], ancho }) {
    cerrarModal();
    modalPrevio = document.activeElement;

    const scrim = document.createElement('div');
    scrim.className = 'modal-scrim';
    scrim.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(etiqueta || titulo || 'Diálogo')}"
           ${ancho ? `style="width:min(${ancho}px,100%)"` : ''}>
        ${titulo ? `<div class="modal-head"><h2>${esc(titulo)}</h2></div>` : ''}
        <div class="modal-body">${cuerpo}</div>
        ${acciones.length ? '<div class="modal-foot"></div>' : ''}
      </div>`;

    const foot = $('.modal-foot', scrim);
    acciones.forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.clase || '');
      b.innerHTML = (a.icono ? Icon.get(a.icono, 16) : '') + `<span>${esc(a.texto)}</span>`;
      b.addEventListener('click', () => { if (!a.onClick || a.onClick() !== false) cerrarModal(); });
      foot.appendChild(b);
    });

    scrim.addEventListener('mousedown', e => { if (e.target === scrim) cerrarModal(); });
    document.body.appendChild(scrim);
    (foot?.lastElementChild || $('.modal', scrim)).focus?.();
    document.addEventListener('keydown', onEsc);
    return scrim;
  }

  function onEsc(e) { if (e.key === 'Escape') cerrarModal(); }

  function cerrarModal() {
    const s = $('.modal-scrim');
    if (s) s.remove();
    document.removeEventListener('keydown', onEsc);
    modalPrevio?.focus?.();
    modalPrevio = null;
  }

  /* ==================================================================
     BOTONES CON ESTADO DE CARGA
     Simula la latencia del backend REST descrito en el Avance 3.
     ================================================================== */
  function cargando(btn, ms = 900) {
    return new Promise(res => {
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
      setTimeout(() => {
        btn.classList.remove('is-loading');
        btn.removeAttribute('aria-busy');
        res();
      }, ms);
    });
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
  function cintaCarbono(dias = 90) {
    const serie = DB.serieDiaria(dias);
    /* La escala usa el percentil 90 y no el máximo: un solo día atípico
       (por ejemplo, una entrega grande de aluminio) aplastaría toda la
       traza y la cinta dejaría de leerse. Los días por encima se recortan. */
    const ordenados = serie.map(d => d.co2).sort((a, b) => a - b);
    const max = Math.max(ordenados[Math.floor(ordenados.length * 0.9)] || 0, 0.5);
    const prom = serie.reduce((a, d) => a + d.co2, 0) / serie.length;
    const total = serie.reduce((a, d) => a + d.co2, 0);
    const hoy = DB.hoyISO();

    const barras = serie.map((d, i) => {
      const h = Math.min(100, Math.max(3, Math.round(d.co2 / max * 100)));
      const cls = d.fecha === hoy ? 'is-today' : d.co2 === 0 ? 'is-zero' : '';
      return `<button type="button" class="ribbon-bar ${cls}"
        style="--h:${h}%;--d:${i * 5}ms"
        aria-label="${DB.fmt.fecha(d.fecha)}: ${DB.fmt.co2(d.co2)} kg de CO2e evitados"
        title="${DB.fmt.fechaCorta(d.fecha)} · ${DB.fmt.co2(d.co2)} kg CO₂"></button>`;
    }).join('');

    return `
      <section class="ribbon" aria-label="Una barra por cada uno de los últimos ${dias} días. Cuanto más alta, más CO2 evitaste ese día.">
        <div class="ribbon-head">
          <span class="label-micro">Tus últimos ${dias} días · una barra por día</span>
          <span class="ribbon-read">En total <b>${DB.fmt.n(total, 1)} kg</b> &nbsp;·&nbsp; unos <b>${DB.fmt.n(prom, 2)} kg</b> por día</span>
        </div>
        <div class="ribbon-track" style="--avg:${Math.min(96, Math.round(prom / max * 100))}%">${barras}</div>
        <div class="ribbon-axis">
          <span>${DB.fmt.fechaCorta(serie[0].fecha)}</span>
          <span>entre más alta la barra, mejor fue ese día &nbsp;·&nbsp; la línea punteada es tu promedio</span>
          <span>hoy</span>
        </div>
      </section>`;
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
    modal({
      titulo: g.termino,
      cuerpo: `
        <p class="glos-corto">${esc(g.corto)}</p>
        <p class="glos-largo">${esc(g.largo.replace(/\s+/g, ' ').trim())}</p>`,
      acciones: [{ texto: 'Entendido', clase: 'btn-primary' }],
      ancho: 460
    });
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ayuda]');
    if (b) abrirGlosario(b.dataset.ayuda);
  });

  return { $, $$, esc, toast, modal, cerrarModal, cargando, validar, validacionEnVivo,
           marcar, fortaleza, conectarRevelar, cintaCarbono, readout, esqueleto,
           ayuda, termino, abrirGlosario };
})();

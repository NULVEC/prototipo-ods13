/* ============================================================================
   fiesta.js — El momento de celebrar.

   Una aplicación de hábitos que no celebra nada es una hoja de cálculo con
   colores. Cuando alguien registra una acción o desbloquea una insignia, la
   interfaz tiene que reaccionar: es lo que convierte un formulario enviado en
   un logro.

   Aquí viven las dos piezas de esa reacción:
     · confeti  — papelillos sobre un lienzo a pantalla completa
     · contar   — números que suben en lugar de aparecer de golpe

   Ambas respetan `prefers-reduced-motion`: quien pidió que la pantalla no se
   mueva recibe el resultado final de inmediato, sin animación y sin confeti.
   El dato nunca depende del efecto.
   ========================================================================= */

const Fiesta = (() => {

  const quieto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Papelillos en la paleta del sistema: verdes, azules y ámbar. Nada de
     arcoíris genérico — la celebración también es parte de la marca. */
  const COLORES = ['#2f7d5f', '#5b9be8', '#b8862a', '#4e9f8c', '#a8d4e6', '#e0c05a'];

  let lienzo = null, ctx = null, papeles = [], cuadro = 0, ultimo = 0;

  function prepararLienzo() {
    if (lienzo) return;
    lienzo = document.createElement('canvas');
    lienzo.className = 'confeti-lienzo';
    lienzo.setAttribute('aria-hidden', 'true');
    document.body.appendChild(lienzo);
    ctx = lienzo.getContext('2d');
    ajustar();
    window.addEventListener('resize', ajustar);
  }

  function ajustar() {
    if (!lienzo) return;
    const r = Math.min(window.devicePixelRatio, 2);
    lienzo.width = window.innerWidth * r;
    lienzo.height = window.innerHeight * r;
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  /**
   * Lanza confeti.
   * @param {object} opciones
   *   origen    {x, y} en píxeles de ventana; por defecto, el centro arriba.
   *   cantidad  número de papelillos (se recorta en pantallas pequeñas).
   */
  function confeti({ origen, cantidad = 90 } = {}) {
    if (quieto()) return;
    prepararLienzo();

    const ox = origen?.x ?? window.innerWidth / 2;
    const oy = origen?.y ?? window.innerHeight * 0.32;
    const n = Math.round(cantidad * (window.innerWidth < 640 ? 0.55 : 1));

    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.1;
      const vel = 5.5 + Math.random() * 7.5;
      papeles.push({
        x: ox + (Math.random() - 0.5) * 40,
        y: oy + (Math.random() - 0.5) * 20,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel,
        giro: Math.random() * Math.PI,
        vGiro: (Math.random() - 0.5) * 0.34,
        w: 5 + Math.random() * 6,
        h: 8 + Math.random() * 7,
        color: COLORES[Math.floor(Math.random() * COLORES.length)],
        vida: 1
      });
    }

    if (!cuadro) { ultimo = performance.now(); cuadro = requestAnimationFrame(dibujar); }
  }

  function dibujar(ahora) {
    /* dt normalizado a 60 fps: en una pantalla de 120 Hz el confeti debe caer
       a la misma velocidad, no al doble. Se acota por si la pestaña estuvo
       en segundo plano y el salto es de varios segundos. */
    const dt = Math.min(3, (ahora - ultimo) / 16.667);
    ultimo = ahora;

    ctx.clearRect(0, 0, lienzo.width, lienzo.height);

    papeles = papeles.filter(p => {
      p.vy += 0.34 * dt;             // gravedad
      p.vx *= Math.pow(0.985, dt);   // roce del aire
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.giro += p.vGiro * dt;
      if (p.y > window.innerHeight * 0.62) p.vida -= 0.014 * dt;
      if (p.vida <= 0 || p.y > window.innerHeight + 40) return false;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.giro);
      ctx.globalAlpha = Math.max(0, p.vida);
      ctx.fillStyle = p.color;
      // El papelillo se ve más angosto cuando gira de canto.
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w * Math.abs(Math.cos(p.giro)), p.h);
      ctx.restore();
      return true;
    });

    if (papeles.length) {
      cuadro = requestAnimationFrame(dibujar);
    } else {
      cancelAnimationFrame(cuadro);
      cuadro = 0;
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    }
  }

  /* ==================================================================
     CONTADOR ASCENDENTE
     ================================================================== */

  /**
   * Sube un número dentro de un elemento, de `desde` hasta `hasta`.
   * @param el       elemento donde escribir
   * @param hasta    valor final
   * @param opciones { desde, dec, ms, sufijo }
   */
  function contar(el, hasta, { desde = 0, dec = 1, ms = 900, sufijo = '' } = {}) {
    if (!el) return;
    const escribir = v => { el.textContent = DB.fmt.n(v, dec) + sufijo; };

    if (quieto()) { escribir(hasta); return; }

    const t0 = performance.now();
    // Desaceleración cúbica: arranca rápido y se posa en el valor final.
    const paso = ahora => {
      const t = Math.min(1, (ahora - t0) / ms);
      escribir(desde + (hasta - desde) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  /** Aplica `contar` a todo elemento con data-contar="valor" dentro de ctx. */
  function contarTodo(ctx = document) {
    ctx.querySelectorAll('[data-contar]').forEach(el => {
      contar(el, parseFloat(el.dataset.contar), {
        dec: el.dataset.dec ? +el.dataset.dec : 1,
        ms: el.dataset.ms ? +el.dataset.ms : 900
      });
    });
  }

  /* ==================================================================
     GOLPE DE ÉNFASIS
     Un pulso corto sobre un elemento que acaba de cambiar de valor.
     ================================================================== */
  function pulso(el) {
    if (!el || quieto()) return;
    el.classList.remove('pulsa');
    void el.offsetWidth;            // reinicia la animación CSS
    el.classList.add('pulsa');
    el.addEventListener('animationend', () => el.classList.remove('pulsa'), { once: true });
  }

  /** Limpia todo: lo llama el enrutador al cambiar de pantalla. */
  function limpiar() {
    papeles = [];
    if (cuadro) { cancelAnimationFrame(cuadro); cuadro = 0; }
    if (ctx && lienzo) ctx.clearRect(0, 0, lienzo.width, lienzo.height);
  }

  return { confeti, contar, contarTodo, pulso, limpiar, COLORES };
})();

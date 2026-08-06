/* ============================================================================
   tema.js — Claro, oscuro o el del sistema.

   El valor ya está aplicado antes de que este archivo se ejecute: lo pone un
   script en línea dentro del <head> para que no haya un destello claro al
   recargar con el tema oscuro puesto. Aquí vive lo demás — cambiarlo,
   recordarlo, y avisar a las piezas que no se repintan solas.

   Tres estados y no dos. "Auto" no es un relleno: alguien que tiene el
   teléfono en oscuro de noche y en claro de día quiere que la aplicación lo
   siga, y eso es imposible de expresar con un interruptor de dos posiciones.

   Qué hay que avisar al cambiar:
     · Chart.js  guarda los colores al construir cada gráfico, no los lee de
                 CSS en cada cuadro. Hay que tirar su caché y redibujar.
     · Las escenas 3D pintan el fondo con un color de WebGL, que tampoco sale
       de la hoja de estilos.
   Las dos cosas se resuelven redibujando la pantalla, que es lo que hace el
   enrutador cuando se le avisa.
   ========================================================================= */

const Tema = (() => {

  const CLAVE = 'ods13.tema';
  const CICLO = ['auto', 'claro', 'oscuro'];

  const ROTULOS = {
    auto:   { texto: 'Tema del sistema', icono: 'contraste', corto: 'Auto' },
    claro:  { texto: 'Tema claro',       icono: 'sol',       corto: 'Claro' },
    oscuro: { texto: 'Tema oscuro',      icono: 'luna',      corto: 'Oscuro' }
  };

  const raiz = document.documentElement;

  /** Lo elegido: 'auto', 'claro' u 'oscuro'. */
  const actual = () => CICLO.includes(raiz.dataset.tema) ? raiz.dataset.tema : 'auto';

  /** Lo que de verdad se está viendo: 'claro' u 'oscuro'. */
  const efectivo = () => {
    const t = actual();
    if (t !== 'auto') return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  };

  const oscuro = () => efectivo() === 'oscuro';

  /* Los suscriptores son las piezas que guardan color al construirse y no
     pueden leerlo de CSS en cada cuadro (gráficos y escenas 3D). */
  const suscriptores = new Set();
  const alCambiar = fn => { suscriptores.add(fn); return () => suscriptores.delete(fn); };

  function aplicar(valor, { avisar = true } = {}) {
    const nuevo = CICLO.includes(valor) ? valor : 'auto';
    if (nuevo === actual() && avisar) return;

    /* La clase abre una ventana en la que TODAS las superficies interpolan su
       color. Sin ella el cambio es un corte seco; dejándola puesta, cada hover
       de la aplicación arrastraría una transición de 320 ms. */
    document.body?.classList.add('cambiando-tema');
    raiz.dataset.tema = nuevo;
    try { localStorage.setItem(CLAVE, nuevo); } catch (e) { /* sin almacenamiento */ }

    clearTimeout(aplicar.limpieza);
    aplicar.limpieza = setTimeout(
      () => document.body?.classList.remove('cambiando-tema'), 340);

    if (avisar) suscriptores.forEach(fn => { try { fn(efectivo()); } catch (e) { console.error(e); } });
  }

  /** Pasa al siguiente estado del ciclo y devuelve el que quedó. */
  function alternar() {
    const siguiente = CICLO[(CICLO.indexOf(actual()) + 1) % CICLO.length];
    aplicar(siguiente);
    return siguiente;
  }

  /* Con el tema en "auto", que el sistema pase a oscuro tiene que repintar los
     gráficos igual que si la persona lo hubiera cambiado a mano. */
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (actual() === 'auto') suscriptores.forEach(fn => fn(efectivo()));
  });

  return { actual, efectivo, oscuro, aplicar, alternar, alCambiar, CICLO, ROTULOS };
})();

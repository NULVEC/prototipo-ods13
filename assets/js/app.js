/* ============================================================================
   app.js — Punto de entrada. Se carga al final: en este momento ya existen
   Icon, DB, UI, Charts, Screens y Router.
   ========================================================================= */

(function iniciar() {

  /* Si Chart.js no está disponible (por ejemplo, si se borró la carpeta
     vendor), la app sigue funcionando y avisa en lugar de romperse. */
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js no se cargó: los gráficos no se dibujarán.');
    document.addEventListener('DOMContentLoaded', () => {
      UI.toast('Gráficos no disponibles',
        'No se encontró assets/vendor/chart.umd.js. El resto del prototipo funciona igual.', 'error', 8000);
    });
  }

  function arrancar() {
    Router.iniciar();

    /* El enlace de salto lleva el foco al contenido, no solo el scroll. */
    document.querySelector('.skip-link')?.addEventListener('click', () => {
      setTimeout(() => document.getElementById('contenido')?.focus(), 0);
    });

    console.info(
      '%cPrototipo ODS 13 · Sistema de Registro y Seguimiento de Acciones Climáticas',
      'font-weight:bold;color:#17493b'
    );
    console.info('Rutas disponibles:', Object.keys(Router.RUTAS).map(r => '#' + r).join('  '));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();

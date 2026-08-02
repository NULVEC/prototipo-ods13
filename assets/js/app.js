/* ============================================================================
   app.js — Punto de entrada.

   La aplicación no se dibuja de inmediato: primero espera a que `nube.js`
   resuelva si hay sesión en Firebase, para no enseñar la pantalla de acceso a
   alguien que ya había entrado. Si ese módulo no llega a cargar —sin conexión,
   o al abrir el archivo con doble clic, donde el navegador bloquea los módulos
   ES— se arranca igual en modo local con los datos simulados.
   ========================================================================= */

const Aplicacion = (() => {

  let arrancada = false;

  function arrancar(modo) {
    if (arrancada) return;
    arrancada = true;

    if (modo === 'local') DB.usarLocal();

    document.getElementById('arranque')?.remove();
    Router.iniciar();

    /* El enlace de salto lleva el foco al contenido, no solo el scroll. */
    document.querySelector('.skip-link')?.addEventListener('click', () => {
      setTimeout(() => document.getElementById('contenido')?.focus(), 0);
    });

    if (modo === 'local') {
      console.info('Modo local: datos simulados, sin Firebase.');
    } else {
      console.info('Modo nube: Firebase Authentication + Cloud Firestore.');
    }
    console.info('Rutas disponibles:', Object.keys(Router.RUTAS).map(r => '#' + r).join('  '));
  }

  /* Red de seguridad: si `nube.js` no arrancó la aplicación en cuatro
     segundos, se asume que Firebase no está disponible y se sigue en local. */
  function vigilar() {
    setTimeout(() => {
      if (arrancada) return;
      console.warn('Firebase no respondió: se continúa con datos simulados.');
      arrancar('local');
      UI.toast('Sin conexión con Firebase',
        'El prototipo funciona con datos simulados guardados en este dispositivo.', 'info', 8000);
    }, 4000);
  }

  if (typeof Chart === 'undefined') {
    console.warn('Chart.js no se cargó: los gráficos no se dibujarán.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', vigilar);
  } else {
    vigilar();
  }

  return { arrancar, get lista() { return arrancada; } };
})();

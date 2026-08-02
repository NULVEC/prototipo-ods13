/* ============================================================================
   screens/auth.js — UC1 Registrarse y UC2 Iniciar sesión.

   Ambas comparten el armazón de acceso: a la izquierda una cifra que explica
   por qué existe la aplicación, a la derecha el formulario. No es un adorno:
   es la primera pieza de información ambiental que ve el usuario.
   ========================================================================= */

const Screens = window.Screens || {};

/* Panel izquierdo, con contenido distinto según la pantalla. */
function panelAcceso({ titulo, resaltado, texto, puntos = [], etiqueta, cifra, unidad, pie }) {
  return `
    <aside class="auth-aside">
      <div class="auth-brand">
        <span class="mark">${Icon.mark(19)}</span>
        <b><span>Registro y Seguimiento</span><span>de Acciones Climáticas</span></b>
      </div>

      <div class="auth-thesis">
        <h1>${titulo}<em>${resaltado}</em></h1>
        <p>${texto}</p>
        ${puntos.length ? `<ul class="auth-points">
          ${puntos.map(p => `<li>${Icon.get(p.icono, 17)}<span>${p.texto}</span></li>`).join('')}
        </ul>` : ''}
      </div>

      <div class="auth-figure">
        <span class="label-micro">${etiqueta}</span>
        <p class="fig">${cifra}<span class="unit">${unidad}</span></p>
        <p class="src">${pie}</p>
      </div>
    </aside>`;
}

/* ==========================================================================
   UC1 — Registrarse
   ========================================================================== */
Screens.registro = {
  render() {
    const provincias = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];

    return `
      <div class="auth-shell">
        ${panelAcceso({
          titulo: 'Lo que no se mide,',
          resaltado: 'no se reduce.',
          texto: 'Cree una cuenta para registrar sus acciones sostenibles y ver, en kilogramos, el CO₂ que deja de emitir cada semana.',
          puntos: [
            { icono: 'reciclaje',  texto: 'Registrá reciclaje, transporte, energía y agua' },
            { icono: 'progreso',   texto: 'Vea el cálculo del CO₂e con la fórmula a la vista' },
            { icono: 'escudo',     texto: 'Compare su avance sin exponer su identidad' }
          ],
          etiqueta: 'Meta nacional de descarbonización',
          cifra: '2050', unidad: '',
          pie: 'Plan Nacional de Descarbonización 2018–2050'
        })}

        <main class="auth-main">
          <div class="auth-form-wrap">
            <div class="auth-head">
              <h2>Crear cuenta</h2>
              <p>Tarda menos de un minuto. Solo pedimos lo necesario para calcular su progreso.</p>
            </div>

            <form id="form-registro" novalidate>
              <div id="registro-error" hidden></div>

              <div class="field">
                <label for="r-nombre">Nombre completo <span class="req" aria-hidden="true">*</span></label>
                <input class="input" id="r-nombre" name="nombre" type="text"
                       autocomplete="name" placeholder="Nombre y apellidos"
                       data-reglas="requerido nombre" required>
              </div>

              <div class="field">
                <label for="r-correo">Correo electrónico <span class="req" aria-hidden="true">*</span></label>
                <div class="input-icon">
                  ${Icon.get('correo', 17)}
                  <input class="input" id="r-correo" name="correo" type="email"
                         autocomplete="email" placeholder="nombre@ufide.ac.cr"
                         data-reglas="requerido correo" required>
                </div>
                <span class="hint">Se usará para enviarle los recordatorios y el resumen semanal.</span>
              </div>

              <div class="field">
                <label for="r-provincia">Provincia</label>
                <select class="select" id="r-provincia" name="provincia">
                  ${provincias.map(p => `<option ${p === 'San José' ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
                <span class="hint">Permite comparar su progreso con el de personas de su zona.</span>
              </div>

              <div class="field">
                <label for="r-clave">Contraseña <span class="req" aria-hidden="true">*</span></label>
                <div class="input-icon" style="position:relative">
                  ${Icon.get('candado', 17)}
                  <input class="input" id="r-clave" name="clave" type="password"
                         autocomplete="new-password" placeholder="Mínimo 8 caracteres"
                         style="padding-right:44px" data-reglas="requerido clave" required>
                  <button class="reveal" type="button" aria-label="Mostrar contraseña">${Icon.get('ojo', 17)}</button>
                </div>
                <div class="meter" id="r-medidor" data-level="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
                <span class="hint" id="r-fuerza">Combine mayúsculas, números y un símbolo.</span>
              </div>

              <div class="field">
                <label for="r-clave2">Repita la contraseña <span class="req" aria-hidden="true">*</span></label>
                <div class="input-icon" style="position:relative">
                  ${Icon.get('candado', 17)}
                  <input class="input" id="r-clave2" name="clave2" type="password"
                         autocomplete="new-password" style="padding-right:44px"
                         data-reglas="requerido" data-igual="#r-clave" required>
                  <button class="reveal" type="button" aria-label="Mostrar contraseña">${Icon.get('ojo', 17)}</button>
                </div>
              </div>

              <div class="field">
                <label class="check">
                  <input type="checkbox" id="r-terminos" name="terminos" required>
                  <span>Acepto que mis registros se usen de forma anónima en la comparativa comunitaria.</span>
                </label>
                <p class="field-msg" id="r-terminos-msg"></p>
              </div>

              <div class="field">
                <label class="check">
                  <input type="checkbox" id="r-ejemplo" name="ejemplo" checked>
                  <span>Cargar noventa días de actividad de ejemplo para poder recorrer las
                        pantallas de progreso, insignias y reportes desde el primer día.</span>
                </label>
              </div>

              <button class="btn btn-primary btn-block" type="submit" id="r-enviar">
                ${Icon.get('check', 17)}<span>Crear cuenta</span>
              </button>
            </form>

            <p class="auth-alt">
              ¿Ya tiene una cuenta? <a href="#/acceso">Inicie sesión</a>
            </p>
          </div>
        </main>
      </div>`;
  },

  mount() {
    const form = document.getElementById('form-registro');
    UI.validacionEnVivo(form);

    /* Medidor de fortaleza en vivo */
    const clave = document.getElementById('r-clave');
    const medidor = document.getElementById('r-medidor');
    const leyenda = document.getElementById('r-fuerza');
    const textos = ['Combine mayúsculas, números y un símbolo.', 'Contraseña débil.',
                    'Contraseña aceptable.', 'Contraseña buena.', 'Contraseña fuerte.'];
    clave.addEventListener('input', () => {
      const n = clave.value ? UI.fortaleza(clave.value) : 0;
      medidor.dataset.level = n;
      leyenda.textContent = textos[n];
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const ok = UI.validar(form);

      /* La casilla se valida aparte porque no es un campo de texto. */
      const t = document.getElementById('r-terminos');
      const tmsg = document.getElementById('r-terminos-msg');
      const tOk = t.checked;
      t.closest('.field').classList.toggle('is-invalid', !tOk);
      tmsg.innerHTML = tOk ? '' : Icon.get('alertaCirculo', 14) + '<span>Hay que aceptar para seguir.</span>';

      if (!ok || !tOk) {
        UI.toast('Revisá el formulario', 'Hay campos que arreglar.', 'error');
        return;
      }

      const boton = document.getElementById('r-enviar');
      const datos = Object.fromEntries(new FormData(form));
      const zonaError = document.getElementById('registro-error');
      zonaError.hidden = true;

      /* Sin Firebase el prototipo sigue funcionando: crea la cuenta en memoria
         y continúa con los datos simulados. */
      if (DB.state.modo !== 'nube' || !window.Nube) {
        await UI.cargando(boton, 1100);
        DB.guardarPerfil({ nombre: datos.nombre, correo: datos.correo, provincia: datos.provincia });
        DB.state.autenticado = true;
        DB.persistir();
        UI.toast('Cuenta creada', 'Ya puede registrar su primera acción sostenible.');
        Router.ir('/inicio');
        return;
      }

      boton.classList.add('is-loading');
      boton.setAttribute('aria-busy', 'true');
      try {
        await Nube.crearCuenta({
          correo: datos.correo.trim(),
          clave: datos.clave,
          nombre: datos.nombre.trim(),
          provincia: datos.provincia,
          conEjemplo: form.ejemplo.checked
        });
        UI.toast('Cuenta creada', 'Ya puede registrar su primera acción sostenible.');
        // El resto lo hace `onAuthStateChanged`: descarga los datos y navega.
      } catch (e) {
        zonaError.hidden = false;
        zonaError.innerHTML = `
          <div class="notice notice-error" style="margin-bottom:var(--s-5)" role="alert">
            ${Icon.get('alertaCirculo', 17)}
            <div><b>No se pudo crear la cuenta.</b> ${UI.esc(Nube.traducir(e))}</div>
          </div>`;
        zonaError.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        UI.toast('No se creó la cuenta', Nube.traducir(e), 'error', 7000);
      } finally {
        boton.classList.remove('is-loading');
        boton.removeAttribute('aria-busy');
      }
    });
  }
};

/* ==========================================================================
   UC2 — Iniciar sesión
   ========================================================================== */
Screens.acceso = {
  render() {
    return `
      <div class="auth-shell">
        ${panelAcceso({
          titulo: 'Tu huella,',
          resaltado: 'medida cada día.',
          texto: 'Retome el seguimiento donde lo dejó. La cinta de carbono conserva los últimos noventa días de actividad.',
          puntos: [
            { icono: 'reloj',     texto: 'Tu racha y tu meta del mes, apenas abrís' },
            { icono: 'insignia',  texto: 'Las insignias que lleva ganadas' },
            { icono: 'reporte',   texto: 'El reporte de emisiones, siempre al día' }
          ],
          etiqueta: 'Electricidad renovable en Costa Rica',
          cifra: '99', unidad: '%',
          pie: 'Centro Nacional de Control de Energía'
        })}

        <main class="auth-main">
          <div class="auth-form-wrap">
            <div class="auth-head">
              <h2>Iniciar sesión</h2>
              <p>Entrá con el correo con el que te registraste.</p>
            </div>

            ${DB.state.modo === 'nube' ? `
              <div class="notice notice-info" style="margin-bottom:var(--s-6)">
                ${Icon.get('escudo', 17)}
                <div>
                  Las cuentas son reales: se validan contra Firebase Authentication y sus registros
                  quedan guardados en su cuenta. Si es la primera vez, cree una.
                </div>
              </div>` : `
              <div class="notice notice-warn" style="margin-bottom:var(--s-6)">
                ${Icon.get('alerta', 17)}
                <div>
                  <b>Modo sin conexión.</b> No se pudo contactar a Firebase, así que el prototipo
                  trabaja con datos simulados en este dispositivo. Cualquier correo con formato
                  válido y una contraseña de ocho caracteres inician la sesión; escriba
                  <span class="mono">incorrecta</span> para ver el estado de error.
                </div>
              </div>`}

            <form id="form-acceso" novalidate>
              <div id="acceso-error" hidden></div>

              <div class="field">
                <label for="a-correo">Correo electrónico</label>
                <div class="input-icon">
                  ${Icon.get('correo', 17)}
                  <input class="input" id="a-correo" name="correo" type="email"
                         autocomplete="username" placeholder="nombre@ufide.ac.cr"
                         data-reglas="requerido correo" required>
                </div>
              </div>

              <div class="field">
                <label for="a-clave">Contraseña</label>
                <div class="input-icon" style="position:relative">
                  ${Icon.get('candado', 17)}
                  <input class="input" id="a-clave" name="clave" type="password"
                         autocomplete="current-password" style="padding-right:44px"
                         data-reglas="requerido clave" required>
                  <button class="reveal" type="button" aria-label="Mostrar contraseña">${Icon.get('ojo', 17)}</button>
                </div>
              </div>

              <div style="display:flex;align-items:center;gap:var(--s-4);margin-bottom:var(--s-6)">
                <label class="check" style="align-items:center">
                  <input type="checkbox" id="a-recordar" checked>
                  <span>Mantener la sesión abierta</span>
                </label>
                <a href="#/acceso" style="margin-left:auto;font-size:var(--t-sm)" id="a-olvide">Olvidé mi contraseña</a>
              </div>

              <button class="btn btn-primary btn-block" type="submit" id="a-enviar">
                ${Icon.get('salir', 17)}<span>Entrar</span>
              </button>
            </form>

            <p class="auth-alt">
              ¿Primera vez aquí? <a href="#/registro">Cree una cuenta</a>
            </p>
          </div>
        </main>
      </div>`;
  },

  mount() {
    const form = document.getElementById('form-acceso');
    const zonaError = document.getElementById('acceso-error');
    UI.validacionEnVivo(form);

    document.getElementById('a-olvide').addEventListener('click', e => {
      e.preventDefault();
      UI.modal({
        titulo: 'Restablecer la contraseña',
        cuerpo: `<p>Le enviaremos un enlace de un solo uso al correo registrado. El enlace vence en 30 minutos.</p>
          <div class="field" style="margin-top:var(--s-4)">
            <label for="m-correo">Correo electrónico</label>
            <input class="input" id="m-correo" type="email" value="${UI.esc(form.correo.value)}" placeholder="nombre@ufide.ac.cr">
          </div>`,
        acciones: [
          { texto: 'Cancelar', clase: 'btn-ghost' },
          { texto: 'Enviar enlace', clase: 'btn-primary', icono: 'correo',
            onClick: () => {
              const correo = document.getElementById('m-correo').value.trim();
              if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo)) {
                document.getElementById('m-correo').closest('.field').classList.add('is-invalid');
                UI.toast('Ese correo no sirve', 'Escribí una dirección con el formato correcto.', 'error');
                return false;     // mantiene la ventana abierta
              }
              if (DB.state.modo === 'nube' && window.Nube) {
                Nube.recuperarClave(correo)
                  .then(() => UI.toast('Enlace enviado',
                    'Revisá tu bandeja de entrada y la carpeta de no deseados.', 'info'))
                  .catch(e => UI.toast('No se pudo enviar', Nube.traducir(e), 'error', 7000));
              } else {
                UI.toast('Enlace enviado',
                  'Revisá tu bandeja de entrada y la carpeta de no deseados.', 'info');
              }
            } }
        ]
      });
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      zonaError.hidden = true;
      if (!UI.validar(form)) return;

      const boton = document.getElementById('a-enviar');

      const fallo = motivo => {
        zonaError.hidden = false;
        zonaError.innerHTML = `
          <div class="notice notice-error" style="margin-bottom:var(--s-5)" role="alert">
            ${Icon.get('alertaCirculo', 17)}
            <div><b>No pudimos iniciar la sesión.</b> ${UI.esc(motivo)}</div>
          </div>`;
        form.clave.value = '';
        form.clave.focus();
        UI.toast('No se inició la sesión', motivo, 'error', 7000);
      };

      /* Sin Firebase se conserva el acceso simulado, con una contraseña
         reservada para poder seguir mostrando el estado de error. */
      if (DB.state.modo !== 'nube' || !window.Nube) {
        await UI.cargando(boton, 950);
        if (form.clave.value.trim().toLowerCase() === 'incorrecta') {
          fallo('El correo o la contraseña no coinciden con ninguna cuenta.');
          return;
        }
        DB.state.autenticado = true;
        DB.persistir();
        UI.toast('Bienvenido de vuelta', `Lleva ${DB.racha()} días seguidos registrando acciones.`);
        Router.ir('/inicio');
        return;
      }

      boton.classList.add('is-loading');
      boton.setAttribute('aria-busy', 'true');
      try {
        await Nube.entrar(form.correo.value.trim(), form.clave.value);
        UI.toast('Sesión iniciada', 'Cargando sus registros…', 'info', 2500);
        // `onAuthStateChanged` descarga los datos y dibuja la pantalla.
      } catch (e) {
        fallo(Nube.traducir(e));
      } finally {
        boton.classList.remove('is-loading');
        boton.removeAttribute('aria-busy');
      }
    });
  }
};

window.Screens = Screens;

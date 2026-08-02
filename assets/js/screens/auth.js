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
            { icono: 'reciclaje',  texto: 'Registre reciclaje, transporte, energía y agua' },
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
              <div class="field">
                <label for="r-nombre">Nombre completo <span class="req" aria-hidden="true">*</span></label>
                <input class="input" id="r-nombre" name="nombre" type="text"
                       autocomplete="name" placeholder="Eduardo Coto Astacio"
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
      tmsg.innerHTML = tOk ? '' : Icon.get('alertaCirculo', 14) + '<span>Debe aceptar para continuar.</span>';

      if (!ok || !tOk) {
        UI.toast('Revise el formulario', 'Hay campos que necesitan corrección.', 'error');
        return;
      }

      await UI.cargando(document.getElementById('r-enviar'), 1100);

      const datos = Object.fromEntries(new FormData(form));
      DB.state.usuario.nombre = datos.nombre;
      DB.state.usuario.correo = datos.correo;
      DB.state.usuario.provincia = datos.provincia;
      DB.state.autenticado = true;
      DB.persistir();

      UI.toast('Cuenta creada', 'Ya puede registrar su primera acción sostenible.');
      Router.ir('/inicio');
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
          titulo: 'Su huella,',
          resaltado: 'medida cada día.',
          texto: 'Retome el seguimiento donde lo dejó. La cinta de carbono conserva los últimos noventa días de actividad.',
          puntos: [
            { icono: 'reloj',     texto: 'Su racha y su meta del mes, al abrir' },
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
              <p>Ingrese con el correo que registró en la plataforma.</p>
            </div>

            <div class="notice notice-info" style="margin-bottom:var(--s-6)">
              ${Icon.get('info', 17)}
              <div>
                <b>Prototipo de demostración.</b> Use
                <span class="mono">ecoto70818@ufide.ac.cr</span> con cualquier contraseña de 8 o más
                caracteres, o pulse el botón para completarlo automáticamente.
              </div>
            </div>

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

              <button class="btn btn-ghost btn-block" type="button" id="a-demo" style="margin-top:var(--s-2)">
                ${Icon.get('recargar', 16)}<span>Completar con datos de demostración</span>
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

    document.getElementById('a-demo').addEventListener('click', () => {
      form.correo.value = 'ecoto70818@ufide.ac.cr';
      form.clave.value = 'ClimaCR2026';
      UI.marcar(form.correo, null);
      UI.marcar(form.clave, null);
      form.querySelector('#a-enviar').focus();
    });

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
            onClick: () => UI.toast('Enlace enviado', 'Revise su bandeja de entrada y la carpeta de no deseados.', 'info') }
        ]
      });
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      zonaError.hidden = true;
      if (!UI.validar(form)) return;

      await UI.cargando(document.getElementById('a-enviar'), 950);

      /* Credenciales simuladas: solo el correo de demostración autentica.
         Así la pantalla muestra también su estado de error. */
      const correoOk = form.correo.value.trim().toLowerCase() === 'ecoto70818@ufide.ac.cr';
      if (!correoOk) {
        zonaError.hidden = false;
        zonaError.innerHTML = `
          <div class="notice notice-error" style="margin-bottom:var(--s-5)" role="alert">
            ${Icon.get('alertaCirculo', 17)}
            <div><b>No pudimos iniciar la sesión.</b> El correo o la contraseña no coinciden con
            ninguna cuenta. Verifique el correo o cree una cuenta nueva.</div>
          </div>`;
        form.clave.value = '';
        form.correo.focus();
        UI.toast('Credenciales incorrectas', 'Revise el correo ingresado.', 'error');
        return;
      }

      DB.state.autenticado = true;
      DB.persistir();
      UI.toast('Bienvenido de vuelta', `Lleva ${DB.racha()} días seguidos registrando acciones.`);
      Router.ir('/inicio');
    });
  }
};

window.Screens = Screens;

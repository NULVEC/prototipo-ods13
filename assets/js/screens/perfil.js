/* ============================================================================
   screens/perfil.js — UC10 Editar perfil de usuario.

   Los datos personales y la contraseña se editan en formularios separados:
   cambiar el correo y cambiar la clave son operaciones con consecuencias
   distintas y no deberían compartir un mismo botón de guardar.
   ========================================================================= */

Screens.perfil = {

  render() {
    const u = DB.state.usuario;
    const provincias = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];
    const total = DB.sumaCO2(DB.state.registros);
    const obtenidas = DB.logros().filter(l => l.obtenida).length;

    return `
      <div class="grid grid-main-aside">

        <div class="stack">
          <div class="panel">
            <div class="panel-head">${Icon.get('perfil', 18)}<h3>Datos personales</h3></div>
            <div class="panel-body">

              <div class="profile-id">
                <span class="avatar avatar-lg">${DB.fmt.iniciales(u.nombre)}</span>
                <div class="who">
                  <h2>${UI.esc(u.nombre)}</h2>
                  <p>${UI.esc(u.id)} · alias público ${UI.esc(u.alias)}</p>
                </div>
                <button class="btn btn-sm" type="button" id="p-alias" style="margin-left:auto">
                  ${Icon.get('recargar', 15)}<span>Cambiar alias</span>
                </button>
              </div>

              <form id="form-perfil" novalidate>
                <div class="grid grid-2" style="gap:0 var(--s-5)">
                  <div class="field">
                    <label for="p-nombre">Nombre completo</label>
                    <input class="input" id="p-nombre" name="nombre" type="text"
                           value="${UI.esc(u.nombre)}" data-reglas="requerido nombre" required>
                  </div>

                  <div class="field">
                    <label for="p-correo">Correo electrónico</label>
                    <div class="input-icon">
                      ${Icon.get('correo', 17)}
                      <input class="input" id="p-correo" name="correo" type="email"
                             value="${UI.esc(u.correo)}" data-reglas="requerido correo" required>
                    </div>
                    <span class="hint">Cambiarlo exige confirmar el correo nuevo.</span>
                  </div>

                  <div class="field">
                    <label for="p-provincia">Provincia</label>
                    <select class="select" id="p-provincia" name="provincia">
                      ${provincias.map(p => `<option ${p === u.provincia ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                  </div>

                  <div class="field">
                    <label for="p-canton">Cantón</label>
                    <input class="input" id="p-canton" name="canton" type="text" value="${UI.esc(u.canton)}">
                  </div>
                </div>

                <div class="field">
                  <label for="p-meta">Meta mensual de CO₂e evitado</label>
                  <div class="input-group" style="max-width:260px">
                    <input class="input" id="p-meta" name="meta" type="number" min="1" step="1"
                           value="${u.meta}" data-reglas="requerido numero" required>
                    <span class="addon">kg / mes</span>
                  </div>
                  <span class="hint">El promedio de la comunidad ronda los 40 kg mensuales.</span>
                </div>

                <button class="btn btn-primary" type="submit" id="p-guardar">
                  ${Icon.get('guardar', 17)}<span>Guardar cambios</span>
                </button>
              </form>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">${Icon.get('candado', 18)}<h3>Contraseña</h3></div>
            <form class="panel-body" id="form-clave" novalidate>
              <div class="grid grid-2" style="gap:0 var(--s-5)">
                <div class="field">
                  <label for="c-actual">Contraseña actual</label>
                  <div class="input-icon" style="position:relative">
                    ${Icon.get('llave', 17)}
                    <input class="input" id="c-actual" name="actual" type="password"
                           style="padding-right:44px" data-reglas="requerido" required>
                    <button class="reveal" type="button" aria-label="Mostrar contraseña">${Icon.get('ojo', 17)}</button>
                  </div>
                </div>
                <div class="field">
                  <label for="c-nueva">Contraseña nueva</label>
                  <div class="input-icon" style="position:relative">
                    ${Icon.get('candado', 17)}
                    <input class="input" id="c-nueva" name="nueva" type="password"
                           style="padding-right:44px" data-reglas="requerido clave" required>
                    <button class="reveal" type="button" aria-label="Mostrar contraseña">${Icon.get('ojo', 17)}</button>
                  </div>
                  <div class="meter" id="c-medidor" data-level="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
                </div>
              </div>
              <button class="btn" type="submit" id="c-guardar">
                ${Icon.get('escudo', 17)}<span>Actualizar contraseña</span>
              </button>
            </form>
          </div>

          <div class="panel">
            <div class="panel-head">${Icon.get('escudo', 18)}<h3>Privacidad</h3></div>
            <div class="panel-body">
              <label class="switch" style="margin-bottom:var(--s-4)">
                <input type="checkbox" id="p-anon" checked>
                <span class="track"></span>
                <span class="text-sm">Participar en la comparativa comunitaria con mi alias</span>
              </label>
              <label class="switch">
                <input type="checkbox" id="p-zona" ${DB.state.usuario.notificaciones.comunidad ? 'checked' : ''}>
                <span class="track"></span>
                <span class="text-sm">Mostrar mi provincia en la tabla de la comunidad</span>
              </label>
              <p class="text-sm muted" style="margin-top:var(--s-4);margin-bottom:0">
                Su nombre y su correo nunca se muestran a otras personas usuarias.
              </p>
            </div>
          </div>
        </div>

        <aside class="stack">
          <div class="panel">
            <div class="panel-head">${Icon.get('reporte', 18)}<h3>Resumen de la cuenta</h3></div>
            <div class="panel-body">
              <dl class="dl">
                <dt>Identificador</dt><dd>${UI.esc(u.id)}</dd>
                <dt>Cuenta creada</dt><dd>${DB.fmt.fechaCorta(u.desde)} ${u.desde.slice(0, 4)}</dd>
                <dt>Registros</dt><dd>${DB.state.registros.length}</dd>
                <dt>CO₂e evitado</dt><dd>${DB.fmt.n(total, 1)} kg</dd>
                <dt>Insignias</dt><dd>${obtenidas} de ${DB.insignias.length}</dd>
                <dt>Racha actual</dt><dd>${DB.racha()} días</dd>
              </dl>
            </div>
            <div class="panel-foot">
              <a href="#/reporte">Ver el reporte completo de emisiones</a>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">${Icon.get('descargar', 18)}<h3>Sus datos</h3></div>
            <div class="panel-body">
              <p class="text-sm">Puede descargar todos sus registros en formato JSON para conservarlos
              o migrarlos a otra plataforma.</p>
              <button class="btn btn-block" type="button" id="p-exportar">
                ${Icon.get('descargar', 16)}<span>Exportar mis registros</span>
              </button>
            </div>
          </div>

          <div class="danger-zone">
            <h3>Eliminar la cuenta</h3>
            <p>Se borran el perfil, los registros, las insignias y el historial de notificaciones.
               No hay forma de recuperarlos después.</p>
            <button class="btn btn-danger" type="button" id="p-eliminar">
              ${Icon.get('basura', 16)}<span>Eliminar mi cuenta</span>
            </button>
          </div>
        </aside>
      </div>`;
  },

  mount() {
    const u = DB.state.usuario;
    const form = document.getElementById('form-perfil');
    const formClave = document.getElementById('form-clave');
    UI.validacionEnVivo(form);
    UI.validacionEnVivo(formClave);

    /* Alias público: lo genera el sistema, el usuario solo lo rota. */
    const especies = ['Yigüirro', 'Quetzal', 'Colibrí', 'Guaria', 'Ceiba', 'Manglar', 'Danta', 'Perezoso'];
    document.getElementById('p-alias').addEventListener('click', () => {
      const nuevo = especies[Math.floor(Math.random() * especies.length)] + '-' +
                    String(Math.floor(Math.random() * 900) + 100);
      DB.guardarPerfil({ alias: nuevo });
      UI.toast('Alias actualizado', `En la comunidad aparecerá como ${nuevo}.`, 'info');
      Router.resolver();
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!UI.validar(form)) {
        UI.toast('Revise los datos', 'Hay campos que necesitan corrección.', 'error');
        return;
      }
      await UI.cargando(document.getElementById('p-guardar'), 900);
      const d = Object.fromEntries(new FormData(form));
      const correoNuevo = d.correo.trim().toLowerCase() !== u.correo.trim().toLowerCase();

      /* El correo se trata aparte: cambiarlo obliga a verificar la dirección
         nueva, y solo surte efecto cuando la persona abre el enlace. */
      DB.guardarPerfil({ nombre: d.nombre, provincia: d.provincia,
                         canton: d.canton, meta: +d.meta });

      if (correoNuevo && DB.state.modo === 'nube' && window.Nube) {
        try {
          await Nube.cambiarCorreo(d.correo.trim());
          UI.toast('Confirme el correo nuevo',
            'Se envió un enlace a ' + d.correo.trim() + '. El cambio se aplica al abrirlo.',
            'info', 9000);
        } catch (err) {
          form.correo.value = u.correo;
          UI.toast('No se pudo cambiar el correo', Nube.traducir(err), 'error', 8000);
        }
      } else {
        if (correoNuevo) DB.guardarPerfil({ correo: d.correo.trim() });
        UI.toast('Perfil actualizado', 'Los cambios ya se reflejan en toda la aplicación.');
      }
      Router.resolver();
    });

    const nueva = document.getElementById('c-nueva');
    nueva.addEventListener('input', () => {
      document.getElementById('c-medidor').dataset.level = nueva.value ? UI.fortaleza(nueva.value) : 0;
    });

    const limpiarClave = () => {
      formClave.reset();
      formClave.querySelectorAll('.field').forEach(f => {
        f.classList.remove('is-valid', 'is-invalid');
        f.querySelector('.field-msg')?.replaceChildren();
      });
      document.getElementById('c-medidor').dataset.level = 0;
    };

    formClave.addEventListener('submit', async e => {
      e.preventDefault();
      if (!UI.validar(formClave)) return;
      const boton = document.getElementById('c-guardar');

      if (DB.state.modo !== 'nube' || !window.Nube) {
        await UI.cargando(boton, 900);
        limpiarClave();
        UI.toast('Contraseña actualizada', 'Deberá usarla la próxima vez que inicie sesión.');
        return;
      }

      boton.classList.add('is-loading');
      boton.setAttribute('aria-busy', 'true');
      try {
        /* Firebase exige autenticación reciente para cambiar la clave, así que
           la contraseña actual del formulario sirve para reautenticar. */
        await Nube.cambiarClave(formClave.actual.value, formClave.nueva.value);
        limpiarClave();
        UI.toast('Contraseña actualizada', 'Deberá usarla la próxima vez que inicie sesión.');
      } catch (err) {
        UI.marcar(formClave.actual, Nube.traducir(err));
        UI.toast('No se cambió la contraseña', Nube.traducir(err), 'error', 7000);
      } finally {
        boton.classList.remove('is-loading');
        boton.removeAttribute('aria-busy');
      }
    });

    document.getElementById('p-exportar').addEventListener('click', async e => {
      await UI.cargando(e.currentTarget, 800);
      UI.toast('Exportación lista',
        `${DB.state.registros.length} registros preparados. El backend enviaría el archivo por la API.`, 'info');
    });

    document.getElementById('p-eliminar').addEventListener('click', () => {
      UI.modal({
        titulo: 'Eliminar la cuenta',
        cuerpo: `
          <p>Esta acción borra de forma permanente ${DB.state.registros.length} registros,
             ${DB.logros().filter(l => l.obtenida).length} insignias y todo su historial.</p>
          <div class="field" style="margin-top:var(--s-4)">
            <label for="del-conf">Escriba <b class="mono">ELIMINAR</b> para confirmar</label>
            <input class="input" id="del-conf" type="text" autocomplete="off" placeholder="ELIMINAR">
          </div>
          ${DB.state.modo === 'nube' ? `
            <div class="field">
              <label for="del-clave">Confirme con su contraseña</label>
              <input class="input" id="del-clave" type="password" autocomplete="current-password">
            </div>` : ''}`,
        acciones: [
          { texto: 'Cancelar', clase: 'btn-ghost' },
          { texto: 'Eliminar definitivamente', clase: 'btn-danger', icono: 'basura', onClick: () => {
              const v = document.getElementById('del-conf');
              if (v.value.trim().toUpperCase() !== 'ELIMINAR') {
                v.closest('.field').classList.add('is-invalid');
                UI.toast('Confirmación incompleta', 'Escriba ELIMINAR para continuar.', 'error');
                return false;   // mantiene la ventana abierta
              }
              if (DB.state.modo !== 'nube' || !window.Nube) {
                UI.toast('Cuenta eliminada',
                  'Sin conexión, los datos simulados se conservan para poder seguir navegando.', 'info');
                DB.state.autenticado = false;
                DB.persistir();
                Router.ir('/acceso');
                return;
              }

              const clave = document.getElementById('del-clave');
              if (!clave.value) {
                clave.closest('.field').classList.add('is-invalid');
                UI.toast('Falta la contraseña', 'Se pide para confirmar que es usted.', 'error');
                return false;
              }
              UI.cerrarModal();
              UI.toast('Eliminando la cuenta…', 'Borrando registros, insignias y perfil.', 'info', 6000);
              Nube.borrarCuenta(clave.value)
                .then(() => UI.toast('Cuenta eliminada', 'Todos sus datos fueron borrados.', 'info'))
                .catch(err => UI.toast('No se eliminó la cuenta', Nube.traducir(err), 'error', 9000));
            } }
        ]
      });
    });
  }
};

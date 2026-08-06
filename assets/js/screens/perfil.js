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
                  <label for="p-meta">Meta mensual de CO₂ evitado</label>
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

          <!-- Estos dos interruptores no hacían nada: se dibujaban con un
               estado fijo, sin nadie escuchándolos, mientras la pantalla de
               Comunidad prometía «podés salirte de la comparación desde tu
               perfil». Ahora guardan de verdad, y la tabla del UC8 los
               respeta. -->
          <div class="panel">
            <div class="panel-head">${Icon.get('escudo', 18)}<h3>Privacidad</h3></div>
            <div class="panel-body">
              <label class="switch" style="margin-bottom:var(--s-4)">
                <input type="checkbox" id="p-anon" ${u.enComunidad === false ? '' : 'checked'}>
                <span class="track"></span>
                <span class="text-sm">Participar en la comparativa comunitaria con mi alias</span>
              </label>
              <label class="switch">
                <input type="checkbox" id="p-zona" ${u.mostrarProvincia === false ? '' : 'checked'}>
                <span class="track"></span>
                <span class="text-sm">Mostrar mi provincia en la tabla de la comunidad</span>
              </label>
              <p class="text-sm muted" style="margin-top:var(--s-4);margin-bottom:0">
                Tu nombre y tu correo nunca se le muestran a nadie más.
              </p>
              <div class="notice" id="p-aviso-privacidad" style="margin-top:var(--s-4)"
                   ${u.enComunidad === false ? '' : 'hidden'}>
                ${Icon.get('info', 16)}
                <div>Estás fuera de la comparativa: no aparecés en la tabla ni en el
                     podio, y tu fila se retiró. Tu progreso propio no cambia.</div>
              </div>
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
                <dt>CO₂ evitado</dt><dd>${DB.fmt.n(total, 1)} kg</dd>
                <dt>Insignias</dt><dd>${obtenidas} de ${DB.insignias.length}</dd>
                <dt>Racha actual</dt><dd>${DB.racha()} días</dd>
              </dl>
            </div>
            <div class="panel-foot">
              <a href="#/reporte">Ver el reporte completo de emisiones</a>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">${Icon.get('descargar', 18)}<h3>Tus datos</h3></div>
            <div class="panel-body">
              <p class="text-sm">Llevate todo lo que registraste. Cada fila incluye el factor de
              emisión y la fuente que se le aplicó, así que el cálculo se puede revisar fuera
              de la aplicación.</p>
              <div style="display:flex;gap:var(--s-2);flex-wrap:wrap">
                <button class="btn" type="button" id="p-csv" style="flex:1;min-width:130px">
                  ${Icon.get('hojaCalculo', 16)}<span>CSV</span>
                </button>
                <button class="btn" type="button" id="p-json" style="flex:1;min-width:130px">
                  ${Icon.get('codigo', 16)}<span>JSON</span>
                </button>
              </div>
              <p class="text-sm muted" style="margin:var(--s-3) 0 0">
                El CSV abre en Excel o en Hojas de cálculo. El JSON sirve para llevar los datos
                a otro sistema.
              </p>
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
        UI.toast('Revisá los datos', 'Hay campos que arreglar.', 'error');
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
          UI.toast('Confirmá el correo nuevo',
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
        UI.toast('Contraseña actualizada', 'Usala la próxima vez que inicies sesión.');
        return;
      }

      boton.classList.add('is-loading');
      boton.setAttribute('aria-busy', 'true');
      try {
        /* Firebase exige autenticación reciente para cambiar la clave, así que
           la contraseña actual del formulario sirve para reautenticar. */
        await Nube.cambiarClave(formClave.actual.value, formClave.nueva.value);
        limpiarClave();
        UI.toast('Contraseña actualizada', 'Usala la próxima vez que inicies sesión.');
      } catch (err) {
        UI.marcar(formClave.actual, Nube.traducir(err));
        UI.toast('No se cambió la contraseña', Nube.traducir(err), 'error', 7000);
      } finally {
        boton.classList.remove('is-loading');
        boton.removeAttribute('aria-busy');
      }
    });

    /* ------------------------------------------------------------------
       Privacidad. Los dos interruptores guardan de verdad.

       Salirse de la comparativa no es un ajuste cosmético: además de dejar de
       aparecer, hay que RETIRAR la fila que ya está publicada en la colección
       `comunidad`. Si solo se dejara de publicar, la última cifra seguiría
       visible para todo el mundo y el interruptor sería una mentira.
       ------------------------------------------------------------------ */
    const anon = document.getElementById('p-anon');
    const zona = document.getElementById('p-zona');
    const avisoPriv = document.getElementById('p-aviso-privacidad');

    anon.addEventListener('change', () => {
      const dentro = anon.checked;
      DB.guardarPerfil({ enComunidad: dentro });
      avisoPriv.hidden = dentro;
      if (dentro) {
        DB.republicarEnComunidad();
        UI.toast('Estás en la comparativa',
          `Volvés a aparecer como ${DB.state.usuario.alias}. Nadie ve tu nombre.`, 'info');
      } else {
        DB.retirarmeDeComunidad();
        UI.toast('Te saliste de la comparativa',
          'Se retiró tu fila. Seguís viendo tu propio progreso igual.', 'info');
      }
    });

    zona.addEventListener('change', () => {
      DB.guardarPerfil({ mostrarProvincia: zona.checked });
      DB.republicarEnComunidad();
      UI.toast(zona.checked ? 'Se muestra tu provincia' : 'Tu provincia queda oculta',
        zona.checked
          ? 'En la tabla aparece tu provincia junto al alias.'
          : 'En la tabla vas a aparecer sin provincia.', 'info');
    });

    /* ------------------------------------------------------------------
       Exportación de verdad.

       Antes este botón solo avisaba de que «el backend enviaría el archivo por
       la API». No hacía falta ningún backend: los datos están en el navegador y
       el navegador sabe escribir archivos. Un botón que promete un archivo
       tiene que entregar un archivo.
       ------------------------------------------------------------------ */
    document.getElementById('p-csv').addEventListener('click', () => {
      UI.descargar(UI.nombreArchivo('mis-acciones-climaticas', 'csv'),
        DB.csv(), 'text/csv;charset=utf-8');
      UI.toast('Descarga lista',
        `${DB.state.registros.length} registros en CSV, con su factor y su fuente.`, 'info');
    });

    document.getElementById('p-json').addEventListener('click', () => {
      UI.descargar(UI.nombreArchivo('mis-acciones-climaticas', 'json'),
        JSON.stringify(DB.exportable(), null, 2));
      UI.toast('Descarga lista', 'Perfil, totales y registros completos en JSON.', 'info');
    });

    document.getElementById('p-eliminar').addEventListener('click', () => {
      UI.modal({
        titulo: 'Eliminar la cuenta',
        cuerpo: `
          <p>Esta acción borra de forma permanente ${DB.state.registros.length} registros,
             ${DB.logros().filter(l => l.obtenida).length} insignias y todo su historial.</p>
          <div class="field" style="margin-top:var(--s-4)">
            <label for="del-conf">Escribí <b class="mono">ELIMINAR</b> para confirmar</label>
            <input class="input" id="del-conf" type="text" autocomplete="off" placeholder="ELIMINAR">
          </div>
          ${DB.state.modo === 'nube' ? `
            <div class="field">
              <label for="del-clave">Confirmá con tu contraseña</label>
              <input class="input" id="del-clave" type="password" autocomplete="current-password">
            </div>` : ''}`,
        acciones: [
          { texto: 'Cancelar', clase: 'btn-ghost' },
          { texto: 'Eliminar definitivamente', clase: 'btn-danger', icono: 'basura', onClick: () => {
              const v = document.getElementById('del-conf');
              if (v.value.trim().toUpperCase() !== 'ELIMINAR') {
                v.closest('.field').classList.add('is-invalid');
                UI.toast('Falta confirmar', 'Escribí ELIMINAR para poder seguir.', 'error');
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
                UI.toast('Falta la contraseña', 'Se pide para confirmar que sos vos.', 'error');
                return false;
              }
              UI.cerrarModal();
              UI.toast('Eliminando la cuenta…', 'Borrando registros, insignias y perfil.', 'info', 6000);
              Nube.borrarCuenta(clave.value)
                .then(() => UI.toast('Cuenta eliminada', 'Todos tus datos fueron borrados.', 'info'))
                .catch(err => UI.toast('No se eliminó la cuenta', Nube.traducir(err), 'error', 9000));
            } }
        ]
      });
    });
  }
};

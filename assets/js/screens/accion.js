/* ============================================================================
   screens/accion.js — UC4 Registrar acción sostenible.

   El panel de cálculo a la derecha muestra la fórmula completa mientras el
   usuario escribe: cantidad × factor de emisión = CO₂e evitado. Ver la
   fórmula, y no solo el resultado, es lo que convierte el registro en
   educación ambiental.

   Aquí también se materializa la relación «extend» del Avance 3: al guardar
   una acción, si se alcanza una meta, se otorga la insignia (UC7).
   ========================================================================= */

Screens.accion = {
  render() {
    const cats = DB.CAT_LIST;
    const hoy = DB.hoyISO();

    return `
      <div class="grid grid-form">

        <div class="panel">
          <div class="panel-head">
            ${Icon.get('accion', 18)}
            <h3>Nueva acción sostenible</h3>
            <span class="tag tag-pine">UC4</span>
          </div>

          <form class="panel-body" id="form-accion" novalidate>

            <fieldset style="border:0;padding:0;margin:0 0 var(--s-6)">
              <legend class="field-label" style="padding:0">Categoría de la acción</legend>
              <div class="choice-grid" role="radiogroup" aria-label="Categoría de la acción">
                ${cats.map((c, i) => `
                  <label class="choice">
                    <input type="radio" name="categoria" value="${c.id}" ${i === 0 ? 'checked' : ''}>
                    <span class="box">
                      ${Icon.get(c.icono, 22)}
                      <b>${c.nombre}</b>
                      <small>Se mide en ${c.unidad}</small>
                    </span>
                  </label>`).join('')}
              </div>
              <p class="hint" id="ayuda-cat" style="margin-top:var(--s-3)">${cats[0].ayuda}</p>
            </fieldset>

            <div class="field">
              <label for="ac-tipo">Tipo de acción</label>
              <select class="select" id="ac-tipo" name="tipo"></select>
              <span class="hint" id="ac-factor"></span>
            </div>

            <div class="grid grid-2" style="gap:var(--s-5)">
              <div class="field">
                <label for="ac-cantidad">Cantidad <span class="req" aria-hidden="true">*</span></label>
                <div class="input-group">
                  <input class="input" id="ac-cantidad" name="cantidad" type="number"
                         min="0.01" step="0.01" placeholder="0,00" inputmode="decimal"
                         data-reglas="requerido numero" required>
                  <span class="addon" id="ac-unidad">kg</span>
                </div>
              </div>

              <div class="field">
                <label for="ac-fecha">Fecha</label>
                <input class="input" id="ac-fecha" name="fecha" type="date" value="${hoy}" max="${hoy}">
                <span class="hint">Puede registrar acciones de días anteriores.</span>
              </div>
            </div>

            <div class="field">
              <label for="ac-nota">Nota <span class="muted" style="font-weight:400">(opcional)</span></label>
              <textarea class="textarea" id="ac-nota" name="nota" maxlength="180"
                        placeholder="Por ejemplo: entrega mensual en el centro de acopio de Curridabat."></textarea>
              <span class="hint"><span id="ac-cuenta">0</span>/180 caracteres</span>
            </div>

            <div style="display:flex;gap:var(--s-3);flex-wrap:wrap">
              <button class="btn btn-primary" type="submit" id="ac-guardar">
                ${Icon.get('guardar', 17)}<span>Guardar acción</span>
              </button>
              <button class="btn" type="reset" id="ac-limpiar">
                ${Icon.get('recargar', 16)}<span>Limpiar</span>
              </button>
              <a class="btn btn-ghost" href="#/inicio" style="margin-left:auto">Cancelar</a>
            </div>
          </form>
        </div>

        <aside>
          <div class="calc">
            <div class="calc-head">
              <span class="label-micro">Cálculo en tiempo real</span>
            </div>

            <div class="calc-value" id="calc-valor">
              <span class="n" id="calc-n">0,00</span>
              <span class="u">kg de CO₂e evitados</span>
            </div>

            <div class="calc-formula">
              <div class="row"><span>Cantidad</span><b id="f-cant">—</b></div>
              <div class="row"><span>Factor de emisión</span><b id="f-factor">—</b></div>
              <div class="row is-total"><span>CO₂e evitado</span><b id="f-total">0,00 kg</b></div>
            </div>

            <div class="calc-equiv">
              ${Icon.get('info', 16)}
              <span id="calc-equiv">Complete el formulario para ver el cálculo.</span>
            </div>
          </div>

          <div class="notice notice-warn" style="margin-top:var(--s-5)">
            ${Icon.get('alerta', 17)}
            <div>
              <b>Sobre el factor eléctrico.</b> La matriz eléctrica del país es casi totalmente
              renovable, por lo que ahorrar un kWh evita aquí muy poco CO₂. El beneficio real de
              esa categoría está en reducir la demanda pico y la presión sobre los embalses.
            </div>
          </div>
        </aside>
      </div>`;
  },

  mount() {
    const form   = document.getElementById('form-accion');
    const selTipo= document.getElementById('ac-tipo');
    const unidad = document.getElementById('ac-unidad');
    const ayuda  = document.getElementById('ayuda-cat');
    const factorTxt = document.getElementById('ac-factor');
    const cant   = document.getElementById('ac-cantidad');
    const nota   = document.getElementById('ac-nota');

    UI.validacionEnVivo(form);

    const catActual = () => DB.CATEGORIAS[form.categoria.value];

    /* Devuelve el formulario a su estado neutro tras guardar o limpiar. */
    function limpiarEstados() {
      form.querySelectorAll('.field').forEach(f => {
        f.classList.remove('is-valid', 'is-invalid');
        f.querySelector('.field-msg')?.replaceChildren();
      });
      document.getElementById('ac-cuenta').textContent = '0';
    }

    /* Rellena el selector de tipos según la categoría marcada. */
    function poblarTipos() {
      const c = catActual();
      selTipo.innerHTML = c.tipos.map(t =>
        `<option value="${t.id}">${t.nombre}</option>`).join('');
      unidad.textContent = c.unidad;
      ayuda.textContent = c.ayuda;
      actualizar();
    }

    /* Recalcula la fórmula del panel derecho. */
    function actualizar() {
      const c = catActual();
      const t = DB.tipoDe(c.id, selTipo.value);
      const q = parseFloat(cant.value);
      const valido = !isNaN(q) && q > 0;
      const co2 = valido ? q * t.factor : 0;

      factorTxt.textContent = `${DB.fmt.n(t.factor, 3)} kg de CO₂e por cada ${c.unidad}.`;
      document.getElementById('f-cant').textContent = valido ? `${DB.fmt.n(q, 2)} ${c.unidad}` : '—';
      document.getElementById('f-factor').textContent = `× ${DB.fmt.n(t.factor, 3)}`;
      document.getElementById('f-total').textContent = `${DB.fmt.n(co2, 2)} kg`;
      document.getElementById('calc-n').textContent = DB.fmt.n(co2, 2);
      document.getElementById('calc-valor').classList.toggle('is-live', valido);
      document.getElementById('calc-equiv').textContent = DB.equivalencia(co2);
    }

    form.querySelectorAll('input[name="categoria"]').forEach(r =>
      r.addEventListener('change', poblarTipos));
    selTipo.addEventListener('change', actualizar);
    cant.addEventListener('input', actualizar);
    nota.addEventListener('input', () => {
      document.getElementById('ac-cuenta').textContent = nota.value.length;
    });
    document.getElementById('ac-limpiar').addEventListener('click', () => {
      // El reinicio nativo ocurre después del evento: se espera un tic.
      setTimeout(() => { limpiarEstados(); poblarTipos(); }, 0);
    });

    poblarTipos();

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!UI.validar(form)) {
        UI.toast('Falta la cantidad', 'Escriba un valor mayor que cero para calcular el CO₂e.', 'error');
        return;
      }

      /* Estado previo de los logros: sirve para detectar la insignia nueva. */
      const antes = new Set(DB.logros().filter(l => l.obtenida).map(l => l.id));

      await UI.cargando(document.getElementById('ac-guardar'), 850);

      const datos = Object.fromEntries(new FormData(form));
      const reg = DB.agregarRegistro(datos);

      const nuevas = DB.logros().filter(l => l.obtenida && !antes.has(l.id));

      form.reset();
      limpiarEstados();
      poblarTipos();

      if (nuevas.length) {
        /* Relación «extend»: UC7 solo ocurre si el registro alcanza la meta. */
        const ins = nuevas[0];
        UI.modal({
          etiqueta: `Insignia desbloqueada: ${ins.nombre}`,
          cuerpo: `
            <div class="modal-seal">
              <span class="seal is-${ins.tono}">${Icon.get(ins.icono, 32, 1.8)}</span>
            </div>
            <div style="text-align:center">
              <span class="label-micro">Insignia desbloqueada</span>
              <h2 style="margin:var(--s-2) 0 var(--s-3)">${UI.esc(ins.nombre)}</h2>
              <p class="muted text-sm">${UI.esc(ins.criterio)}</p>
            </div>`,
          acciones: [
            { texto: 'Seguir registrando', clase: 'btn-ghost' },
            { texto: 'Ver mis insignias', clase: 'btn-primary', icono: 'insignia',
              onClick: () => Router.ir('/insignias') }
          ]
        });
      } else {
        UI.toast('Acción registrada',
          `${DB.fmt.co2(reg.co2)} kg de CO₂e evitados el ${DB.fmt.fechaCorta(reg.fecha)}.`);
        /* El foco vuelve a la cantidad solo si no se abrió la ventana de
           insignia: si no, al perderlo se marcaría el campo vacío como error. */
        cant.focus();
        limpiarEstados();
      }
    });
  }
};

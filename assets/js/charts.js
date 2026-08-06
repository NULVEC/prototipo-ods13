/* ============================================================================
   charts.js — Configuración de Chart.js.

   Los gráficos heredan el mismo sistema de diseño que el resto de la app:
   misma tipografía monoespaciada en los ejes, mismas reglas de 1px, misma
   paleta. Un gráfico con los colores por defecto de la librería delataría
   que no forma parte del sistema.
   ========================================================================= */

const Charts = (() => {

  /* --------------------------------------------------------------------
     La paleta se LEE de las variables CSS en lugar de repetirse aquí.

     Dos razones. La primera es que un color escrito dos veces se
     desincroniza el día que alguien retoca `tokens.css` y se olvida de
     este archivo. La segunda es el tema oscuro: con los valores fijos, la
     rejilla y las etiquetas de los ejes quedaban en tono claro sobre
     fondo oscuro y los gráficos se volvían ilegibles.

     Se lee una vez y se guarda; `Charts.reset()` tira la caché cuando la
     persona cambia de tema, y el enrutador vuelve a dibujar.
     -------------------------------------------------------------------- */
  let cache = null;

  const leer = () => {
    const cs = getComputedStyle(document.documentElement);
    const v = (nombre, respaldo) => (cs.getPropertyValue(nombre).trim() || respaldo);
    return {
      pine:  v('--pine',        '#17493b'),
      azul:  v('--azul',        '#1d4e9b'),
      ochre: v('--ochre-fill',  '#b8862a'),
      verde: v('--pine-mid',    '#4e8f7c'),
      brasa: v('--ember',       '#b8412a'),
      linea: v('--line',        '#ccd2c7'),
      tinta: v('--ink',         '#12211c'),
      tinta3:v('--ink-3',       '#58665e'),
      papel: v('--paper-raised','#f4f5f0'),
      fondoAviso: v('--deep',   '#0c2921'),
      bordeAviso: v('--deep-line-firm', 'rgba(194,211,203,.25)'),
      textoAviso: v('--on-deep-strong', '#f2f5f1'),
      textoAviso2:v('--on-deep', '#c2d3cb')
    };
  };

  /* Se expone como objeto con getters para que `Charts.PALETA.azul` siga
     funcionando en las pantallas que lo usan para pintar una leyenda, pero
     devolviendo siempre el valor del tema activo. */
  const PALETA = new Proxy({}, {
    get: (_, k) => (cache || (cache = leer()))[k],
    ownKeys: () => Object.keys(cache || (cache = leer())),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true })
  });

  const registro = new Map();     // id de lienzo -> instancia, para destruir

  /** Aplica los valores globales. Se repite tras un cambio de tema. */
  function preparar() {
    if (typeof Chart === 'undefined') return;
    const P = cache || (cache = leer());
    Chart.defaults.font.family = "'IBM Plex Mono', monospace";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = P.tinta3;
    Chart.defaults.animation.duration = quieto() ? 0 : 620;
    Chart.defaults.animation.easing = 'easeOutCubic';
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip = {
      ...Chart.defaults.plugins.tooltip,
      backgroundColor: P.fondoAviso,
      titleColor: P.textoAviso,
      bodyColor: P.textoAviso2,
      titleFont: { family: "'IBM Plex Sans', sans-serif", size: 12, weight: '600' },
      bodyFont: { family: "'IBM Plex Mono', monospace", size: 12 },
      padding: 10,
      cornerRadius: 3,
      displayColors: false,
      borderColor: P.bordeAviso,
      borderWidth: 1
    };
  }

  const quieto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Olvida la paleta cacheada. La llama el conmutador de tema. */
  function reset() { cache = null; preparar(); }

  const ejes = (opts = {}) => ({
    x: {
      grid: { display: false },
      border: { color: PALETA.linea },
      ticks: { maxRotation: 0, autoSkipPadding: 12, ...(opts.xTicks || {}) }
    },
    y: {
      beginAtZero: true,
      grid: { color: PALETA.linea, tickBorderDash: [3, 3] },
      border: { display: false, dash: [3, 3] },
      ticks: { padding: 8, ...(opts.yTicks || {}) },
      ...(opts.y || {})
    }
  });

  /** Crea (o recrea) un gráfico en un lienzo por id. */
  function montar(id, config) {
    preparar();
    const cv = document.getElementById(id);
    if (!cv || typeof Chart === 'undefined') return null;
    registro.get(id)?.destroy();
    const ch = new Chart(cv.getContext('2d'), config);
    registro.set(id, ch);
    return ch;
  }

  function destruirTodo() {
    registro.forEach(c => c.destroy());
    registro.clear();
  }

  /* ------------------------------------------------------------------ */
  /* UC5 — Evolución del CO2 evitado por semana                          */
  /* ------------------------------------------------------------------ */
  function evolucion(id, serie) {
    return montar(id, {
      type: 'line',
      data: {
        labels: serie.map(s => s.etiqueta),
        datasets: [{
          data: serie.map(s => s.co2),
          borderColor: PALETA.pine,
          borderWidth: 2,
          tension: 0.32,
          pointRadius: 3,
          pointBackgroundColor: PALETA.papel,
          pointBorderColor: PALETA.pine,
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          fill: {
            target: 'origin',
            above: 'rgba(23, 73, 59, .10)'
          }
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: ejes({ yTicks: { callback: v => v + ' kg' } }),
        plugins: {
          tooltip: {
            callbacks: {
              title: c => 'Semana ' + c[0].label,
              label: c => DB.fmt.co2(c.parsed.y) + ' kg CO₂ evitados'
            }
          }
        }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* UC5 — Distribución por día de la semana                             */
  /* ------------------------------------------------------------------ */
  function porDiaSemana(id, registros) {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const suma = new Array(7).fill(0);
    registros.forEach(r => {
      const d = new Date(r.fecha + 'T00:00:00').getDay();
      suma[d] += r.co2;
    });
    // Se muestra la semana empezando en lunes, como el calendario local.
    const orden = [1, 2, 3, 4, 5, 6, 0];
    return montar(id, {
      type: 'bar',
      data: {
        labels: orden.map(i => dias[i]),
        datasets: [{
          data: orden.map(i => +suma[i].toFixed(2)),
          backgroundColor: orden.map(i => (i === 0 || i === 6) ? PALETA.verde : PALETA.pine),
          borderRadius: 2,
          barPercentage: 0.66
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: ejes({ yTicks: { callback: v => v + ' kg' } }),
        plugins: {
          tooltip: { callbacks: { label: c => `${DB.fmt.co2(c.parsed.y)} kg CO₂` } }
        }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* UC8 — Mi progreso frente al promedio de la comunidad                */
  /* ------------------------------------------------------------------ */
  function contraComunidad(id, serieYo) {
    // El promedio comunitario se simula como una fracción estable del
    // acumulado propio, con leve variación por semana.
    const acumYo = [], acumCom = [];
    let a = 0, b = 0;
    serieYo.forEach((s, i) => {
      a += s.co2;
      b += s.co2 * (0.82 + Math.sin(i / 2.1) * 0.12);
      acumYo.push(+a.toFixed(1));
      acumCom.push(+b.toFixed(1));
    });
    return montar(id, {
      type: 'line',
      data: {
        labels: serieYo.map(s => s.etiqueta),
        datasets: [
          { label: 'Vos', data: acumYo, borderColor: PALETA.azul, borderWidth: 2.5,
            pointRadius: 0, pointHoverRadius: 4, tension: .3 },
          { label: 'Promedio de la comunidad', data: acumCom, borderColor: PALETA.tinta3,
            borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0, pointHoverRadius: 4, tension: .3 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: ejes({ yTicks: { callback: v => v + ' kg' } }),
        plugins: {
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ${DB.fmt.co2(c.parsed.y)} kg` } }
        }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* UC9 — Reporte mensual apilado por categoría                         */
  /* ------------------------------------------------------------------ */
  function mensualApilado(id, serie) {
    const cats = DB.CAT_LIST;
    return montar(id, {
      type: 'bar',
      data: {
        labels: serie.map(s => DB.fmt.mes(s.mes)),
        datasets: cats.map(c => ({
          label: c.nombre,
          data: serie.map(s => +(s.cats[c.id] || 0).toFixed(2)),
          backgroundColor: c.color,
          borderRadius: 2,
          barPercentage: 0.62
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { display: false }, border: { color: PALETA.linea } },
          y: { stacked: true, beginAtZero: true, grid: { color: PALETA.linea },
               border: { display: false }, ticks: { callback: v => v + ' kg' } }
        },
        plugins: {
          tooltip: {
            callbacks: { label: c => `${c.dataset.label}: ${DB.fmt.co2(c.parsed.y)} kg` }
          }
        }
      }
    });
  }

  return { PALETA, montar, destruirTodo, reset, evolucion, porDiaSemana,
           contraComunidad, mensualApilado };
})();

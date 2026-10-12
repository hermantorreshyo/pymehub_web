/**
 * Gráficos dinámicos con Chart.js (RNF-043, DEC-08).
 *
 * - Chart.js 4.4.1 se sirve desde el propio dominio (vendor/chartjs) y se carga bajo demanda:
 *   no pesa en la primera carga (RNF-051), funciona sin conexión tras la primera visita (RF-061)
 *   y la CSP no necesita orígenes externos para scripts.
 * - Los colores salen de tokens.css (variables --chart-*): no hay colores en el código (RNF-034).
 * - Cada gráfico lleva una alternativa textual: tabla accesible con los mismos datos (RNF-043, RNF-045).
 * - Sin animación con prefers-reduced-motion (RNF-047).
 */
import { h } from './dom.js';

let loading = null;
const live = new Set();

export function loadChartJs() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/chartjs/chart.umd.js';
      s.async = true;
      s.onload = () => resolve(window.Chart);
      s.onerror = () => { loading = null; reject(new Error('No se pudo cargar Chart.js')); };
      document.head.append(s);
    });
  }
  return loading;
}

function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Destruye los gráficos cuyo lienzo ya no está en el documento (cambio de vista). */
function sweep() {
  for (const c of live) {
    if (!c.canvas?.isConnected) {
      c.destroy();
      live.delete(c);
    }
  }
}

/**
 * Bloque de gráfico con su tabla alternativa.
 *   chartBlock({
 *     label: 'Índice de bienestar por semana',
 *     type: 'line' | 'bar',
 *     labels: ['15 sept', …],
 *     series: [{ name: 'Índice', data: [62, 64, null], color: 1 }],   // color: 1..3 (orden fijo)
 *     yMin: 0, yMax: 100, ySuffix: '', area: true, height: 260, spanGaps: false,
 *   })
 */
export function chartBlock({ label, type = 'line', labels, series, yMin = null, yMax = null, ySuffix = '', area = false, height = 260, stepY = null, spanGaps = false }) {
  const canvas = h('canvas', { role: 'img', 'aria-label': label });
  const table = h('table', { class: 'visually-hidden' },
    h('caption', { text: label }),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col', text: 'Periodo' }), series.map((s) => h('th', { scope: 'col', text: s.name })))),
    h('tbody', {}, labels.map((l, i) => h('tr', {},
      h('th', { scope: 'row', text: l }),
      series.map((s) => h('td', { text: s.data[i] === null || s.data[i] === undefined ? 'Sin datos suficientes' : `${s.data[i]}${ySuffix}` }))))));
  const wrap = h('div', { class: 'chart', style: { '--chart-h': `${height}px` } }, h('div', { class: 'chart__canvas' }, canvas), table);

  // Se dibuja cuando el lienzo ya está en el documento y tiene tamaño
  requestAnimationFrame(() => requestAnimationFrame(async () => {
    if (!canvas.isConnected) return;
    let Chart;
    try {
      Chart = await loadChartJs();
    } catch {
      wrap.classList.add('chart--error');
      wrap.prepend(h('p', { class: 'muted small', text: 'No se ha podido cargar el gráfico. Los datos están disponibles en la tabla accesible.' }));
      return;
    }
    if (!canvas.isConnected) return;
    sweep();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const font = token('--font-ui') || 'Inter, system-ui, sans-serif';
    const axis = token('--chart-axis');
    const grid = token('--chart-grid');
    const surface = token('--chart-surface');
    const datasets = series.map((s) => {
      const color = token(`--chart-${s.color ?? 1}`);
      return {
        label: s.name,
        data: s.data,
        borderColor: color,
        backgroundColor: type === 'bar' ? color : (area ? token(`--chart-${s.color ?? 1}-soft`) || 'transparent' : color),
        fill: type === 'line' && area,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: surface,
        pointBorderWidth: 2,
        spanGaps, // true en series diarias (días sin respuesta); false en semanales (huecos por anonimato)
        borderRadius: type === 'bar' ? 4 : 0,
        borderSkipped: 'start',
        maxBarThickness: 36,
      };
    });
    const chart = new Chart(canvas, {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reduce ? false : { duration: 700, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: series.length > 1,
            position: 'bottom',
            labels: { color: axis, font: { family: font, size: 12 }, usePointStyle: true, boxWidth: 8, padding: 16 },
          },
          tooltip: {
            backgroundColor: token('--navy'),
            titleFont: { family: font, weight: '600' },
            bodyFont: { family: font },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => (ctx.raw === null || ctx.raw === undefined
                ? `${ctx.dataset.label}: sin datos suficientes`
                : `${ctx.dataset.label}: ${String(ctx.raw).replace('.', ',')}${ySuffix}`),
            },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { color: grid }, ticks: { color: axis, font: { family: font, size: 12 }, maxRotation: 0, autoSkip: true } },
          y: {
            min: yMin ?? undefined,
            max: yMax ?? undefined,
            grid: { color: grid },
            border: { display: false },
            ticks: { color: axis, font: { family: font, size: 12 }, stepSize: stepY ?? undefined, callback: (v) => `${v}${ySuffix}` },
          },
        },
      },
    });
    live.add(chart);
  }));
  return wrap;
}

import { admin } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatDateTime } from '../../lib/format.js';
import { page } from '../../components/layout/Page.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { alertBox } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { dataView } from '../../components/ui/StateView.js';
import { toast } from '../../components/ui/Toast.js';

/**
 * Diagnóstico del despliegue (Administración): comprueba que todo lo entregado está instalado y
 * configurado, en lenguaje llano y con «qué hacer» en cada punto. Solo lee; nunca muestra secretos.
 * Pensado para que lo lance cualquier persona con cuenta de plataforma, sin conocimientos técnicos.
 */
const ESTADO = {
  OK: { text: 'Correcto', tone: 'success', icon: 'circle-check' },
  AVISO: { text: 'Revisar', tone: 'warning', icon: 'triangle-alert' },
  ERROR: { text: 'Falla', tone: 'danger', icon: 'circle-alert' },
  INFO: { text: 'Informativo', tone: 'info', icon: 'info' },
};
const TITULO = {
  OK: 'Todo está bien',
  AVISO: 'Funciona, pero hay puntos que revisar',
  ERROR: 'Hay problemas que resolver',
};

export default function diagnosticoView() {
  let soloProblemas = false;
  let ultimo = null;
  const view = dataView({
    loadingLabel: 'Comprobando el despliegue… (tarda unos segundos)',
    lines: 8,
    load: (signal) => admin.diagnostics(signal),
    render: (d, { reload }) => {
      ultimo = d;
      const lista = h('div', { class: 'stack' });
      const pintar = () => lista.replaceChildren(...grupos(d, soloProblemas));
      const filtro = h('label', { class: 'checkbox' },
        h('input', { type: 'checkbox', checked: soloProblemas, onchange: (e) => { soloProblemas = e.target.checked; pintar(); } }),
        h('span', { text: 'Ver solo lo que hay que revisar' }));
      pintar();
      const otra = button({ text: 'Comprobar de nuevo', variant: 'secondary', iconName: 'refresh-cw' });
      otra.addEventListener('click', () => { setLoading(otra, true, 'Comprobando…'); reload(); });
      return h('div', { class: 'stack' },
        resumen(d),
        h('div', { class: 'diag-toolbar' }, filtro,
          h('div', { class: 'row-actions' },
            otra,
            button({ text: 'Copiar el informe', variant: 'tertiary', iconName: 'copy', onClick: () => copiar(ultimo) }),
            button({ text: 'Descargar', variant: 'tertiary', iconName: 'download', onClick: () => descargar(ultimo) }))),
        lista);
    },
  });
  return page({
    title: 'Diagnóstico',
    subtitle: 'Comprueba que el despliegue está completo y sano. No cambia nada y no muestra contraseñas ni claves.',
    children: [view],
  });
}

function resumen(d) {
  const e = ESTADO[d.estado];
  const r = d.resumen;
  return h('section', { class: ['diag-summary', `diag-summary--${e.tone}`], 'aria-live': 'polite' },
    h('span', { class: 'diag-summary__icon' }, icon(e.icon, { size: 'lg' })),
    h('div', { class: 'diag-summary__text' },
      h('h2', { text: TITULO[d.estado] }),
      h('p', { text: `${r.OK} correctas · ${r.AVISO} para revisar · ${r.ERROR} fallos · ${r.INFO} informativas` }),
      h('p', { class: 'small muted', text: `API v${d.version} · comprobado el ${formatDateTime(d.generado_en)}` })));
}

function grupos(d, soloProblemas) {
  const porGrupo = new Map();
  for (const c of d.comprobaciones) {
    if (soloProblemas && !['AVISO', 'ERROR'].includes(c.estado)) continue;
    if (!porGrupo.has(c.grupo)) porGrupo.set(c.grupo, []);
    porGrupo.get(c.grupo).push(c);
  }
  if (porGrupo.size === 0) return [alertBox({ tone: 'success', title: 'Nada que revisar', text: 'Todas las comprobaciones están correctas o son informativas.' })];
  return [...porGrupo].map(([grupo, items]) => {
    const peor = ['ERROR', 'AVISO', 'OK', 'INFO'].find((s) => items.some((c) => c.estado === s));
    return card({
      title: grupo,
      iconName: ESTADO[peor].icon,
      body: h('ul', { class: 'diag-list', role: 'list' }, items.map((c) => {
        const e = ESTADO[c.estado];
        return h('li', { class: ['diag-item', `diag-item--${e.tone}`] },
          h('span', { class: 'diag-item__state' }, icon(e.icon, { size: 'sm' }), h('span', { text: e.text })),
          h('div', { class: 'diag-item__body' },
            h('strong', { text: c.nombre }),
            h('p', { text: c.detalle }),
            c.accion && c.estado !== 'OK' ? h('p', { class: 'diag-item__action' }, h('span', { text: 'Qué hacer: ' }), h('code', { text: c.accion })) : null));
      })),
    });
  });
}

function texto(d) {
  const lineas = [`Diagnóstico de Pyme Hub · API v${d.version} · ${d.generado_en}`, `Resultado: ${d.estado} (${d.resumen.OK} OK, ${d.resumen.AVISO} avisos, ${d.resumen.ERROR} errores, ${d.resumen.INFO} informativas)`];
  let grupo = null;
  for (const c of d.comprobaciones) {
    if (c.grupo !== grupo) { grupo = c.grupo; lineas.push('', `== ${grupo}`); }
    lineas.push(`[${c.estado}] ${c.nombre}: ${c.detalle}`);
    if (c.accion && c.estado !== 'OK') lineas.push(`    → ${c.accion}`);
  }
  return lineas.join('\n');
}

async function copiar(d) {
  if (!d) return;
  try {
    await navigator.clipboard.writeText(texto(d));
    toast('Informe copiado. Pégalo en un correo o en el chat de soporte.');
  } catch {
    toast('No se ha podido copiar; usa «Descargar».', { tone: 'error' });
  }
}

function descargar(d) {
  if (!d) return;
  const url = URL.createObjectURL(new Blob([texto(d)], { type: 'text/plain;charset=utf-8' }));
  const a = h('a', { href: url, download: `diagnostico-pymehub-${d.generado_en.slice(0, 10)}.txt` });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

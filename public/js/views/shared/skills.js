import { ApiError, skills } from '../../services/api.js';
import { h, uniqueId } from '../../lib/dom.js';
import { formatDate, formatNumber, plural } from '../../lib/format.js';
import { session } from '../../lib/store.js';
import { categoryBadge, minutes, moduleArt, NIVELES } from '../../lib/training.js';
import { page } from '../../components/layout/Page.js';
import { badge } from '../../components/ui/Badge.js';
import { button, linkButton, setLoading } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { alertBox } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { table } from '../../components/ui/Table.js';

/**
 * Pyme Hub Skills (fase 9d): cursos de formadores externos revisados por Pyme Hub.
 * - Gerencia: licencia para toda la empresa, precio sin IVA (+ IVA).
 * - Personas empleadas: compra para sí mismas, precio con IVA incluido.
 * - RR. HH.: consulta el catálogo; la compra la hace la gerencia.
 */

// Vuelta desde Stripe Checkout (?compra=ok | cancelada)
const RETORNO = (() => {
  const v = new URLSearchParams(location.search).get('compra');
  if (v) history.replaceState(null, '', `${location.pathname}${location.hash || '#/skills'}`);
  return v === 'ok' || v === 'cancelada' ? v : null;
})();
let retornoMostrado = false;

const money = (v) => formatNumber(v, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function skillsView() {
  const persona = session.perfil === 'EMPLEADO';
  const comprador = session.perfil === 'GERENTE' || persona;
  const view = dataView({
    loadingLabel: 'Cargando los cursos de Skills…',
    lines: 6,
    load: async (signal) => {
      const [cat, compras] = await Promise.all([skills.catalog(signal), comprador ? skills.purchases(signal) : Promise.resolve({ data: [] })]);
      return { cursos: cat.data ?? [], meta: cat.meta ?? {}, compras: compras.data ?? [] };
    },
    render: (d, { reload }) => h('div', { class: 'stack' },
      retorno(reload),
      h('p', { class: 'small muted', text: persona
        ? 'Cursos de formadores expertos, revisados por Pyme Hub. Los que paga tu empresa te salen gratis; también puedes comprar uno por tu cuenta (IVA incluido).'
        : 'Cursos de formadores expertos, revisados por Pyme Hub. Una licencia da acceso a toda tu plantilla; después se asigna como cualquier módulo.' }),
      d.cursos.length === 0
        ? emptyState({ title: 'Todavía no hay cursos en Skills.', text: 'Muy pronto habrá cursos de formadores externos.', iconName: 'store' })
        : h('ul', { class: 'catalog-grid', role: 'list' }, d.cursos.map((c, i) => courseCard(c, i, reload))),
      comprador && d.compras.length ? purchasesCard(d.compras, persona) : null),
  });
  return page({
    title: 'Pyme Hub Skills',
    subtitle: persona ? 'Aprende con formadores expertos, a tu ritmo.' : 'Cursos de formadores externos para tu plantilla.',
    children: [h('div', { class: 'cq' }, view)],
  });
}

function retorno(reload) {
  if (!RETORNO || retornoMostrado) return null;
  retornoMostrado = true;
  if (RETORNO === 'cancelada') return alertBox({ tone: 'info', title: 'Compra cancelada', text: 'No se ha cobrado nada.' });
  setTimeout(reload, 4000);
  return alertBox({ tone: 'success', title: 'Compra realizada', text: 'Stripe nos confirma el pago en unos segundos; el curso aparecerá como disponible.' });
}

function courseCard(c, index, reload) {
  const persona = session.perfil === 'EMPLEADO';
  const titleId = uniqueId('skill');
  const imp = c.importes[persona ? 'PERSONA' : 'EMPRESA'];
  const precio = persona
    ? h('p', { class: 'skill-price' }, h('strong', { text: money(imp.total) }), h('span', { class: 'small muted', text: ' IVA incluido' }))
    : h('p', { class: 'skill-price' }, h('strong', { text: money(imp.base) }), h('span', { class: 'small muted', text: ' + IVA · licencia para toda la empresa' }));

  let accion;
  if (c.licencia_empresa) {
    accion = h('div', { class: 'stack-sm' },
      badge(persona ? 'Incluido por tu empresa' : 'Licencia de tu empresa', { tone: 'success', iconName: 'circle-check' }),
      linkButton({ text: persona ? 'Ver en mi formación' : 'Asignar a la plantilla', href: persona ? '#/formacion' : `#/formacion/modulos/${c.id}`, variant: 'secondary', iconName: 'arrow-right' }));
  } else if (c.comprado_por_mi) {
    accion = h('div', { class: 'stack-sm' },
      badge('Comprado por ti', { tone: 'success', iconName: 'circle-check' }),
      linkButton({ text: 'Ir a mi formación', href: '#/formacion', variant: 'secondary', iconName: 'arrow-right' }));
  } else if (session.perfil === 'RRHH') {
    accion = h('p', { class: 'small muted', text: 'La licencia la contrata la gerencia.' });
  } else {
    const btn = button({ text: persona ? 'Comprar para mí' : 'Comprar licencia', iconName: 'credit-card', variant: 'primary' });
    btn.addEventListener('click', () => purchaseDialog(c, imp, reload));
    accion = h('div', { class: 'stack-sm' }, btn,
      c.formador.cobra_online ? null : h('p', { class: 'small muted', text: 'Este formador aún está activando el cobro online.' }));
  }

  return h('li', { class: 'catalog-card skill-card', style: { '--i': index }, 'aria-labelledby': titleId },
    moduleArt(c.categoria, { size: 'md' }),
    h('div', { class: 'catalog-card__body' },
      h('div', { class: 'training-item__tags' },
        categoryBadge(c.categoria),
        h('span', { class: 'badge badge--info' }, icon('store', { size: 'sm' }), 'Skills')),
      h('h3', { class: 'catalog-card__title', id: titleId, text: c.titulo }),
      h('p', { class: 'small muted inline-note' }, icon('graduation-cap', { size: 'sm' }), h('span', { text: c.formador.nombre })),
      h('p', { class: 'catalog-card__summary', text: c.resumen }),
      c.objetivos.length ? h('ul', { class: 'skill-goals' }, c.objetivos.slice(0, 3).map((o) => h('li', {}, icon('check', { size: 'sm' }), h('span', { text: o })))) : null,
      h('p', { class: 'catalog-card__meta' },
        h('span', {}, icon('clock', { size: 'sm' }), minutes(c.duracion_min)),
        h('span', {}, icon('signal-medium', { size: 'sm' }), NIVELES[c.nivel] ?? c.nivel),
        h('span', {}, icon('list-checks', { size: 'sm' }), plural(c.bloques, 'bloque', 'bloques'))),
      precio),
    h('div', { class: 'catalog-card__action' }, accion));
}

/** Resumen de la compra, condiciones y, para consumidores, renuncia al desistimiento. */
function purchaseDialog(c, imp, reload) {
  const persona = session.perfil === 'EMPLEADO';
  const demo = Boolean(session.me?.demo);
  const titleId = uniqueId('compra');
  const notice = h('div', { 'aria-live': 'polite' });
  const check = (name, content) => {
    const id = uniqueId(name);
    return h('div', { class: 'field', dataset: { field: name } },
      h('label', { class: 'checkbox', for: id }, h('input', { type: 'checkbox', id, name }), h('span', {}, ...content)),
      h('p', { class: 'field__error', hidden: true }));
  };
  const submit = button({ text: 'Pagar con Stripe', type: 'submit', iconName: 'credit-card' });
  if (demo) submit.disabled = true;
  const form = h('form', { class: 'stack', novalidate: true },
    h('dl', { class: 'order-summary' },
      row(persona ? 'Curso para ti' : 'Licencia para toda la empresa', ''),
      row('Base imponible', money(imp.base), 'order-summary__base'),
      row(imp.iva_pct > 0 ? `IVA (${formatNumber(imp.iva_pct)} %)` : 'IVA (formación exenta)', money(imp.iva)),
      row(persona ? 'Total (IVA incluido)' : 'Total', money(imp.total), 'order-summary__total')),
    check('acepta_condiciones', ['Acepto las ', h('a', { href: '#/legal/skills', target: '_blank', rel: 'noopener', text: 'condiciones de Pyme Hub Skills' }), '.']),
    persona ? check('renuncia_desistimiento', ['Quiero empezar el curso ahora y sé que, al hacerlo, pierdo el derecho de desistimiento de 14 días (contenido digital).']) : null,
    notice,
    demo
      ? alertBox({ tone: 'info', text: 'En la demostración no se puede comprar.' })
      : alertBox({ tone: 'info', title: 'Modo de prueba', text: 'No se cobra nada real. En Stripe usa la tarjeta 4242 4242 4242 4242.' }),
    h('div', { class: 'dialog__actions' }, button({ text: 'Cancelar', variant: 'tertiary', onClick: () => dialog.close() }), submit));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    notice.replaceChildren();
    let ok = true;
    for (const name of ['acepta_condiciones', persona ? 'renuncia_desistimiento' : null].filter(Boolean)) {
      const f = form.querySelector(`[data-field="${name}"] .field__error`);
      f.hidden = form.elements[name].checked;
      if (!form.elements[name].checked) {
        f.replaceChildren(icon('circle-alert', { size: 'sm' }), h('span', { text: 'Obligatorio para continuar.' }));
        ok = false;
      }
    }
    if (!ok) return;
    setLoading(submit, true, 'Abriendo Stripe…');
    try {
      const r = await skills.purchase({ modulo_id: c.id, acepta_condiciones: true, ...(persona ? { renuncia_desistimiento: true } : {}) });
      location.assign(r.url);
    } catch (error) {
      setLoading(submit, false);
      notice.append(alertBox({ tone: 'danger', text: error instanceof ApiError ? error.message : String(error) }));
      if (error.code === 'PH-SKL-003') reload();
    }
  });

  const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': titleId },
    h('header', { class: 'dialog__header' },
      h('h2', { id: titleId, text: c.titulo }),
      h('button', { type: 'button', class: 'btn btn--icon', 'aria-label': 'Cerrar', onclick: () => dialog.close() }, icon('x'))),
    form);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

function row(label, value, cls = null) {
  return h('div', { class: ['order-summary__row', cls] }, h('dt', { text: label }), h('dd', { text: value }));
}

function purchasesCard(rows, persona) {
  const ESTADO = { PAGADA: ['Pagada', 'success', 'circle-check'], FALLIDA: ['No completada', 'neutral', 'x'], REEMBOLSADA: ['Reembolsada', 'warning', 'rotate-ccw'] };
  return card({
    title: persona ? 'Mis compras' : 'Licencias de la empresa',
    iconName: 'receipt',
    body: table({
      caption: 'Compras en Pyme Hub Skills',
      rows,
      columns: [
        { label: 'Curso', primary: true, render: (p) => p.titulo },
        { label: 'Formador', render: (p) => p.formador },
        { label: 'Fecha', render: (p) => formatDate(p.pagado_en ?? p.creado_en) },
        { label: persona ? 'Total (IVA incl.)' : 'Base', render: (p) => money(persona ? p.total : p.base) },
        { label: persona ? 'IVA' : 'Total con IVA', render: (p) => money(persona ? p.iva : p.total) },
        { label: 'Estado', render: (p) => { const e = ESTADO[p.estado] ?? [p.estado, 'neutral', 'info']; return badge(e[0] + (p.ficticia ? ' · demo' : ''), { tone: e[1], iconName: e[2] }); } },
      ],
    }),
  });
}

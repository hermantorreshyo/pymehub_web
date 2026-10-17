import { ApiError, billing } from '../../services/api.js';
import { h, uniqueId } from '../../lib/dom.js';
import { formatDate, formatNumber, plural } from '../../lib/format.js';
import { loadParams } from '../../lib/params.js';
import { session } from '../../lib/store.js';
import { page } from '../../components/layout/Page.js';
import { badge, vigenciaBadge } from '../../components/ui/Badge.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { alertBox } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { table } from '../../components/ui/Table.js';
import { toast } from '../../components/ui/Toast.js';

/**
 * Suscripción de la empresa (fases 9b y 9c, gerencia): vigencia, contratación o renovación con
 * Stripe en modo prueba (resumen con base, IVA y total), portal del cliente y facturas.
 */

// Vuelta desde Stripe Checkout: ?pago=ok | cancelado (se lee una vez y se limpia la URL)
const RETORNO = (() => {
  const v = new URLSearchParams(location.search).get('pago');
  if (v) history.replaceState(null, '', `${location.pathname}${location.hash || '#/suscripcion'}`);
  return v === 'ok' || v === 'cancelado' ? v : null;
})();
let retornoMostrado = false;

const PAGO = {
  PAGADO: { text: 'Pagado', tone: 'success', icon: 'circle-check' },
  FALLIDO: { text: 'Fallido', tone: 'danger', icon: 'circle-alert' },
  PENDIENTE: { text: 'Pendiente', tone: 'warning', icon: 'clock' },
  ANULADO: { text: 'Anulado', tone: 'neutral', icon: 'x' },
};
const PLAN = { ENTRADA: 'Entrada', COMPLETO: 'Completo' };
const CICLO = { MENSUAL: 'Mensual', ANUAL: 'Anual' };

export const money = (v) => formatNumber(v, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function suscripcionView() {
  const content = dataView({
    loadingLabel: 'Cargando tu suscripción…',
    lines: 6,
    load: async (signal) => {
      const [s, p, inv] = await Promise.all([billing.subscription(signal), loadParams(), billing.invoices(signal)]);
      return { s, p, inv: inv.data ?? [] };
    },
    render: (d, { reload }) => {
      return h('div', { class: 'stack' },
        retorno(d.s, reload),
        statusCard(d.s, d.p),
        d.s.pago_online.suscripcion ? null : contractCard(d.s, d.p),
        invoicesCard(d.inv));
    },
  });
  return page({
    title: 'Suscripción',
    subtitle: 'Tu plan, su vigencia, el pago y las facturas de Pyme Hub.',
    back: { href: '#/configuracion', label: 'Configuración' },
    children: [content],
  });
}

/** Tras volver de Stripe: el webhook tarda unos segundos; se consulta hasta que llega. */
function retorno(s, reload) {
  if (!RETORNO || retornoMostrado) return null;
  if (RETORNO === 'cancelado') {
    retornoMostrado = true;
    return alertBox({ tone: 'info', title: 'Pago cancelado', text: 'No se ha cobrado nada. Puedes contratar cuando quieras.' });
  }
  if (s.pago_online.suscripcion) {
    retornoMostrado = true;
    toast('Pago online activado. ¡Gracias por confiar en Pyme Hub!');
    window.dispatchEvent(new CustomEvent('ph:vigencia-cambiada'));
    return alertBox({ tone: 'success', title: 'Pago completado', text: 'Tu suscripción está al día. Las facturas aparecerán abajo.' });
  }
  retorno.intentos = (retorno.intentos ?? 0) + 1;
  if (retorno.intentos <= 10) setTimeout(reload, 3000);
  else retornoMostrado = true;
  return alertBox({ tone: 'info', title: 'Confirmando el pago…', text: 'Stripe nos está avisando del pago. Esta pantalla se actualiza sola en unos segundos.' });
}

function statusCard(s, p) {
  const v = s.vigencia;
  const fin = v.periodo_fin;
  const rows = [
    ['Plan', `Plan ${PLAN[s.plan] ?? s.plan} · ${CICLO[s.ciclo_cobro] ?? s.ciclo_cobro}`],
    ['Estado', vigenciaBadge(v.estado)],
    [v.estado === 'PRUEBA' ? 'Prueba hasta' : 'Pagado hasta', fin ? formatDate(fin, 'long') : 'Sin vencimiento'],
    v.estado === 'GRACIA' || v.estado === 'VENCIDA' ? ['Gracia hasta', formatDate(v.gracia_hasta, 'long')] : null,
    ['Empleados activos', `${formatNumber(s.empleados_activos)} (se factura por empleado activo)`],
    s.pago_online.suscripcion ? ['Pago', v.cancelar_al_final ? 'Online · se cancela al final del periodo' : 'Online · renovación automática'] : null,
  ].filter(Boolean);
  const aviso = {
    PRUEBA: fin && v.dias_restantes <= 7 ? alertBox({ tone: 'info', text: `${v.dias_restantes === 1 ? 'Te queda 1 día' : `Te quedan ${v.dias_restantes} días`} de prueba. Contrata ahora y no se cobrará nada hasta que termine.` }) : null,
    GRACIA: alertBox({ tone: 'warning', title: 'La suscripción ha vencido', text: `Todo sigue funcionando hasta el ${formatDate(v.gracia_hasta, 'long')}. Después, Pyme Hub quedará en solo lectura hasta renovar.` }),
    VENCIDA: alertBox({ tone: 'danger', title: 'Pyme Hub está en solo lectura', text: 'Tu equipo puede consultar sus datos, pero no registrar nada nuevo. Renueva para recuperarlo todo al momento; tus datos están intactos y puedes exportarlos en Configuración.' }),
  }[v.estado] ?? null;

  const portalBtn = s.pago_online.cliente && p ? button({ text: 'Gestionar el pago y las facturas', variant: 'secondary', iconName: 'external-link' }) : null;
  portalBtn?.addEventListener('click', async () => {
    setLoading(portalBtn, true, 'Abriendo Stripe…');
    try {
      const { url } = await billing.portal();
      location.assign(url);
    } catch (error) {
      setLoading(portalBtn, false);
      toast(error.message, { tone: 'error' });
    }
  });
  return card({
    title: 'Tu suscripción',
    iconName: 'calendar-clock',
    actions: portalBtn,
    body: h('div', { class: 'stack' },
      aviso,
      h('dl', { class: 'data-list' }, rows.map(([k, val]) => h('div', {}, h('dt', { text: k }), h('dd', {}, val)))),
      s.pago_online.suscripcion
        ? h('p', { class: 'small muted', text: 'En el portal de Stripe puedes cambiar la tarjeta, descargar las facturas o cancelar la renovación. Para cambiar de plan, escríbenos.' })
        : null),
  });
}

/** Importe de un periodo: base (con el descuento anual), IVA y total; mismo cálculo que la API. */
function importe(p, plan, ciclo, empleados) {
  const precio = plan === 'COMPLETO' ? p['precios.completo_mes'] : p['precios.entrada_mes'];
  const meses = ciclo === 'ANUAL' ? 12 : 1;
  const bruto = Math.round(precio * meses * empleados * 100) / 100;
  const descPct = ciclo === 'ANUAL' ? Number(p['precios.descuento_anual_pct']) || 0 : 0;
  const descuento = Math.round(bruto * descPct) / 100;
  const base = Math.round((bruto - descuento) * 100) / 100;
  const iva = Math.round(base * p['precios.iva_pct']) / 100;
  return { precio, meses, bruto, descPct, descuento, base, iva, ivaPct: p['precios.iva_pct'], total: Math.round((base + iva) * 100) / 100 };
}

function contractCard(s, p) {
  const empleados = Math.max(1, s.empleados_activos);
  const demo = Boolean(session.me?.demo);
  const disponible = s.pago_online.disponible && !demo;
  const summary = h('div', { 'aria-live': 'polite' });
  const notice = h('div', { 'aria-live': 'polite' });
  const terms = uniqueId('terminos');
  const submit = button({ text: 'Pagar con Stripe', type: 'submit', iconName: 'credit-card', block: true });
  if (!disponible) submit.disabled = true;

  const form = h('form', { class: 'stack', novalidate: true },
    segmented('Plan', 'plan', [['ENTRADA', `Entrada · ${money(p['precios.entrada_mes'])}`], ['COMPLETO', `Completo · ${money(p['precios.completo_mes'])}`]], s.plan),
    segmented('Pago', 'ciclo', [['MENSUAL', 'Mensual, sin permanencia'], ['ANUAL', Number(p['precios.descuento_anual_pct']) > 0 ? `Anual · −${formatNumber(p['precios.descuento_anual_pct'])} %` : 'Anual']], s.ciclo_cobro),
    summary,
    s.vigencia.estado === 'PRUEBA' && s.vigencia.dias_restantes > 2
      ? h('p', { class: 'small inline-note' }, icon('clock', { size: 'sm' }), h('span', { text: `No se cobra nada hasta el final de la prueba, el ${formatDate(s.vigencia.periodo_fin, 'long')}.` }))
      : null,
    h('div', { class: 'field', dataset: { field: 'acepta_terminos' } },
      h('label', { class: 'checkbox', for: terms },
        h('input', { type: 'checkbox', id: terms, name: 'acepta_terminos', required: true }),
        h('span', {}, 'He leído y acepto los ', h('a', { href: '#/legal/terminos', target: '_blank', rel: 'noopener', text: 'términos y condiciones de contratación' }), '.')),
      h('p', { class: 'field__error', hidden: true })),
    notice,
    submit,
    disponible
      ? alertBox({ tone: 'info', title: 'Modo de prueba', text: 'No se cobra nada real. En Stripe usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC.' })
      : alertBox({ tone: 'info', text: demo
        ? 'En la demostración no se puede contratar. En una cuenta real, desde aquí se paga con tarjeta a través de Stripe.'
        : `El pago online no está activo. Para contratar o renovar, escríbenos a ${p['titular.email']}.` }));

  const update = () => {
    const plan = form.elements.plan.value;
    const ciclo = form.elements.ciclo.value;
    const i = importe(p, plan, ciclo, empleados);
    const periodo = ciclo === 'ANUAL' ? 'año' : 'mes';
    summary.replaceChildren(h('dl', { class: 'order-summary' },
      line(`${plural(empleados, 'empleado', 'empleados')} × ${money(i.precio)}${i.meses > 1 ? ' × 12 meses' : ''}`, money(i.bruto)),
      i.descuento > 0 ? line(`Descuento del pago anual (${formatNumber(i.descPct)} %)`, `−${money(i.descuento)}`) : null,
      line('Base imponible', money(i.base), 'order-summary__base'),
      line(`IVA (${formatNumber(i.ivaPct)} %)`, money(i.iva)),
      line(`Total por ${periodo}`, money(i.total), 'order-summary__total')),
    h('p', { class: 'small muted', text: 'Precios para empresas. Si cambia tu plantilla, la cantidad se ajusta en la siguiente renovación.' }));
  };
  form.addEventListener('change', update);
  update();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    notice.replaceChildren();
    const err = form.querySelector('[data-field="acepta_terminos"] .field__error');
    err.hidden = true;
    if (!form.elements.acepta_terminos.checked) {
      err.replaceChildren(icon('circle-alert', { size: 'sm' }), h('span', { text: 'Acepta los términos para continuar.' }));
      err.hidden = false;
      form.elements.acepta_terminos.focus();
      return;
    }
    setLoading(submit, true, 'Abriendo Stripe…');
    try {
      const r = await billing.checkout({ plan: form.elements.plan.value, ciclo: form.elements.ciclo.value, acepta_terminos: true });
      location.assign(r.url);
    } catch (error) {
      setLoading(submit, false);
      notice.append(alertBox({ tone: 'danger', text: error instanceof ApiError ? error.message : String(error) }));
    }
  });

  return card({
    title: s.vigencia.estado === 'PRUEBA' ? 'Contratar Pyme Hub' : 'Renovar o contratar',
    iconName: 'credit-card',
    body: form,
  });
}

function line(label, value, cls = null) {
  return h('div', { class: ['order-summary__row', cls] }, h('dt', { text: label }), h('dd', { text: value }));
}

function segmented(legend, name, options, value) {
  return h('fieldset', { class: 'segmented' },
    h('legend', { class: 'choice-set__legend', text: legend }),
    h('div', { class: 'segmented__options' }, options.map(([v, text]) => {
      const id = uniqueId(name);
      return h('label', { for: id, class: 'segmented__opt' },
        h('input', { type: 'radio', id, name, value: v, checked: v === value }), text);
    })));
}

function invoicesCard(rows) {
  return card({
    title: 'Facturas y pagos',
    iconName: 'receipt',
    body: rows.length === 0
      ? emptyState({ title: 'Todavía no hay pagos.', text: 'Cuando se cobre la suscripción, aquí verás cada factura con su base, IVA y total.', iconName: 'receipt' })
      : table({
        caption: 'Facturas y pagos de la suscripción',
        rows,
        columns: [
          { label: 'Fecha', primary: true, render: (r) => formatDate(r.creado_en) },
          { label: 'Concepto', render: (r) => `Plan ${PLAN[r.plan] ?? '—'} · ${CICLO[r.ciclo_cobro] ?? '—'}${r.empleados ? ` · ${r.empleados} empl.` : ''}` },
          { label: 'Periodo', render: (r) => (r.periodo_inicio ? `${formatDate(r.periodo_inicio)} – ${formatDate(r.periodo_fin)}` : '—') },
          { label: 'Base', render: (r) => money(r.base) },
          { label: 'IVA', render: (r) => money(r.iva) },
          { label: 'Total', render: (r) => h('strong', { text: money(r.total) }) },
          { label: 'Estado', render: (r) => badge(PAGO[r.estado]?.text ?? r.estado, { tone: PAGO[r.estado]?.tone ?? 'neutral', iconName: PAGO[r.estado]?.icon }) },
          { label: 'Factura', render: (r) => (r.url_factura
            ? h('a', { href: r.url_factura, target: '_blank', rel: 'noopener noreferrer' }, icon('external-link', { size: 'sm' }), ` ${r.numero ?? 'Ver'}`)
            : h('span', { class: 'muted', text: r.origen === 'MANUAL' ? (r.numero ?? 'Pago manual') : '—' })) },
        ],
      }),
  });
}

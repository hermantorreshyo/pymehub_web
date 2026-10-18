import { ApiError, skills } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatDate, formatNumber, plural } from '../../lib/format.js';
import { categoryBadge, minutes, NIVELES } from '../../lib/training.js';
import { page } from '../../components/layout/Page.js';
import { badge } from '../../components/ui/Badge.js';
import { button, linkButton, setLoading } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { alertBox, clearFieldErrors, showFieldErrors, textField } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { dataView } from '../../components/ui/StateView.js';
import { toast } from '../../components/ui/Toast.js';
import { loadParams } from '../../lib/params.js';
import { listingBadge, money } from './comun.js';

/**
 * Ficha de un curso del formador (fase 9d): contenido, publicación, precios con el desglose de
 * IVA y comisión, y envío a la revisión de Pyme Hub.
 */
export default function cursoView({ params }) {
  const view = dataView({
    loadingLabel: 'Cargando el curso…',
    lines: 6,
    load: async (signal) => ({ m: await skills.module(params.id, signal), p: await loadParams() }),
    render: ({ m, p }, { reload }) => h('div', { class: 'stack' },
      estado(m),
      contentCard(m, reload),
      priceCard(m, p, reload)),
  });
  return page({
    title: 'Curso de Skills',
    back: { href: '#/inicio', label: 'Mis cursos' },
    children: [view],
  });
}

function estado(m) {
  const f = m.ficha;
  if (m.estado === 'BORRADOR') {
    return alertBox({ tone: 'info', title: 'Borrador', text: 'Revisa el contenido y publícalo; después fija los precios y envíalo a revisión.' });
  }
  if (!f) return alertBox({ tone: 'info', title: 'Falta el precio', text: 'Fija el precio para empresas y para particulares y envía el curso a revisión.' });
  return {
    BORRADOR: alertBox({ tone: 'info', title: 'Listo para enviar', text: 'Cuando quieras, envíalo a revisión. Pyme Hub comprueba el contenido antes de ponerlo a la venta.' }),
    PENDIENTE: alertBox({ tone: 'warning', title: 'En revisión', text: `Enviado el ${formatDate(f.enviado_en)}. Te avisaremos del resultado aquí.` }),
    APROBADO: alertBox({ tone: 'success', title: 'A la venta', text: 'Las empresas y las personas de Pyme Hub ya pueden comprarlo. Si cambias el contenido, volverá a revisión.' }),
    RECHAZADO: alertBox({ tone: 'danger', title: 'Necesita cambios', text: f.motivo ?? 'Revisa el contenido y vuelve a enviarlo.' }),
    RETIRADO: alertBox({ tone: 'warning', title: 'Retirado de la venta', text: f.motivo ?? 'Pyme Hub ha retirado el curso.' }),
  }[f.estado] ?? null;
}

function contentCard(m, reload) {
  const acciones = [linkButton({ text: 'Editar el contenido', href: `#/cursos/${m.id}/editar`, variant: 'secondary', iconName: 'pencil' })];
  if (m.estado === 'BORRADOR') {
    const pub = button({ text: 'Publicar', iconName: 'check' });
    pub.addEventListener('click', async () => {
      setLoading(pub, true, 'Publicando…');
      try {
        await skills.publishModule(m.id);
        toast('Curso publicado. Ahora fija el precio.');
        reload();
      } catch (error) {
        setLoading(pub, false);
        toast(error.message, { tone: 'error' });
      }
    });
    acciones.push(pub);
  }
  return card({
    title: m.titulo,
    iconName: 'graduation-cap',
    actions: h('div', { class: 'row-actions' }, ...acciones),
    body: h('div', { class: 'stack' },
      h('div', { class: 'training-item__tags' },
        categoryBadge(m.categoria),
        badge(NIVELES[m.nivel] ?? m.nivel, { iconName: 'signal-medium' }),
        badge(minutes(m.duracion_min), { iconName: 'clock' }),
        m.ficha ? listingBadge(m.ficha.estado) : null),
      h('p', { text: m.resumen }),
      m.contenido?.objetivos?.length
        ? h('div', {}, h('h3', { class: 'skill-subhead', text: 'Objetivos' }), h('ul', { class: 'skill-goals' }, m.contenido.objetivos.map((o) => h('li', {}, icon('check', { size: 'sm' }), h('span', { text: o })))))
        : null,
      h('p', { class: 'small muted', text: `${plural(m.contenido?.bloques?.length ?? m.bloques, 'bloque', 'bloques')} de contenido · ${plural(m.preguntas?.length ?? 0, 'pregunta', 'preguntas')} en el cuestionario` })),
  });
}

function priceCard(m, p, reload) {
  const f = m.ficha;
  const notice = h('div', { 'aria-live': 'polite' });
  const breakdown = h('div', { 'aria-live': 'polite' });
  const comision = Number(p['marketplace.comision_pct']) || 0;
  const iva = p['marketplace.formacion_exenta_iva'] ? 0 : Number(p['precios.iva_pct']) || 0;
  const save = button({ text: 'Guardar los precios', type: 'submit', iconName: 'check', variant: 'secondary' });
  const form = h('form', { class: 'stack', novalidate: true },
    h('div', { class: 'price-grid' },
      textField({ name: 'precio_empresa', label: 'Licencia para una empresa (€, sin IVA)', type: 'number', value: f?.precio_empresa ?? '',
        hint: 'Da acceso a toda su plantilla. Se muestra «+ IVA».', attrs: { min: 1, max: 5000, step: '0.01', inputmode: 'decimal' } }),
      textField({ name: 'precio_persona', label: 'Para un particular (€, IVA incluido)', type: 'number', value: f?.precio_persona ?? '',
        hint: 'Lo que paga una persona por su cuenta.', attrs: { min: 1, max: 5000, step: '0.01', inputmode: 'decimal' } })),
    breakdown, notice,
    h('div', { class: 'form__actions' }, save));

  const update = () => {
    const pe = Number(String(form.elements.precio_empresa.value).replace(',', '.')) || 0;
    const pp = Number(String(form.elements.precio_persona.value).replace(',', '.')) || 0;
    const basePersona = Math.round((pp / (1 + iva / 100)) * 100) / 100;
    const recibes = (base) => Math.round(base * (100 - comision)) / 100;
    breakdown.replaceChildren(h('dl', { class: 'order-summary' },
      row('Empresa paga', `${money(pe)} + IVA = ${money(Math.round(pe * (100 + iva)) / 100)}`),
      row('Particular paga (IVA incluido)', `${money(pp)} (base ${money(basePersona)})`),
      row(`Comisión de Pyme Hub (${formatNumber(comision)} % de la base)`, `${money(pe - recibes(pe))} · ${money(basePersona - recibes(basePersona))}`),
      row('Recibes por cada venta', `${money(recibes(pe))} · ${money(recibes(basePersona))}`, 'order-summary__total')),
    h('p', { class: 'small muted', text: iva > 0 ? `IVA del ${formatNumber(iva)} %: lo ingresa Pyme Hub. La posible exención de la formación la confirma la gestoría.` : 'Formación exenta de IVA según la gestoría.' }));
  };
  form.addEventListener('input', update);
  update();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    notice.replaceChildren();
    setLoading(save, true, 'Guardando…');
    try {
      await skills.listing(m.id, {
        precio_empresa: Number(String(form.elements.precio_empresa.value).replace(',', '.')),
        precio_persona: Number(String(form.elements.precio_persona.value).replace(',', '.')),
      });
      toast('Precios guardados.');
      reload();
    } catch (error) {
      setLoading(save, false);
      const rest = error instanceof ApiError ? showFieldErrors(form, error.fieldErrors) : {};
      if (!(error instanceof ApiError) || !Object.keys(error.fieldErrors).length || Object.keys(rest).length) notice.append(alertBox({ tone: 'danger', text: error.message }));
    }
  });

  const puedeEnviar = f && m.estado === 'PUBLICADO' && ['BORRADOR', 'RECHAZADO', 'RETIRADO'].includes(f.estado);
  let enviar = null;
  if (puedeEnviar) {
    enviar = button({ text: 'Enviar a revisión', iconName: 'send' });
    enviar.addEventListener('click', async () => {
      setLoading(enviar, true, 'Enviando…');
      try {
        await skills.submit(m.id);
        toast('Curso enviado a revisión.');
        reload();
      } catch (error) {
        setLoading(enviar, false);
        const det = error instanceof ApiError ? Object.values(error.fieldErrors).join(' ') : '';
        toast(det || error.message, { tone: 'error' });
      }
    });
  }
  return card({
    title: 'Precio y venta',
    iconName: 'tag',
    actions: enviar,
    body: form,
  });
}

function row(label, value, cls = null) {
  return h('div', { class: ['order-summary__row', cls] }, h('dt', { text: label }), h('dd', { text: value }));
}

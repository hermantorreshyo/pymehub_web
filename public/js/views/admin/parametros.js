import { admin, ApiError } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { page } from '../../components/layout/Page.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { alertBox, checkboxField, clearFieldErrors, showFieldErrors, textField } from '../../components/ui/Field.js';
import { dataView } from '../../components/ui/StateView.js';
import { toast } from '../../components/ui/Toast.js';

/**
 * Parámetros de la plataforma (fase 9a): datos del titular (pendientes de la constitución de la
 * sociedad), precios sin IVA, IVA, descuento anual, prueba, gracia, borrado tras la baja,
 * marketplace y versión de los textos legales. Se guardan sin desplegar.
 */
const GRUPOS = {
  titular: { title: 'Titular de la plataforma', icon: 'building', text: 'Aparece en el aviso legal, la privacidad y los términos. Mientras «La sociedad está constituida» esté desmarcado, los textos indican que la sociedad está en constitución.' },
  precios: { title: 'Precios e IVA', icon: 'tag', text: 'Precios por empleado y mes sin IVA. El descuento anual se aplica a 12 meses; 0 significa sin descuento.' },
  suscripcion: { title: 'Suscripciones y baja', icon: 'calendar', text: null },
  marketplace: { title: 'Pyme Hub Skills', icon: 'graduation-cap', text: 'La exención de IVA de la formación debe confirmarla la gestoría antes de marcarla.' },
  legal: { title: 'Textos legales', icon: 'file-text', text: 'Cambia la versión cuando publiques una nueva redacción: las cuentas nuevas guardan la versión que aceptan.' },
};

export default function parametrosView() {
  return page({
    title: 'Parámetros',
    subtitle: 'Datos del titular, precios y condiciones que usan la web, los textos legales y la facturación.',
    children: [dataView({
      loadingLabel: 'Cargando los parámetros…',
      lines: 8,
      load: (signal) => admin.params(signal),
      render: (list, { reload }) => form(list, reload),
    })],
  });
}

function field(p) {
  const name = p.clave;
  if (p.tipo === 'bool') return checkboxField({ name, label: p.etiqueta });
  const numeric = p.tipo === 'int' || p.tipo === 'money';
  return textField({
    name,
    label: p.etiqueta,
    type: p.tipo === 'email' ? 'email' : numeric ? 'number' : 'text',
    value: p.valor ?? '',
    hint: numeric ? `Entre ${p.min} y ${p.max}.` : null,
    attrs: numeric
      ? { min: p.min, max: p.max, step: p.tipo === 'money' ? '0.01' : '1', inputmode: p.tipo === 'money' ? 'decimal' : 'numeric' }
      : { maxlength: p.max ?? 200, autocomplete: 'off' },
  });
}

function form(list, reload) {
  const notice = h('div', { 'aria-live': 'polite' });
  const submit = button({ text: 'Guardar los parámetros', type: 'submit', iconName: 'check' });
  const holder = list.find((p) => p.clave === 'titular.constituida');
  const groups = Object.entries(GRUPOS).map(([id, g]) => {
    const items = list.filter((p) => p.grupo === id);
    if (!items.length) return null;
    return card({
      title: g.title,
      iconName: g.icon,
      body: h('div', { class: 'stack' },
        g.text ? h('p', { class: 'small muted', text: g.text }) : null,
        id === 'titular' && !holder?.valor
          ? alertBox({ tone: 'info', title: 'Sociedad pendiente de constitución', text: 'Los textos legales muestran el aviso de constitución pendiente y el correo de contacto. Completa los datos y marca la casilla cuando la sociedad esté constituida.' })
          : null,
        h('div', { class: 'form__grid' }, items.map(field))),
    });
  });

  const el = h('form', { class: 'stack', novalidate: true }, ...groups, notice, h('div', { class: 'form__actions' }, submit));
  for (const p of list) if (p.tipo === 'bool') el.elements[p.clave].checked = Boolean(p.valor);

  el.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(el);
    notice.replaceChildren();
    const changes = {};
    for (const p of list) {
      const c = el.elements[p.clave];
      let v;
      if (p.tipo === 'bool') v = c.checked;
      else if (p.tipo === 'int') v = c.value === '' ? null : Number.parseInt(c.value, 10);
      else if (p.tipo === 'money') v = c.value === '' ? null : Number(c.value.replace(',', '.'));
      else v = c.value.trim();
      if (v !== p.valor) changes[p.clave] = v;
    }
    if (!Object.keys(changes).length) {
      notice.append(alertBox({ tone: 'info', text: 'No hay cambios que guardar.' }));
      return;
    }
    setLoading(submit, true, 'Guardando…');
    try {
      await admin.saveParams(changes);
      toast('Parámetros guardados.');
      reload();
    } catch (error) {
      setLoading(submit, false);
      const rest = error instanceof ApiError ? showFieldErrors(el, error.fieldErrors) : {};
      if (!(error instanceof ApiError) || !Object.keys(error.fieldErrors).length || Object.keys(rest).length) notice.append(alertBox({ tone: 'danger', text: error.message }));
    }
  });
  return el;
}

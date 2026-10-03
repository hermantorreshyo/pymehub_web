import { h, uniqueId } from '../../lib/dom.js';
import { icon } from './Icon.js';

/**
 * Campos de formulario con <label>, ayuda y error enlazados (RNF-045).
 * Cada campo devuelve el contenedor .field; el control lleva name = clave de la API.
 */
function wrap({ id, label, required, hint, control, wide }) {
  const hintId = hint ? `${id}-hint` : null;
  const errorId = `${id}-error`;
  control.setAttribute('aria-describedby', [hintId, errorId].filter(Boolean).join(' '));
  return h('div', { class: ['field', wide && 'field--wide'], dataset: { field: control.name } },
    h('label', { class: 'field__label', for: id },
      label, required ? h('span', { class: 'required', 'aria-hidden': 'true', text: ' *' }) : null),
    control,
    hint ? h('p', { class: 'field__hint', id: hintId, text: hint }) : null,
    h('p', { class: 'field__error', id: errorId, hidden: true }));
}

export function textField({ name, label, type = 'text', value = '', required = false, hint = null, wide = false, attrs = {} }) {
  const id = uniqueId(name);
  const control = h('input', { class: 'input', id, name, type, value: value ?? '', required, ...attrs });
  return wrap({ id, label, required, hint, control, wide });
}

/** options: [{ value, label }] — con `placeholder` se añade una opción vacía. */
export function selectField({ name, label, options, value = '', required = false, placeholder = null, hint = null, wide = false }) {
  const id = uniqueId(name);
  const control = h('select', { class: 'select', id, name, required },
    placeholder !== null ? h('option', { value: '', text: placeholder }) : null,
    options.map((o) => h('option', { value: o.value, text: o.label, selected: String(o.value) === String(value ?? '') })));
  return wrap({ id, label, required, hint, control, wide });
}

/** Contraseña con botón para mostrarla u ocultarla. */
export function passwordField({ name, label, autocomplete = 'current-password', required = true, hint = null, attrs = {} }) {
  const id = uniqueId(name);
  const input = h('input', { class: 'input', id, name, type: 'password', autocomplete, required, ...attrs });
  const toggle = h('button', {
    type: 'button',
    class: 'btn btn--icon',
    'aria-label': 'Mostrar contraseña',
    'aria-pressed': 'false',
    'aria-controls': id,
    onclick: () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-pressed', String(show));
      toggle.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      toggle.replaceChildren(icon(show ? 'eye-off' : 'eye'));
    },
  }, icon('eye'));
  const field = wrap({ id, label, required, hint, control: input });
  const group = h('div', { class: 'input-group' });
  input.replaceWith(group);
  group.append(input, toggle);
  return field;
}

export function checkboxField({ name, label, required = false }) {
  const id = uniqueId(name);
  return h('div', { class: 'field', dataset: { field: name } },
    h('label', { class: 'checkbox', for: id },
      h('input', { type: 'checkbox', id, name, required, 'aria-describedby': `${id}-error` }),
      h('span', {}, label)),
    h('p', { class: 'field__error', id: `${id}-error`, hidden: true }));
}

/** Muestra los errores por campo de PH-VAL-001; devuelve los que no tienen campo visible. */
export function showFieldErrors(form, errors = {}) {
  clearFieldErrors(form);
  const orphan = {};
  let first = null;
  for (const [name, message] of Object.entries(errors)) {
    const field = form.querySelector(`[data-field="${CSS.escape(name)}"]`);
    if (!field) {
      orphan[name] = message;
      continue;
    }
    const control = field.querySelector('input, select, textarea');
    const error = field.querySelector('.field__error');
    control?.setAttribute('aria-invalid', 'true');
    error.replaceChildren(icon('circle-alert', { size: 'sm' }), h('span', { text: message }));
    error.hidden = false;
    first ??= control;
  }
  first?.focus();
  return orphan;
}

export function clearFieldErrors(form) {
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field__error').forEach((el) => { el.hidden = true; el.replaceChildren(); });
}

/** Aviso en línea (dentro de formularios y páginas). */
export function alertBox({ tone = 'info', title = null, text = null, items = [], iconName = null }) {
  const icons = { info: 'info', success: 'circle-check', warning: 'triangle-alert', danger: 'circle-alert' };
  return h('div', { class: ['alert', `alert--${tone}`], role: tone === 'danger' ? 'alert' : 'status' },
    icon(iconName ?? icons[tone]),
    h('div', { class: 'alert__body' },
      title ? h('strong', { text: title }) : null,
      text ? h('p', { text }) : null,
      items.length ? h('ul', {}, items.map((t) => h('li', { text: t }))) : null));
}

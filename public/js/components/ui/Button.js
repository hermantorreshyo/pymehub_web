import { h } from '../../lib/dom.js';
import { icon } from './Icon.js';

/**
 * Botón de acción (RNF-042): variantes primary | secondary | tertiary | danger
 * y estados normal, hover, foco, activo, deshabilitado y cargando.
 * Las acciones usan <button>; la navegación, linkButton() con <a>.
 */
export function button({
  text,
  variant = 'primary',
  type = 'button',
  iconName = null,
  iconOnly = false,
  block = false,
  disabled = false,
  onClick = null,
  className = '',
  attrs = {},
} = {}) {
  const el = h('button', {
    type,
    class: ['btn', `btn--${variant}`, block && 'btn--block', iconOnly && 'btn--icon', className],
    disabled,
    'aria-label': iconOnly ? text : null,
    title: iconOnly ? text : null,
    onclick: onClick,
    ...attrs,
  });
  el._content = [iconName ? icon(iconName) : null, iconOnly ? null : h('span', { text })];
  el.append(...el._content.filter(Boolean));
  return el;
}

/** Enlace con aspecto de botón. */
export function linkButton({ text, href, variant = 'secondary', iconName = null, block = false, className = '' }) {
  return h('a', { class: ['btn', `btn--${variant}`, block && 'btn--block', className], href },
    iconName ? icon(iconName) : null, h('span', { text }));
}

/** Estado "cargando": deshabilita, anuncia ocupado y muestra un indicador. */
export function setLoading(btn, loading, loadingText = 'Un momento…') {
  if (loading) {
    if (btn.getAttribute('aria-busy') === 'true') return;
    btn._wasDisabled = btn.disabled;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.replaceChildren(icon('loader', { className: 'spinner' }), h('span', { text: loadingText }));
  } else {
    btn.disabled = Boolean(btn._wasDisabled);
    btn.removeAttribute('aria-busy');
    btn.replaceChildren(...(btn._content ?? []).filter(Boolean));
  }
}

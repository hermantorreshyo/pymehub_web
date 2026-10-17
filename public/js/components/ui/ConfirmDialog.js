import { h, uniqueId } from '../../lib/dom.js';
import { button, setLoading } from './Button.js';
import { alertBox, textField } from './Field.js';
import { icon } from './Icon.js';

/**
 * Confirmación de una acción importante con <dialog> nativo (foco atrapado, Escape cierra).
 *   confirmDialog({
 *     title, text, items, confirmText, tone: 'danger' | 'primary',
 *     word: 'SUPRIMIR',              // opcional: hay que escribirla para confirmar
 *     onConfirm: async () => {…},    // si lanza un error, se muestra en el propio diálogo
 *   })
 */
export function confirmDialog({ title, text = null, items = [], confirmText = 'Confirmar', tone = 'danger', word = null, onConfirm }) {
  const titleId = uniqueId('confirm');
  const errorBox = h('div', { 'aria-live': 'polite' });
  const wordField = word ? textField({ name: 'palabra', label: `Escribe ${word} para confirmar`, attrs: { autocomplete: 'off', autocapitalize: 'characters' } }) : null;
  const submit = button({ text: confirmText, type: 'submit', variant: tone === 'danger' ? 'danger' : 'primary', iconName: tone === 'danger' ? 'trash-2' : 'check' });
  const cancel = button({ text: 'Cancelar', variant: 'tertiary', onClick: () => dialog.close() });
  const form = h('form', { class: 'stack', novalidate: true },
    text ? h('p', { text }) : null,
    items.length ? h('ul', { class: 'goal-list goal-list--plain' }, items.map((t) => h('li', { text: t }))) : null,
    wordField,
    errorBox,
    h('div', { class: 'dialog__actions' }, cancel, submit));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.replaceChildren();
    if (word && form.elements.palabra.value.trim().toUpperCase() !== word) {
      errorBox.append(alertBox({ tone: 'warning', text: `Escribe ${word} para confirmar.` }));
      form.elements.palabra.focus();
      return;
    }
    setLoading(submit, true, 'Un momento…');
    try {
      await onConfirm();
      dialog.close();
    } catch (error) {
      setLoading(submit, false);
      errorBox.append(alertBox({ tone: 'danger', text: error.message }));
    }
  });

  const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': titleId },
    h('header', { class: 'dialog__header' },
      h('h2', { id: titleId, text: title }),
      h('button', { type: 'button', class: 'btn btn--icon', 'aria-label': 'Cerrar', onclick: () => dialog.close() }, icon('x'))),
    form);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

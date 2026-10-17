import { admin, ApiError } from '../../services/api.js';
import { h, uniqueId } from '../../lib/dom.js';
import { formatDate, todayIso } from '../../lib/format.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { alertBox, checkboxField, clearFieldErrors, showFieldErrors, textField } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { toast } from '../../components/ui/Toast.js';

/**
 * Vigencia de la suscripción de una empresa, gestionada por la plataforma (fase 9b):
 * ampliar días (prueba o renovación por transferencia), fijar una fecha o dejarla sin vencimiento,
 * con un pago manual opcional que se registra con su IVA.
 */
export function validityDialog(t, onDone) {
  const v = t.vigencia ?? {};
  const titleId = uniqueId('vigencia');
  const notice = h('div', { 'aria-live': 'polite' });
  const accion = (value, text, checked = false) => {
    const id = uniqueId('accion');
    return h('label', { for: id, class: 'segmented__opt' }, h('input', { type: 'radio', id, name: 'accion', value, checked }), text);
  };
  const ampliar = h('div', { class: 'stack', dataset: { panel: 'AMPLIAR' } },
    textField({ name: 'dias', label: 'Días que se añaden', type: 'number', value: 30, attrs: { min: 1, max: 400, inputmode: 'numeric' },
      hint: v.periodo_fin && v.periodo_fin >= todayIso() ? `Desde el ${formatDate(v.periodo_fin)}, fin actual.` : 'Desde hoy.' }));
  const fijar = h('div', { class: 'stack', dataset: { panel: 'FIJAR' }, hidden: true },
    textField({ name: 'periodo_fin', label: 'Último día pagado o de prueba', type: 'date', value: v.periodo_fin ?? '' }),
    h('fieldset', { class: 'segmented' },
      h('legend', { class: 'field__label', text: 'Tipo' }),
      h('div', { class: 'segmented__options' },
        radio('vigencia', 'VIGENTE', 'Pagada', v.estado !== 'PRUEBA'),
        radio('vigencia', 'PRUEBA', 'Prueba', v.estado === 'PRUEBA'))));
  const manual = checkboxField({ name: 'registrar_pago', label: 'Registrar un pago recibido fuera de Stripe (transferencia)' });
  const pago = h('div', { class: 'form__grid', hidden: true },
    textField({ name: 'base', label: 'Base imponible (€, sin IVA)', type: 'number', attrs: { min: 0, step: '0.01', inputmode: 'decimal' }, hint: 'El IVA se calcula con el parámetro vigente.' }),
    textField({ name: 'nota', label: 'Nota', attrs: { maxlength: 200 }, hint: 'Por ejemplo, la referencia de la transferencia.' }));

  const submit = button({ text: 'Guardar la vigencia', type: 'submit', iconName: 'check' });
  const form = h('form', { class: 'stack', novalidate: true },
    h('p', { class: 'small muted', text: `Ahora: ${v.estado ?? '—'}${v.periodo_fin ? `, hasta el ${formatDate(v.periodo_fin)}` : ', sin vencimiento'}.${v.pago_online ? ' Tiene pago online: Stripe ampliará la vigencia con cada cobro.' : ''}` }),
    h('fieldset', { class: 'segmented' },
      h('legend', { class: 'field__label', text: 'Qué quieres hacer' }),
      h('div', { class: 'segmented__options segmented__options--auto' },
        accion('AMPLIAR', 'Ampliar', true), accion('FIJAR', 'Fijar fecha'), accion('SIN_VENCIMIENTO', 'Sin vencimiento'))),
    ampliar, fijar, manual, pago, notice,
    h('div', { class: 'dialog__actions' }, button({ text: 'Cancelar', variant: 'tertiary', onClick: () => dialog.close() }), submit));

  form.addEventListener('change', () => {
    const a = form.elements.accion.value;
    ampliar.hidden = a !== 'AMPLIAR';
    fijar.hidden = a !== 'FIJAR';
    pago.hidden = !form.elements.registrar_pago.checked;
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    notice.replaceChildren();
    const a = form.elements.accion.value;
    const input = { accion: a };
    if (a === 'AMPLIAR') input.dias = Number.parseInt(form.elements.dias.value, 10) || 0;
    if (a === 'FIJAR') Object.assign(input, { periodo_fin: form.elements.periodo_fin.value || null, vigencia: form.elements.vigencia.value });
    if (form.elements.registrar_pago.checked) {
      input.pago_manual = { base: Number(String(form.elements.base.value).replace(',', '.')), nota: form.elements.nota.value.trim() || null };
    }
    setLoading(submit, true, 'Guardando…');
    try {
      const r = await admin.setValidity(t.id, input);
      toast(`Vigencia guardada: ${r.estado}${r.periodo_fin ? ` hasta el ${formatDate(r.periodo_fin)}` : ', sin vencimiento'}.`);
      dialog.close();
      onDone();
    } catch (error) {
      setLoading(submit, false);
      const fields = error instanceof ApiError ? { ...error.fieldErrors } : {};
      if (fields['pago_manual.base'] || fields.base) fields.base = fields.base ?? fields['pago_manual.base'];
      const rest = showFieldErrors(form, fields);
      if (!Object.keys(fields).length || Object.keys(rest).length) notice.append(alertBox({ tone: 'danger', text: error.message }));
    }
  });

  const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': titleId },
    h('header', { class: 'dialog__header' },
      h('h2', { id: titleId, text: `Vigencia · ${t.nombre_comercial || t.nombre}` }),
      h('button', { type: 'button', class: 'btn btn--icon', 'aria-label': 'Cerrar', onclick: () => dialog.close() }, icon('x'))),
    form);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

function radio(name, value, text, checked) {
  const id = uniqueId(name);
  return h('label', { for: id, class: 'segmented__opt' }, h('input', { type: 'radio', id, name, value, checked }), text);
}

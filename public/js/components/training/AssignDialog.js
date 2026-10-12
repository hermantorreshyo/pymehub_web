import { ApiError, employees, teams, training } from '../../services/api.js';
import { h, uniqueId } from '../../lib/dom.js';
import { fullName, plural, todayIso } from '../../lib/format.js';
import { categoryBadge } from '../../lib/training.js';
import { button, setLoading } from '../ui/Button.js';
import { alertBox, clearFieldErrors, selectField, showFieldErrors, textField } from '../ui/Field.js';
import { icon } from '../ui/Icon.js';
import { toast } from '../ui/Toast.js';

/** Fecha dentro de N días en formato AAAA-MM-DD. */
export function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Diálogo para asignar un módulo a un equipo o a personas concretas, con fecha límite (RF-042).
 * Usa <dialog> nativo: atrapa el foco, se cierra con Escape y devuelve el foco al abrirlo.
 *   openAssignDialog({ modulo, onDone })
 */
export function openAssignDialog({ modulo, preselected = [], onDone = () => {} }) {
  const titleId = uniqueId('asignar');
  const errorBox = h('div', { 'aria-live': 'assertive' });
  const chosen = new Map(preselected.map((p) => [p.id, p]));

  // Destinatarios: equipo o personas
  const modeName = uniqueId('modo');
  const modeTeam = h('input', { type: 'radio', name: modeName, value: 'equipo', id: `${modeName}-e`, checked: preselected.length === 0 });
  const modePeople = h('input', { type: 'radio', name: modeName, value: 'personas', id: `${modeName}-p`, checked: preselected.length > 0 });
  const teamField = selectField({ name: 'equipo_id', label: 'Equipo', placeholder: 'Elige un equipo', options: [], required: true });
  const teamSelect = teamField.querySelector('select');
  teams.list().then((list) => list.forEach((t) => teamSelect.append(h('option', { value: t.id, text: `${t.nombre} · ${plural(t.empleados, 'persona', 'personas')}` }))))
    .catch(() => { teamSelect.disabled = true; });

  const peopleList = h('ul', { class: 'pick-list', role: 'list', 'aria-label': 'Personas elegidas' });
  const results = h('ul', { class: 'pick-results', role: 'list' });
  const searchField = textField({ name: 'buscar', label: 'Buscar personas', type: 'search', hint: 'Escribe al menos 2 letras del nombre o el código', attrs: { autocomplete: 'off', maxlength: 80 } });
  const searchInput = searchField.querySelector('input');
  let timer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    const q = searchInput.value.trim();
    if (q.length < 2) { results.replaceChildren(); return; }
    timer = setTimeout(async () => {
      try {
        const res = await employees.list({ q, situacion: 'ALTA', per_page: 8 });
        results.replaceChildren(...res.data.map((e) => h('li', {},
          h('button', {
            type: 'button',
            class: 'pick-results__btn',
            disabled: chosen.has(e.id),
            onclick: () => { chosen.set(e.id, e); paintChosen(); searchInput.focus(); },
          }, icon('plus', { size: 'sm' }), h('span', { text: fullName(e) }), h('span', { class: 'small muted', text: e.equipo?.nombre ?? 'Sin equipo' })))));
        if (!res.data.length) results.replaceChildren(h('li', { class: 'small muted', text: 'Nadie coincide con la búsqueda.' }));
      } catch {
        results.replaceChildren(h('li', { class: 'small muted', text: 'No se ha podido buscar. Inténtalo de nuevo.' }));
      }
    }, 300);
  });

  function paintChosen() {
    peopleList.replaceChildren(...[...chosen.values()].map((p) => h('li', { class: 'pick-list__item' },
      h('span', { text: fullName(p) }),
      h('button', { type: 'button', class: 'btn btn--icon', 'aria-label': `Quitar a ${fullName(p)}`, onclick: () => { chosen.delete(p.id); paintChosen(); } }, icon('x')))));
    results.querySelectorAll('button').forEach((b) => { b.disabled = false; });
  }
  paintChosen();

  const teamBox = h('div', { class: 'assign__panel' }, teamField);
  const peopleBox = h('div', { class: 'assign__panel stack' }, searchField, results, peopleList);
  const syncMode = () => {
    teamBox.hidden = !modeTeam.checked;
    peopleBox.hidden = !modePeople.checked;
  };
  modeTeam.addEventListener('change', syncMode);
  modePeople.addEventListener('change', syncMode);
  syncMode();

  const dateField = textField({ name: 'fecha_limite', label: 'Fecha límite', type: 'date', value: inDays(14), hint: 'Por defecto, dentro de dos semanas', attrs: { min: todayIso() } });
  const submit = button({ text: 'Asignar módulo', type: 'submit', iconName: 'send' });
  const cancel = button({ text: 'Cancelar', variant: 'tertiary', onClick: () => dialog.close() });

  const form = h('form', { class: 'stack', novalidate: true },
    h('div', { class: 'assign__module' }, categoryBadge(modulo.categoria), h('strong', { text: modulo.titulo })),
    h('fieldset', { class: 'segmented' },
      h('legend', { class: 'field__label', text: '¿A quién se lo asignas?' }),
      h('div', { class: 'segmented__options' },
        h('label', { for: modeTeam.id, class: 'segmented__opt' }, modeTeam, icon('users', { size: 'sm' }), 'Un equipo'),
        h('label', { for: modePeople.id, class: 'segmented__opt' }, modePeople, icon('user', { size: 'sm' }), 'Personas concretas'))),
    teamBox,
    peopleBox,
    dateField,
    errorBox,
    h('div', { class: 'dialog__actions' }, cancel, submit));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    errorBox.replaceChildren();
    const input = { modulo_id: modulo.id, fecha_limite: form.elements.fecha_limite.value || undefined };
    if (modeTeam.checked) {
      if (!teamSelect.value) { showFieldErrors(form, { equipo_id: 'Elige un equipo' }); return; }
      input.equipo_id = Number(teamSelect.value);
    } else {
      if (!chosen.size) { errorBox.append(alertBox({ tone: 'warning', text: 'Añade al menos una persona.' })); searchInput.focus(); return; }
      input.usuario_ids = [...chosen.keys()];
    }
    setLoading(submit, true, 'Asignando…');
    try {
      const r = await training.assign(input);
      const parts = [];
      if (r.creadas) parts.push(plural(r.creadas, 'asignación nueva', 'asignaciones nuevas'));
      if (r.actualizadas) parts.push(plural(r.actualizadas, 'actualizada', 'actualizadas'));
      if (r.ya_completadas) parts.push(`${r.ya_completadas} ya lo había${r.ya_completadas === 1 ? '' : 'n'} completado`);
      toast(`«${r.modulo.titulo}»: ${parts.join(', ') || 'sin cambios'}.`);
      dialog.close();
      onDone(r);
    } catch (error) {
      setLoading(submit, false);
      const orphan = error instanceof ApiError && error.code === 'PH-VAL-001' ? showFieldErrors(form, error.fieldErrors) : null;
      const text = orphan && Object.keys(orphan).length ? Object.values(orphan).join(' ') : error.message;
      errorBox.append(alertBox({ tone: 'danger', text }));
    }
  });

  const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': titleId },
    h('header', { class: 'dialog__header' },
      h('h2', { id: titleId, text: 'Asignar formación' }),
      h('button', { type: 'button', class: 'btn btn--icon', 'aria-label': 'Cerrar', onclick: () => dialog.close() }, icon('x'))),
    form);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

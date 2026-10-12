import { ApiError, wellbeing } from '../../services/api.js';
import { h, uniqueId } from '../../lib/dom.js';
import { todayIso } from '../../lib/format.js';
import { enqueue } from '../../lib/offline-queue.js';
import { chartBlock } from '../../lib/charts.js';
import { SCALES, dec, levelOf, optionLabel, shortDate, tone, wellbeingBadge } from '../../lib/wellbeing.js';
import { session } from '../../lib/store.js';
import { page } from '../../components/layout/Page.js';
import { card } from '../../components/ui/Card.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { alertBox } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';

const MAX_NOTA = 500;

/**
 * Check-in diario del empleado (§11): tres escalas 1–5 y una nota opcional que solo ve él.
 * - Menos de 15 segundos (RF-050): tres toques y enviar; zonas táctiles ≥ 44 px (RNF-031).
 * - Sin conexión se guarda en la cola del dispositivo y se envía al recuperar la señal (RF-062).
 * - Ante valores bajos muestra un mensaje de apoyo con recursos (RF-055). Es voluntario (RF-056).
 */
export default function checkinView() {
  const formSlot = h('div', { class: 'checkin-slot', 'aria-live': 'polite' });

  const historyView = dataView({
    load: (signal) => wellbeing.mine(30, signal),
    isEmpty: (res) => (res?.data ?? []).length === 0,
    empty: () => emptyState({
      title: 'Aún no tienes check-ins.',
      text: 'Cuando respondas, aquí verás cómo evoluciona tu bienestar en los últimos 30 días.',
      iconName: 'activity',
    }),
    loadingLabel: 'Cargando tu evolución…',
    render: (res) => historyBody(res),
  });

  // El estado del formulario depende de si ya respondió hoy
  wellbeing.mine(30).then((res) => {
    const today = (res?.data ?? []).find((c) => c.fecha === res.meta.hoy);
    formSlot.replaceChildren(today ? doneToday(today, res.meta) : checkinForm());
  }).catch((error) => {
    // Sin conexión también se puede responder: se guardará en el dispositivo
    formSlot.replaceChildren(
      error instanceof ApiError && error.code === 'PH-NET-001'
        ? h('div', { class: 'stack' }, alertBox({ tone: 'warning', text: 'Estás sin conexión. Puedes responder igualmente: lo enviaremos al recuperar la señal.' }), checkinForm())
        : checkinForm());
  });

  function checkinForm(prev = null) {
    const errorBox = h('div', { 'aria-live': 'assertive' });
    const submit = button({ text: 'Enviar check-in', type: 'submit', iconName: 'send', block: true });
    const counter = h('span', { class: 'field__hint', text: `0/${MAX_NOTA}` });
    const notaId = uniqueId('nota');
    const nota = h('textarea', {
      id: notaId, name: 'nota', class: 'textarea', rows: 3, maxlength: MAX_NOTA,
      placeholder: '¿Algo que quieras apuntar sobre tu día? (opcional)',
      'aria-describedby': `${notaId}-ayuda`,
    });
    if (prev?.nota) nota.value = prev.nota;
    counter.textContent = `${nota.value.length}/${MAX_NOTA}`;
    nota.addEventListener('input', () => { counter.textContent = `${nota.value.length}/${MAX_NOTA}`; });

    const form = h('form', { class: 'checkin-form reveal', novalidate: true },
      SCALES.map((s) => scaleField(s, prev?.[s.name] ?? null)),
      h('div', { class: 'field' },
        h('label', { class: 'field__label checkin-form__nota-label', for: notaId }, icon('message-square'), h('span', { text: 'Nota personal' }), h('span', { class: 'muted', text: '(opcional)' })),
        nota,
        h('div', { class: 'checkin-form__nota-ayuda' },
          h('span', { class: 'field__hint', id: `${notaId}-ayuda` }, icon('lock', { size: 'sm' }), ' Solo tú puedes leerla. Se guarda cifrada.'),
          counter)),
      errorBox,
      submit);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.replaceChildren();
      const values = Object.fromEntries(SCALES.map((s) => [s.name, Number(form.elements[s.name].value || 0)]));
      const missing = SCALES.filter((s) => !values[s.name]);
      if (missing.length) {
        errorBox.append(alertBox({ tone: 'warning', text: `Te falta responder: ${missing.map((s) => s.short.toLowerCase()).join(', ')}.` }));
        form.querySelector(`input[name="${missing[0].name}"]`)?.focus();
        return;
      }
      const input = { ...values, fecha: todayIso() };
      const texto = nota.value.trim();
      if (texto) input.nota = texto;

      setLoading(submit, true, 'Enviando…');
      try {
        const outcome = await send(input);
        formSlot.replaceChildren(outcome.queued ? queuedPanel(input) : successPanel(outcome.result));
        formSlot.querySelector('h2')?.focus();
        if (!outcome.queued) historyView.reload();
      } catch (error) {
        setLoading(submit, false);
        errorBox.append(alertBox({ tone: 'danger', text: error.message ?? 'No hemos podido guardar tu check-in.' }));
      }
    });
    return form;
  }

  /** Envía o, sin red, guarda en la cola del dispositivo (RF-062). */
  async function send(input) {
    if (!navigator.onLine) {
      await enqueue({ method: 'POST', path: '/v1/me/checkins', json: input });
      return { queued: true };
    }
    try {
      return { result: await wellbeing.checkin(input) };
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PH-NET-001') {
        await enqueue({ method: 'POST', path: '/v1/me/checkins', json: input });
        return { queued: true };
      }
      throw error;
    }
  }

  function successPanel({ checkin, actualizado, apoyo }) {
    const titleId = uniqueId('hecho');
    return h('section', { class: 'checkin-done', 'aria-labelledby': titleId },
      h('span', { class: 'checkin-done__icon', 'aria-hidden': 'true' }, icon('circle-check', { size: 'lg' })),
      h('h2', { id: titleId, tabindex: '-1', text: actualizado ? 'Check-in actualizado' : `¡Gracias, ${session.me.usuario.nombre}!` }),
      h('p', { class: 'muted', text: actualizado ? 'Hemos guardado tus nuevas respuestas de hoy.' : 'Tu check-in de hoy está guardado. Mañana te esperamos de nuevo.' }),
      answersRow(checkin),
      apoyo ? supportBox(apoyo) : null,
      h('div', { class: 'checkin-done__actions' },
        button({ text: 'Cambiar mi respuesta', variant: 'tertiary', iconName: 'pencil', onClick: () => formSlot.replaceChildren(checkinForm(checkin)) }),
        h('a', { class: 'btn btn--secondary', href: '#/inicio' }, h('span', { text: 'Volver al inicio' }))));
  }

  function queuedPanel(input) {
    const titleId = uniqueId('cola');
    return h('section', { class: 'checkin-done checkin-done--queued', 'aria-labelledby': titleId },
      h('span', { class: 'checkin-done__icon', 'aria-hidden': 'true' }, icon('wifi-off', { size: 'lg' })),
      h('h2', { id: titleId, tabindex: '-1', text: 'Guardado en tu móvil' }),
      h('p', { class: 'muted', text: 'Estás sin conexión. Enviaremos tu check-in automáticamente en cuanto recuperes la señal.' }),
      answersRow(input));
  }

  function doneToday(today, meta) {
    const titleId = uniqueId('hoy');
    return h('section', { class: 'checkin-done checkin-done--today', 'aria-labelledby': titleId },
      h('span', { class: 'checkin-done__icon', 'aria-hidden': 'true' }, icon('circle-check', { size: 'lg' })),
      h('h2', { id: titleId, tabindex: '-1', text: 'Ya has hecho tu check-in de hoy' }),
      h('p', { class: 'muted', text: meta.racha > 1 ? `Llevas ${meta.racha} días seguidos. ¡Sigue así!` : 'Gracias por contarnos cómo estás.' }),
      answersRow(today),
      h('div', { class: 'checkin-done__actions' },
        button({ text: 'Cambiar mi respuesta', variant: 'secondary', iconName: 'pencil', onClick: () => formSlot.replaceChildren(checkinForm(today)) })));
  }

  return page({
    title: 'Check-in de bienestar',
    subtitle: 'Cuéntanos cómo te sientes hoy. Tres toques y listo.',
    children: [
      h('div', { class: 'checkin-layout' },
        card({ title: '¿Cómo estás hoy?', iconName: 'smile', body: formSlot, className: 'checkin-card' }),
        h('div', { class: 'stack checkin-aside' },
          card({ title: 'Tu evolución', iconName: 'activity', body: historyView }),
          privacyCard())),
    ],
  });
}

/* ---------- Piezas ---------- */

function scaleField(scale, value) {
  const legendId = uniqueId(scale.name);
  return h('fieldset', { class: 'scale', 'aria-labelledby': legendId },
    h('legend', { class: 'scale__legend', id: legendId, text: scale.question }),
    h('div', { class: 'scale__options' },
      scale.options.map((o) => {
        const id = uniqueId(`${scale.name}-${o.value}`);
        return h('div', { class: ['scale__opt', `scale__opt--${tone(scale, o.value)}`] },
          h('input', { type: 'radio', id, name: scale.name, value: o.value, checked: value === o.value, class: 'scale__input' }),
          h('label', { for: id, class: 'scale__label' },
            h('span', { class: 'scale__icon' }, icon(o.icon, { size: 'lg' })),
            h('span', { class: 'scale__text', text: o.label })));
      })));
}

function answersRow(c) {
  return h('ul', { class: 'answers', role: 'list' },
    SCALES.map((s) => h('li', { class: ['answers__item', `answers__item--${tone(s, c[s.name])}`] },
      icon(s.options.find((o) => o.value === c[s.name])?.icon ?? 'meh'),
      h('span', {}, h('strong', { text: s.short }), ' ', optionLabel(s.name, c[s.name])))));
}

function supportBox(apoyo) {
  return h('aside', { class: 'support', 'aria-label': 'Recursos de apoyo' },
    h('p', { class: 'support__intro' }, icon('heart'), h('span', { text: apoyo.mensaje })),
    h('ul', { class: 'support__list', role: 'list' },
      apoyo.recursos.map((r) => h('li', { class: 'support__item' },
        h('div', {}, h('strong', { text: r.nombre }), h('p', { class: 'small muted', text: r.detalle })),
        r.telefono ? h('a', { class: 'btn btn--secondary', href: `tel:${r.telefono}` }, icon('phone'), h('span', { text: `Llamar al ${r.telefono}` })) : null))));
}

function historyBody(res) {
  const { meta, data } = res;
  const byDate = new Map(data.map((c) => [c.fecha, c]));
  const labels = [];
  const values = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(`${meta.hoy}T12:00:00`);
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    labels.push(shortDate(iso));
    values.push(byDate.get(iso)?.indice ?? null);
  }
  const m = meta.medias;
  return h('div', { class: 'stack' },
    h('div', { class: 'wb-summary' },
      h('div', { class: 'wb-summary__index' },
        h('span', { class: 'wb-summary__value', text: String(m.indice) }),
        h('span', { class: 'wb-summary__label', text: 'Tu índice medio (0–100)' }),
        wellbeingBadge(levelOf(m.indice))),
      h('ul', { class: 'wb-chips', role: 'list' },
        h('li', {}, h('span', { text: 'Ánimo' }), h('strong', { text: `${dec(m.animo)}/5` })),
        h('li', {}, h('span', { text: 'Energía' }), h('strong', { text: `${dec(m.energia)}/5` })),
        h('li', {}, h('span', { text: 'Estrés' }), h('strong', { text: `${dec(m.estres)}/5` })),
        meta.racha > 0 ? h('li', { class: 'wb-chips__streak' }, icon('flame', { size: 'sm' }), h('strong', { text: meta.racha > 1 ? `${meta.racha} días seguidos` : (meta.hecho_hoy ? 'Hoy has respondido' : 'Ayer respondiste') })) : null)),
    chartBlock({
      label: 'Tu índice de bienestar en los últimos 30 días',
      labels,
      series: [{ name: 'Índice', data: values, color: 1 }],
      yMin: 0,
      yMax: 100,
      stepY: 25,
      area: true,
      spanGaps: true,
      height: 200,
    }),
    h('p', { class: 'small muted', text: `${meta.respuestas} ${meta.respuestas === 1 ? 'respuesta' : 'respuestas'} en los últimos 30 días.` }),
    recentNotes(data));
}

function recentNotes(data) {
  const withNote = data.filter((c) => c.nota).slice(0, 3);
  if (!withNote.length) return null;
  return h('details', { class: 'notes' },
    h('summary', {}, icon('lock', { size: 'sm' }), ` Tus notas recientes (${withNote.length})`),
    h('ul', { class: 'notes__list', role: 'list' },
      withNote.map((c) => h('li', {}, h('span', { class: 'small muted', text: shortDate(c.fecha) }), h('p', { text: c.nota })))));
}

function privacyCard() {
  return card({
    title: 'Tu privacidad',
    iconName: 'shield-check',
    body: h('ul', { class: 'feature__list', role: 'list' },
      privacyItem('Tu empresa solo ve medias de equipos con 5 personas o más, nunca tus respuestas.'),
      privacyItem('Tus notas solo las puedes leer tú.'),
      privacyItem('Responder es voluntario y no cuenta en ninguna valoración sobre ti.')),
  });
}

function privacyItem(text) {
  return h('li', {}, icon('check'), h('span', { text }));
}

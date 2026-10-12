import { ApiError, advisor } from '../../services/api.js';
import { h, replace, uniqueId } from '../../lib/dom.js';
import { href } from '../../lib/router.js';
import { CATEGORIAS, categoryBadge, minutes, moduleArt, stateBadge, trainingCache } from '../../lib/training.js';
import { card } from '../../components/ui/Card.js';
import { badge } from '../../components/ui/Badge.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { alertBox, clearFieldErrors, showFieldErrors } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { errorState, loadingState } from '../../components/ui/StateView.js';
import { toast } from '../../components/ui/Toast.js';

const MAX_COMENTARIO = 200;
const ICONOS_OBJETIVO = {
  MEJORAR_TRABAJO: 'briefcase',
  SEGURIDAD: 'shield-check',
  SALUD_ENERGIA: 'heart',
  RESPONSABILIDAD: 'trending-up',
  HERRAMIENTAS_DIGITALES: 'smartphone',
};

/**
 * Asesor de formación (§12, única funcionalidad con IA generativa).
 * - Preferencias en menos de 30 segundos, casi todo con opciones (§12.2).
 * - 3 a 5 módulos del catálogo con su motivo, plan semanal e inscripción en un toque.
 * - Transparencia (IA-018): etiqueta de IA o de reglas y «¿Cómo funciona?».
 * - El asesor recomienda, no asigna (IA-017). Las preferencias solo las ve la persona (LEG-014).
 */
export function advisorSection() {
  const root = h('div', { class: 'advisor', 'aria-live': 'polite' }, loadingState({ label: 'Cargando el asesor…', lines: 4 }));
  let opciones = null;
  let prefs = null;

  async function start() {
    root.replaceChildren(loadingState({ label: 'Cargando el asesor…', lines: 4 }));
    try {
      const res = await advisor.preferences();
      opciones = res.meta.opciones;
      prefs = res.data;
      if (prefs) showResults(); else showForm();
    } catch (error) {
      const cached = trainingCache.get('asesor');
      if (error instanceof ApiError && error.code === 'PH-NET-001' && cached) {
        replace(root,
          alertBox({ tone: 'warning', iconName: 'wifi-off', text: 'Estás sin conexión. Te mostramos tus últimas recomendaciones; para pedir otras necesitas señal.' }),
          resultsBody(cached.data, cached.meta, true));
        return;
      }
      root.replaceChildren(errorState({ error, onRetry: start, title: 'No hemos podido abrir el asesor.' }));
    }
  }

  /* ---------- Preferencias ---------- */

  function showForm() {
    const errorBox = h('div', { 'aria-live': 'assertive' });
    const submit = button({ text: prefs ? 'Guardar y recomendar' : 'Ver mis recomendaciones', type: 'submit', iconName: 'sparkles', block: true });
    const objName = uniqueId('objetivo');
    const comentarioId = uniqueId('comentario');
    const counter = h('span', { class: 'field__hint', text: `${(prefs?.comentario ?? '').length}/${MAX_COMENTARIO}` });
    const comentario = h('textarea', {
      id: comentarioId, name: 'comentario', class: 'textarea', rows: 2, maxlength: MAX_COMENTARIO,
      placeholder: 'Por ejemplo: me gustaría llegar a coordinar un equipo', text: prefs?.comentario ?? '',
      'aria-describedby': `${comentarioId}-aviso`,
    });
    comentario.addEventListener('input', () => { counter.textContent = `${comentario.value.length}/${MAX_COMENTARIO}`; });

    const form = h('form', { class: 'advisor-form', novalidate: true },
      h('fieldset', { class: 'choice-set', dataset: { field: 'objetivo' } },
        h('legend', { class: 'choice-set__legend' }, h('span', { class: 'quiz__num', text: '1' }), '¿Qué te gustaría conseguir?'),
        h('div', { class: 'choice-grid' }, opciones.objetivos.map((o) => {
          const id = uniqueId('obj');
          return h('div', { class: 'choice' },
            h('input', { type: 'radio', id, name: 'objetivo', value: o.value, checked: prefs?.objetivo === o.value, class: 'choice__input' }),
            h('label', { for: id, class: 'choice__label' }, h('span', { class: 'choice__icon' }, icon(ICONOS_OBJETIVO[o.value] ?? 'target')), h('span', { text: o.label })));
        })),
        h('p', { class: 'field__error', hidden: true })),
      h('fieldset', { class: 'choice-set' },
        h('legend', { class: 'choice-set__legend' }, h('span', { class: 'quiz__num', text: '2' }), '¿Qué temas te interesan?', h('span', { class: 'muted small', text: ' (opcional, varios)' })),
        h('div', { class: 'chip-group' }, opciones.temas.map((t) => {
          const id = uniqueId('tema');
          return h('span', { class: 'chip-check' },
            h('input', { type: 'checkbox', id, name: 'intereses', value: t, checked: prefs?.intereses.includes(t) ?? false }),
            h('label', { for: id, class: 'chip' }, icon(CATEGORIAS[t]?.icon ?? 'tag', { size: 'sm' }), CATEGORIAS[t]?.short ?? t));
        }))),
      h('div', { class: 'advisor-form__row' },
        segmented('¿Cuánto tiempo tienes a la semana?', '3', 'minutos_semana', opciones.minutos.map((m) => ({ value: String(m), label: minutes(m) })), String(prefs?.minutos_semana ?? 15)),
        segmented('¿Cómo prefieres aprender?', '4', 'formato', opciones.formatos, prefs?.formato ?? 'TEXTO')),
      h('div', { class: 'field', dataset: { field: 'comentario' } },
        h('label', { class: 'field__label', for: comentarioId }, h('span', { class: 'quiz__num', text: '5' }), ' ¿Algo más que quieras contarnos? ', h('span', { class: 'muted small', text: '(opcional)' })),
        comentario,
        h('div', { class: 'checkin-form__nota-ayuda' },
          h('span', { class: 'field__hint advisor-form__warn', id: `${comentarioId}-aviso` }, icon('shield-alert', { size: 'sm' }), ' No incluyas datos personales ni de salud: ni nombres, ni teléfonos, ni emails.'),
          counter),
        h('p', { class: 'field__error', hidden: true })),
      errorBox,
      submit,
      prefs ? button({ text: 'Cancelar', variant: 'tertiary', block: true, onClick: showResults }) : null);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearFieldErrors(form);
      errorBox.replaceChildren();
      const objetivo = form.querySelector('input[name="objetivo"]:checked')?.value;
      if (!objetivo) {
        showFieldErrors(form, { objetivo: 'Elige qué te gustaría conseguir.' });
        form.querySelector('input[name="objetivo"]')?.focus();
        return;
      }
      const input = {
        objetivo,
        intereses: [...form.querySelectorAll('input[name="intereses"]:checked')].map((c) => c.value),
        minutos_semana: Number(form.querySelector('input[name="minutos_semana"]:checked')?.value ?? 15),
        formato: form.querySelector('input[name="formato"]:checked')?.value ?? 'TEXTO',
      };
      const texto = comentario.value.trim();
      input.comentario = texto || null;
      setLoading(submit, true, 'Guardando…');
      try {
        prefs = (await advisor.savePreferences(input)).data;
        showResults(true);
      } catch (error) {
        setLoading(submit, false);
        if (error instanceof ApiError && error.code === 'PH-AI-004') {
          showFieldErrors(form, { comentario: error.apiMessage ?? error.message });
          return;
        }
        const orphan = error instanceof ApiError ? showFieldErrors(form, error.fieldErrors) : {};
        errorBox.append(alertBox({ tone: 'danger', text: Object.keys(orphan).length ? Object.values(orphan).join(' ') : error.message }));
      }
    });

    replace(root,
      card({
        title: prefs ? 'Cambia tus preferencias' : '¿Qué te conviene aprender?',
        iconName: 'sparkles',
        className: 'advisor-card',
        body: h('div', { class: 'stack' },
          h('p', { class: 'muted', text: 'Cuéntanos qué buscas en menos de 30 segundos y te recomendaremos módulos del catálogo, con el motivo y un plan para tu semana.' }),
          form),
      }),
      howItWorks());
    root.querySelector('h2')?.focus?.();
  }

  /* ---------- Recomendaciones ---------- */

  async function showResults(focus = false) {
    replace(root, prefsSummary(), h('div', { class: 'stack', 'aria-busy': 'true' }, loadingState({ label: 'Buscando lo que más te conviene…', lines: 4 })));
    if (!navigator.onLine) {
      const cached = trainingCache.get('asesor');
      replace(root, prefsSummary(),
        alertBox({ tone: 'warning', iconName: 'wifi-off', text: 'Estás sin conexión: para pedir recomendaciones nuevas necesitas señal.' }),
        cached ? resultsBody(cached.data, cached.meta, true) : null);
      return;
    }
    try {
      const res = await advisor.ask();
      trainingCache.set('asesor', res);
      replace(root, prefsSummary(), resultsBody(res.data, res.meta, false), howItWorks());
      if (focus) root.querySelector('.advisor-results h2')?.focus();
    } catch (error) {
      replace(root, prefsSummary(), errorState({ error, onRetry: () => showResults(), title: 'No hemos podido preparar tus recomendaciones.' }));
    }
  }

  function prefsSummary() {
    if (!prefs) return null;
    const objetivo = opciones.objetivos.find((o) => o.value === prefs.objetivo)?.label ?? prefs.objetivo;
    return h('section', { class: 'advisor-prefs', 'aria-label': 'Tus preferencias' },
      h('div', { class: 'advisor-prefs__text' },
        h('span', { class: 'small muted', text: 'Tu objetivo' }),
        h('strong', {}, icon(ICONOS_OBJETIVO[prefs.objetivo] ?? 'target', { size: 'sm' }), ` ${objetivo}`),
        h('span', { class: 'advisor-prefs__chips' },
          prefs.intereses.map((t) => categoryBadge(t)),
          badge(`${minutes(prefs.minutos_semana)} a la semana`, { iconName: 'clock' }))),
      h('div', { class: 'advisor-prefs__actions' },
        button({ text: 'Cambiar', variant: 'secondary', iconName: 'pencil', onClick: showForm }),
        button({
          text: 'Borrar mis preferencias',
          variant: 'tertiary',
          iconName: 'trash-2',
          onClick: async () => {
            if (!window.confirm('¿Borrar tus preferencias? Podrás volver a indicarlas cuando quieras.')) return;
            try {
              await advisor.deletePreferences();
              prefs = null;
              trainingCache.set('asesor', null);
              toast('Preferencias borradas.');
              showForm();
            } catch (error) {
              toast(error.message, { tone: 'error' });
            }
          },
        })));
  }

  function resultsBody(r, meta, stale) {
    const titleId = uniqueId('reco');
    const ia = r.generado_con_ia;
    return h('section', { class: 'advisor-results', 'aria-labelledby': titleId },
      h('header', { class: 'advisor-results__head' },
        h('h2', { id: titleId, tabindex: '-1', text: 'Te recomendamos' }),
        ia
          ? badge('Recomendación generada con IA', { tone: 'info', iconName: 'sparkles' })
          : badge('Recomendación automática sin IA', { iconName: 'list-checks' })),
      meta?.aviso && !stale ? alertBox({ tone: 'info', text: meta.aviso.message }) : null,
      h('ol', { class: 'advisor-list', role: 'list' }, r.recomendaciones.map((rec, i) => recommendation(rec, r.solicitud_id, i, stale))),
      r.plan_semanal ? h('div', { class: 'player__note' }, icon('calendar'), h('p', {}, h('strong', { text: 'Tu plan: ' }), r.plan_semanal)) : null,
      stale ? null : feedback(r.solicitud_id));
  }

  start();
  return root;
}

/* ---------- Piezas ---------- */

function recommendation(rec, solicitudId, index, stale) {
  const action = h('div', { class: 'advisor-item__action' });
  const titleId = uniqueId('rec');
  function paint() {
    const a = rec.asignacion;
    if (a) {
      const done = a.estado === 'COMPLETADA';
      action.replaceChildren(stateBadge(a.estado),
        h('a', { class: ['btn', done ? 'btn--tertiary' : 'btn--secondary'], href: href(`/formacion/curso/${a.id}`), 'aria-describedby': titleId },
          icon(done ? 'rotate-ccw' : 'play'), h('span', { text: done ? 'Repasar' : (a.estado === 'PENDIENTE' ? 'Empezar' : 'Continuar') })));
      return;
    }
    const btn = button({
      text: 'Inscribirme',
      iconName: 'plus',
      disabled: stale,
      attrs: { 'aria-describedby': titleId },
      onClick: async () => {
        setLoading(btn, true, 'Inscribiendo…');
        try {
          const nueva = await advisor.enroll(rec.modulo.id, solicitudId);
          rec.asignacion = { id: nueva.id, estado: nueva.estado, origen: nueva.origen };
          trainingCache.set('lista', null);
          toast(`Te has inscrito en «${rec.modulo.titulo}».`);
          paint();
          action.querySelector('a')?.focus();
        } catch (error) {
          setLoading(btn, false);
          toast(error.message, { tone: 'error' });
        }
      },
    });
    action.replaceChildren(btn);
  }
  paint();
  return h('li', { class: 'advisor-item', style: { '--i': index } },
    h('span', { class: 'advisor-item__num', 'aria-hidden': 'true', text: String(rec.orden) }),
    moduleArt(rec.modulo.categoria, { size: 'sm' }),
    h('div', { class: 'advisor-item__body' },
      h('div', { class: 'training-item__tags' }, categoryBadge(rec.modulo.categoria), h('span', { class: 'small muted', text: minutes(rec.modulo.duracion_min) })),
      h('h3', { class: 'training-item__title', id: titleId }, h('span', { class: 'visually-hidden', text: `${rec.orden}. ` }), rec.modulo.titulo),
      h('p', { class: 'advisor-item__reason' }, icon(rec.origen === 'IA' ? 'sparkles' : 'lightbulb', { size: 'sm' }), h('span', { text: rec.motivo }))),
    action);
}

function feedback(solicitudId) {
  const box = h('div', { class: 'advisor-feedback' });
  const legendId = uniqueId('util');
  const send = async (util, btn) => {
    box.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    try {
      await advisor.feedback(solicitudId, util);
      box.querySelector('.advisor-feedback__thanks').textContent = util ? '¡Gracias! Nos alegra que te sirva.' : 'Gracias. Nos ayuda a mejorar las recomendaciones.';
    } catch (error) {
      toast(error.message, { tone: 'error' });
    }
  };
  const yes = h('button', { type: 'button', class: 'btn btn--secondary', 'aria-pressed': 'false', onclick: (e) => send(true, e.currentTarget) }, icon('circle-check'), h('span', { text: 'Sí, me sirve' }));
  const no = h('button', { type: 'button', class: 'btn btn--tertiary', 'aria-pressed': 'false', onclick: (e) => send(false, e.currentTarget) }, icon('x'), h('span', { text: 'No mucho' }));
  box.append(h('p', { id: legendId, class: 'advisor-feedback__q', text: '¿Te han sido útiles estas recomendaciones?' }),
    h('div', { class: 'advisor-feedback__btns', role: 'group', 'aria-labelledby': legendId }, yes, no),
    h('p', { class: 'small muted advisor-feedback__thanks', 'aria-live': 'polite' }));
  return box;
}

/** IA-018: qué datos usa el asesor y cuáles no (§12.3). */
function howItWorks() {
  return h('details', { class: 'how' },
    h('summary', {}, icon('info'), '¿Cómo funciona?'),
    h('div', { class: 'how__body' },
      h('p', { text: 'El asesor usa un modelo de inteligencia artificial de Mistral AI (empresa europea) para elegir módulos del catálogo de Pyme Hub. Si no está disponible, te recomendamos con reglas automáticas y te lo indicamos.' }),
      h('div', { class: 'how__cols' },
        h('div', {}, h('strong', {}, icon('check', { size: 'sm' }), ' Qué usa'),
          h('ul', {}, ['Tu puesto (por ejemplo, conductor)', 'Cuánto tiempo llevas: menos de 3 meses, de 3 a 12 o más de un año', 'Tu turno', 'Las preferencias de esta pantalla', 'Los módulos que ya has hecho'].map((t) => h('li', { text: t })))),
        h('div', {}, h('strong', {}, icon('lock', { size: 'sm' }), ' Qué no usa nunca'),
          h('ul', {}, ['Tu nombre, email o empresa', 'Tus check-ins de bienestar ni datos de salud', 'Incidencias, notas ni ningún dato de tu ficha'].map((t) => h('li', { text: t }))))),
      h('p', { class: 'small muted', text: 'Solo recomienda: nada se apunta sin que tú lo elijas. Tu empresa no ve tus preferencias ni tu comentario, solo recuentos de toda la plantilla. Puedes borrarlas cuando quieras.' })));
}

function segmented(legend, num, name, options, value) {
  return h('fieldset', { class: 'segmented' },
    h('legend', { class: 'choice-set__legend' }, h('span', { class: 'quiz__num', text: num }), legend),
    h('div', { class: 'segmented__options segmented__options--auto' }, options.map((o) => {
      const id = uniqueId(name);
      return h('label', { for: id, class: 'segmented__opt' },
        h('input', { type: 'radio', id, name, value: o.value, checked: String(o.value) === String(value) }), o.label);
    })));
}

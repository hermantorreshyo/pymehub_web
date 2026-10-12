import { ApiError, myTraining } from '../../services/api.js';
import { h, replace, svg, uniqueId } from '../../lib/dom.js';
import { formatDate } from '../../lib/format.js';
import { enqueue } from '../../lib/offline-queue.js';
import { href } from '../../lib/router.js';
import {
  APROBADO, CATEGORIAS, NIVELES, ORIGENES, categoryBadge, deadlineText, minutes, moduleArt, stateBadge, trainingCache,
} from '../../lib/training.js';
import { card } from '../../components/ui/Card.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { alertBox } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { errorState, loadingState } from '../../components/ui/StateView.js';
import { toast } from '../../components/ui/Toast.js';

/**
 * Reproductor de un micro-módulo (§10, mockup 09): objetivos, bloques de uno en uno y
 * cuestionario final (RF-041, RF-044: aprobado con ≥ 70 %, intentos ilimitados).
 * Funciona sin conexión con la copia guardada al abrirlo: el avance y las respuestas se
 * guardan en la cola del dispositivo y se envían al recuperar la señal (RF-045, RF-062).
 */
export default async function moduleView({ params }) {
  const id = params.id;
  const root = h('section', { class: 'page module-page cq', 'aria-busy': 'true' }, loadingState({ label: 'Abriendo el módulo…', lines: 5 }));

  async function load() {
    try {
      const res = await myTraining.get(id);
      trainingCache.set(`a:${id}`, res);
      return { ...res, offline: false };
    } catch (error) {
      const cached = trainingCache.get(`a:${id}`);
      if (error instanceof ApiError && error.code === 'PH-NET-001' && cached) return { ...cached, offline: true };
      throw error;
    }
  }

  async function start() {
    root.setAttribute('aria-busy', 'true');
    root.replaceChildren(loadingState({ label: 'Abriendo el módulo…', lines: 5 }));
    try {
      const res = await load();
      root.replaceChildren(...player(res, id));
    } catch (error) {
      root.replaceChildren(
        h('a', { class: 'back-link', href: href('/formacion') }, icon('arrow-left'), 'Volver a mi formación'),
        h('h1', { tabindex: '-1', text: 'Módulo de formación' }),
        errorState({
          error,
          title: error?.code === 'PH-NET-001' ? 'Este módulo no está guardado en tu móvil.' : 'No hemos podido abrir el módulo.',
          onRetry: start,
        }));
    } finally {
      root.removeAttribute('aria-busy');
    }
  }
  await start();
  return { title: 'Formación', node: root };
}

function player(res, id) {
  const a = res.data;
  const m = a.modulo;
  const aprobadoCon = res.meta?.aprobado_con ?? APROBADO;
  const bloques = m.contenido.bloques;
  // Pasos: 0 = objetivos · 1..n = bloques · n+1 = cuestionario
  const steps = [{ kind: 'intro', title: '¿Qué aprenderás?' },
    ...bloques.map((b, i) => ({ kind: 'block', block: b, title: blockTitle(b, i) })),
    { kind: 'quiz', title: 'Cuestionario' }];
  const quizIndex = steps.length - 1;
  const state = {
    step: a.estado === 'COMPLETADA' ? 0 : Math.min(a.bloque_actual ?? 0, quizIndex),
    furthest: a.estado === 'COMPLETADA' ? quizIndex : Math.min(a.bloque_actual ?? 0, quizIndex),
    asignacion: a,
  };

  const titleId = uniqueId('mod');
  const stage = h('div', { class: 'player__stage', 'aria-live': 'polite' });
  const counter = h('p', { class: 'player__counter' });
  const bar = h('div', { class: 'player__bar', 'aria-hidden': 'true' }, h('span', { class: 'player__bar-fill' }));
  const outline = h('ol', { class: 'module-outline', role: 'list' });
  const ringSlot = h('div', { class: 'module-progress' });
  const statusSlot = h('div', { class: 'stack' });

  const hero = h('header', { class: 'module-hero' },
    moduleArt(m.categoria, { size: 'lg', className: 'module-hero__art' }),
    h('div', { class: 'module-hero__text' },
      h('div', { class: 'training-item__tags' }, categoryBadge(m.categoria), h('span', { class: 'hero-state' })),
      h('h1', { id: titleId, tabindex: '-1', text: m.titulo }),
      h('p', { class: 'module-hero__summary', text: m.resumen }),
      h('ul', { class: 'module-hero__meta', role: 'list' },
        h('li', {}, icon('clock'), minutes(m.duracion_min)),
        h('li', {}, icon('signal-medium'), `Nivel ${(NIVELES[m.nivel] ?? m.nivel).toLowerCase()}`),
        h('li', {}, icon(CATEGORIAS[m.categoria]?.icon ?? 'tag'), CATEGORIAS[m.categoria]?.label ?? m.categoria),
        h('li', {}, icon(a.fecha_limite ? 'calendar' : 'user'), a.fecha_limite ? deadlineText(a) : ORIGENES[a.origen] ?? ''))));

  function paintStatus() {
    const s = state.asignacion;
    hero.querySelector('.hero-state').replaceChildren(stateBadge(s.estado));
    ringSlot.replaceChildren(progressRing(s.progreso_pct), h('div', { class: 'module-progress__text' },
      h('strong', { text: s.estado === 'COMPLETADA' ? 'Completado' : `Paso ${Math.min(state.furthest + 1, steps.length)} de ${steps.length}` }),
      h('span', { class: 'small muted', text: s.mejor_nota !== null ? `Mejor nota: ${s.mejor_nota} % · ${s.intentos} ${s.intentos === 1 ? 'intento' : 'intentos'}` : `Para aprobar: ${aprobadoCon} % de aciertos` })));
    replace(statusSlot,
      res.offline ? alertBox({ tone: 'warning', iconName: 'wifi-off', text: 'Sin conexión: estás usando la copia guardada. Tu avance se enviará al recuperar la señal.' }) : null,
      s.estado === 'COMPLETADA' ? alertBox({ tone: 'success', iconName: 'award', text: `Completado el ${formatDate(s.completada_en)} con un ${s.mejor_nota} %. Puedes repasarlo cuando quieras.` }) : null);
  }

  function paintOutline() {
    outline.replaceChildren(...steps.map((s, i) => {
      const done = i < state.furthest || state.asignacion.estado === 'COMPLETADA';
      const current = i === state.step;
      const reachable = i <= state.furthest;
      const label = h('span', { class: 'module-outline__label', text: s.title });
      return h('li', { class: ['module-outline__item', done && 'is-done', current && 'is-current'] },
        h('span', { class: 'module-outline__mark', 'aria-hidden': 'true' }, icon(done ? 'circle-check' : current ? 'circle-dot' : reachable ? 'circle' : 'lock', { size: 'sm' })),
        reachable
          ? h('button', { type: 'button', class: 'module-outline__btn', 'aria-current': current ? 'step' : null, onclick: () => go(i) }, label,
            h('span', { class: 'visually-hidden', text: done ? ' (hecho)' : current ? ' (paso actual)' : '' }))
          : h('span', { class: 'module-outline__btn is-locked' }, label, h('span', { class: 'visually-hidden', text: ' (bloqueado hasta llegar)' })));
    }));
  }

  function go(i) {
    state.step = Math.max(0, Math.min(i, quizIndex));
    if (state.step > state.furthest) {
      state.furthest = state.step;
      saveProgress();
    }
    paint(true);
  }

  /** Avance monótono; sin red se guarda en la cola (el servidor nunca lo hace retroceder). */
  async function saveProgress() {
    const pct = Math.round((state.furthest / quizIndex) * 90);
    if (state.asignacion.estado === 'COMPLETADA') return;
    const input = { bloque: state.furthest, progreso_pct: pct };
    state.asignacion = { ...state.asignacion, progreso_pct: Math.max(state.asignacion.progreso_pct, pct), bloque_actual: state.furthest, estado: state.asignacion.estado === 'PENDIENTE' ? 'EN_CURSO' : state.asignacion.estado };
    trainingCache.set(`a:${id}`, { ...res, data: { ...state.asignacion, modulo: m } });
    try {
      if (!navigator.onLine) throw new ApiError({ code: 'PH-NET-001' });
      const updated = await myTraining.progress(id, input);
      state.asignacion = { ...state.asignacion, ...updated, modulo: m };
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PH-NET-001') {
        await enqueue({ method: 'POST', path: myTraining.progressPath(id), json: input }).catch(() => {});
      }
    }
    paintStatus();
  }

  function paint(focus = false) {
    const s = steps[state.step];
    counter.textContent = `Paso ${state.step + 1} de ${steps.length}`;
    bar.style.setProperty('--value', Math.round(((state.step + 1) / steps.length) * 100));
    const headingId = uniqueId('paso');
    let body;
    if (s.kind === 'intro') body = introStep(m, headingId);
    else if (s.kind === 'block') body = blockStep(s.block, s.title, headingId);
    else body = quizStep(headingId);

    const prev = state.step > 0 ? button({ text: 'Anterior', variant: 'tertiary', iconName: 'chevron-left', onClick: () => go(state.step - 1) }) : h('span');
    const next = s.kind !== 'quiz'
      ? button({ text: state.step + 1 === quizIndex ? 'Ir al cuestionario' : 'Siguiente', iconName: 'chevron-right', className: 'btn--icon-end', onClick: () => go(state.step + 1) })
      : null;
    replace(stage, h('div', { class: 'player__step' }, body), h('div', { class: 'player__nav' }, prev, next));
    paintOutline();
    paintStatus();
    if (focus) stage.querySelector(`#${headingId}`)?.focus();
  }

  /* ---------- Cuestionario ---------- */

  function quizStep(headingId) {
    const preguntas = m.preguntas ?? [];
    const errorBox = h('div', { 'aria-live': 'assertive' });
    const submit = button({ text: 'Enviar respuestas', type: 'submit', iconName: 'send', block: true });
    const form = h('form', { class: 'quiz', novalidate: true },
      h('h2', { id: headingId, tabindex: '-1', class: 'player__title' }, icon('list-checks'), 'Cuestionario'),
      h('p', { class: 'muted', text: `${preguntas.length} preguntas. Aprobarás con un ${aprobadoCon} % de aciertos y puedes repetirlo las veces que quieras.` }),
      preguntas.map((p, i) => questionField(p, i)),
      errorBox,
      submit);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.replaceChildren();
      const respuestas = preguntas.map((p, i) => {
        const v = form.elements[`p${i}`]?.value;
        return v === undefined || v === '' ? null : Number(v);
      });
      const missing = respuestas.findIndex((r) => r === null);
      if (missing >= 0) {
        errorBox.append(alertBox({ tone: 'warning', text: `Te falta responder la pregunta ${missing + 1}.` }));
        form.querySelector(`input[name="p${missing}"]`)?.focus();
        return;
      }
      const input = { respuestas, envio_id: crypto.randomUUID() };
      setLoading(submit, true, 'Corrigiendo…');
      try {
        if (!navigator.onLine) throw new ApiError({ code: 'PH-NET-001' });
        const out = await myTraining.submit(id, input);
        state.asignacion = { ...out.asignacion, modulo: m };
        trainingCache.set(`a:${id}`, { ...res, data: { ...state.asignacion, modulo: m } });
        trainingCache.set('lista', null);
        stage.replaceChildren(resultPanel(out.resultado, preguntas, respuestas));
        paintOutline();
        paintStatus();
        stage.querySelector('h2')?.focus();
      } catch (error) {
        if (error instanceof ApiError && error.code === 'PH-NET-001') {
          await enqueue({ method: 'POST', path: myTraining.submitPath(id), json: input });
          stage.replaceChildren(queuedPanel());
          stage.querySelector('h2')?.focus();
          return;
        }
        setLoading(submit, false);
        errorBox.append(alertBox({ tone: 'danger', text: error.message ?? 'No hemos podido corregir el cuestionario.' }));
      }
    });
    return form;
  }

  function resultPanel(r, preguntas, respuestas) {
    const titleId = uniqueId('nota');
    const passed = r.aprobado;
    return h('section', { class: ['quiz-result', passed ? 'quiz-result--ok' : 'quiz-result--retry'], 'aria-labelledby': titleId },
      h('span', { class: 'quiz-result__icon', 'aria-hidden': 'true' }, icon(passed ? 'party-popper' : 'rotate-ccw', { size: 'lg' })),
      h('h2', { id: titleId, tabindex: '-1', text: passed ? '¡Módulo completado!' : 'Casi lo tienes' }),
      h('p', { class: 'quiz-result__score' }, h('strong', { text: `${r.nota} %` }), ` · ${r.aciertos} de ${r.total} respuestas correctas`),
      h('p', { class: 'muted', text: passed
        ? 'Buen trabajo. Lo hemos guardado en tu formación.'
        : `Necesitas un ${aprobadoCon} %. Repasa las preguntas marcadas y vuelve a intentarlo: no hay límite de intentos.` }),
      h('ol', { class: 'quiz-review', role: 'list' }, r.detalle.map((d, i) => h('li', { class: ['quiz-review__item', d.correcta ? 'is-ok' : 'is-ko'] },
        icon(d.correcta ? 'circle-check' : 'circle-alert'),
        h('div', {},
          h('p', { class: 'quiz-review__q', text: preguntas[i].enunciado }),
          h('p', { class: 'small' }, h('span', { class: 'muted', text: 'Tu respuesta: ' }), preguntas[i].opciones[respuestas[i]], d.correcta ? ' · Correcta' : ' · Incorrecta'),
          passed && !d.correcta && d.solucion !== undefined
            ? h('p', { class: 'small' }, h('span', { class: 'muted', text: 'Respuesta correcta: ' }), preguntas[i].opciones[d.solucion])
            : null)))),
      h('div', { class: 'checkin-done__actions' },
        passed
          ? h('a', { class: 'btn btn--primary', href: href('/formacion') }, icon('graduation-cap'), h('span', { text: 'Volver a mi formación' }))
          : button({ text: 'Volver a intentarlo', iconName: 'rotate-ccw', onClick: () => paint(true) }),
        passed
          ? h('a', { class: 'btn btn--secondary', href: href('/formacion', { tab: 'catalogo' }) }, icon('library'), h('span', { text: 'Seguir aprendiendo' }))
          : button({ text: 'Repasar el contenido', variant: 'secondary', iconName: 'book-open', onClick: () => go(1) })));
  }

  function queuedPanel() {
    const titleId = uniqueId('cola');
    return h('section', { class: 'quiz-result quiz-result--queued', 'aria-labelledby': titleId },
      h('span', { class: 'quiz-result__icon', 'aria-hidden': 'true' }, icon('wifi-off', { size: 'lg' })),
      h('h2', { id: titleId, tabindex: '-1', text: 'Respuestas guardadas en tu móvil' }),
      h('p', { class: 'muted', text: 'Estás sin conexión. Las enviaremos en cuanto recuperes la señal y verás tu nota en Mi formación.' }),
      h('a', { class: 'btn btn--secondary', href: href('/formacion') }, icon('graduation-cap'), h('span', { text: 'Volver a mi formación' })));
  }

  paint();
  return [
    h('a', { class: 'back-link', href: href('/formacion') }, icon('arrow-left'), 'Volver a mi formación'),
    hero,
    statusSlot,
    h('div', { class: 'module-layout' },
      h('section', { class: 'card player', 'aria-labelledby': titleId },
        h('div', { class: 'player__head' }, counter, bar),
        stage),
      h('aside', { class: 'stack module-aside', 'aria-label': 'Tu progreso en el módulo' },
        card({ title: 'Tu progreso', iconName: 'target', body: ringSlot }),
        card({ title: 'Contenido del módulo', iconName: 'list-checks', body: outline }))),
  ];
}

/* ---------- Pasos ---------- */

function blockTitle(b, i) {
  if (b.tipo === 'consejo') return 'Consejo clave';
  if (b.tipo === 'imagen') return 'Para situarte';
  return b.titulo ?? `Bloque ${i + 1}`;
}

function introStep(m, headingId) {
  return h('div', { class: 'player__block' },
    h('h2', { id: headingId, tabindex: '-1', class: 'player__title' }, icon('target'), '¿Qué aprenderás?'),
    h('ul', { class: 'goal-list', role: 'list' }, m.contenido.objetivos.map((o) => h('li', {}, icon('circle-check'), h('span', { text: o })))),
    h('div', { class: 'player__note' }, icon('lightbulb'),
      h('p', { text: `Son ${m.contenido.bloques.length} bloques cortos y un cuestionario final. Tu avance se guarda en cada paso.` })));
}

function blockStep(b, title, headingId) {
  const heading = (iconName) => h('h2', { id: headingId, tabindex: '-1', class: 'player__title' }, icon(iconName), title);
  switch (b.tipo) {
    case 'texto':
      return h('div', { class: 'player__block' }, heading('book-open'), h('p', { class: 'player__text', text: b.texto }));
    case 'lista':
      return h('div', { class: 'player__block' }, heading('list-checks'),
        h('ul', { class: 'goal-list goal-list--plain', role: 'list' }, b.items.map((t) => h('li', {}, icon('check'), h('span', { text: t })))));
    case 'consejo':
      return h('div', { class: 'player__block' }, heading('lightbulb'),
        h('blockquote', { class: 'tip' }, icon('lightbulb', { size: 'lg' }), h('p', { text: b.texto })));
    case 'imagen':
      return h('div', { class: 'player__block' }, heading('eye'),
        h('figure', { class: 'player__figure' }, moduleArt(b.ilustracion, { size: 'xl', alt: b.alt }), h('figcaption', { class: 'small muted', text: b.alt })));
    default:
      return h('div', { class: 'player__block' }, heading('book-open'));
  }
}

function questionField(p, i) {
  const legendId = uniqueId(`p${i}`);
  return h('fieldset', { class: 'quiz__q', 'aria-labelledby': legendId },
    h('legend', { id: legendId, class: 'quiz__legend' }, h('span', { class: 'quiz__num', text: String(i + 1) }), h('span', { text: p.enunciado })),
    h('div', { class: 'quiz__options' }, p.opciones.map((o, k) => {
      const optId = uniqueId(`p${i}o${k}`);
      return h('div', { class: 'quiz__opt' },
        h('input', { type: 'radio', id: optId, name: `p${i}`, value: k, class: 'quiz__input' }),
        h('label', { for: optId, class: 'quiz__label' }, h('span', { class: 'quiz__radio', 'aria-hidden': 'true' }), h('span', { text: o })));
    })));
}

/** Anillo de progreso con el porcentaje en texto (no depende del color). */
function progressRing(pct) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, pct));
  return h('div', { class: 'ring', role: 'img', 'aria-label': `Progreso del módulo: ${value} %` },
    svg('svg', { viewBox: '0 0 72 72', class: 'ring__svg', 'aria-hidden': 'true', focusable: 'false' },
      svg('circle', { cx: 36, cy: 36, r, class: 'ring__track' }),
      svg('circle', { cx: 36, cy: 36, r, class: 'ring__value', 'stroke-dasharray': `${(c * value) / 100} ${c}` })),
    h('span', { class: 'ring__text', 'aria-hidden': 'true' }, h('strong', { text: `${value} %` })));
}

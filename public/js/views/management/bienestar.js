import { alerts, teams, wellbeing } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { updateQuery } from '../../lib/router.js';
import { chartBlock } from '../../lib/charts.js';
import { dec, levelOf, weekLabel, wellbeingBadge } from '../../lib/wellbeing.js';
import { page } from '../../components/layout/Page.js';
import { card } from '../../components/ui/Card.js';
import { badge } from '../../components/ui/Badge.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { selectField } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { kpiCard } from '../../components/dashboard/KPICard.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { toast } from '../../components/ui/Toast.js';

/**
 * Bienestar del equipo para gerencia y RR. HH. (§11, mockups 06 y 08 adaptados a §13.6).
 * - Solo agregados anónimos: medias semanales por equipo con ≥ 5 personas (RF-053, LEG-002).
 * - Índice 0–100 con nivel en texto e icono, nunca solo color (RNF-044).
 * - Alertas de equipo (RF-054) que la persona gestiona: el sistema solo avisa (LEG-005).
 */
export default function bienestarView({ query }) {
  const state = {
    equipo: query.equipo ? Number(query.equipo) : null,
    semanas: [8, 12, 26].includes(Number(query.semanas)) ? Number(query.semanas) : 8,
  };

  const scopeSlot = h('div', { class: 'wb-toolbar' });
  const content = h('div', { class: 'stack' });

  function load() {
    updateQuery({ equipo: state.equipo, semanas: state.semanas === 8 ? null : state.semanas });
    content.replaceChildren(dataView({
      load: async (signal) => {
        const [summary, alertRes] = await Promise.all([
          wellbeing.summary({ team_id: state.equipo, weeks: state.semanas }, signal),
          alerts.list({ status: 'all', tipo: 'BIENESTAR_EQUIPO', per_page: 10 }, signal),
        ]);
        return { summary, alertRes };
      },
      loadingLabel: 'Cargando el bienestar del equipo…',
      lines: 6,
      render: ({ summary, alertRes }, { reload }) => body(summary, alertRes, reload),
    }));
  }

  // Selector de ámbito: empresa completa o un equipo
  teams.list().then((list) => {
    const scope = selectField({
      name: 'equipo',
      label: 'Ámbito',
      value: state.equipo ?? '',
      options: [{ value: '', label: 'Toda la empresa' }, ...list.map((t) => ({ value: t.id, label: t.nombre }))],
    });
    const period = selectField({
      name: 'semanas',
      label: 'Periodo',
      value: state.semanas,
      options: [{ value: 8, label: 'Últimas 8 semanas' }, { value: 12, label: 'Últimas 12 semanas' }, { value: 26, label: 'Últimos 6 meses' }],
    });
    scope.querySelector('select').addEventListener('change', (e) => { state.equipo = e.target.value ? Number(e.target.value) : null; load(); });
    period.querySelector('select').addEventListener('change', (e) => { state.semanas = Number(e.target.value); load(); });
    scopeSlot.replaceChildren(scope, period);
  }).catch(() => scopeSlot.replaceChildren());

  function selectTeam(id) {
    state.equipo = id;
    const select = scopeSlot.querySelector('select[name="equipo"]');
    if (select) select.value = String(id ?? '');
    load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function body(res, alertRes, reload) {
    const d = res.data;
    const a = d.actual;
    const scopeName = d.ambito.tipo === 'EQUIPO' ? `Equipo ${d.ambito.nombre}` : 'Toda la empresa';

    const kpis = h('ul', { class: 'kpi-grid', role: 'list', 'aria-label': `Indicadores de bienestar · ${scopeName}` },
      a
        ? kpiCard({
          title: 'Índice de bienestar',
          value: `${a.indice}/100`,
          note: a.variacion === null ? (a.en_curso ? 'Semana en curso' : weekLabel(a.semana))
            : `${a.variacion > 0 ? '+' : ''}${a.variacion} frente a la semana anterior`,
          noteTone: a.variacion === null ? null : (a.variacion >= 0 ? 'up' : 'alert'),
          noteIcon: a.variacion === null ? null : (a.variacion >= 0 ? 'arrow-up' : 'arrow-down'),
          iconName: 'heart',
          tone: a.nivel === 'BUENO' ? 'success' : a.nivel === 'ATENCION' ? 'warning' : 'danger',
        })
        : kpiCard({ title: 'Índice de bienestar', value: 'Sin datos suficientes', note: 'Mínimo 5 personas por semana', iconName: 'lock', tone: 'muted' }),
      a
        ? kpiCard({ title: 'Participación', value: `${formatNumber(a.participantes)} de ${formatNumber(a.plantilla)}`, note: 'Personas que respondieron esa semana', iconName: 'users', tone: 'info' })
        : kpiCard({ title: 'Participación', value: '—', note: 'Se muestra al superar el umbral', iconName: 'users', tone: 'muted' }),
      a
        ? kpiCard({ title: 'Estrés medio', value: `${dec(a.estres)}/5`, note: a.estres >= 3.5 ? 'Por encima de lo habitual' : 'Dentro de lo habitual', noteTone: a.estres >= 3.5 ? 'alert' : null, iconName: 'gauge', tone: a.estres >= 3.5 ? 'warning' : 'info' })
        : kpiCard({ title: 'Estrés medio', value: '—', note: 'Se muestra al superar el umbral', iconName: 'gauge', tone: 'muted' }),
      kpiCard({
        title: 'Alertas abiertas',
        value: formatNumber(alertRes.data.filter((x) => x.estado === 'ABIERTA').length),
        note: 'De bienestar de equipo',
        iconName: 'bell',
        tone: alertRes.data.some((x) => x.estado === 'ABIERTA') ? 'danger' : 'success',
      }));

    const labels = d.semanas.map((s) => (s.en_curso ? 'Esta semana' : weekLabel(s.semana)));
    const evolution = card({
      title: `Evolución del bienestar · ${scopeName}`,
      iconName: 'activity',
      body: a === null && d.semanas.every((s) => !s.disponible)
        ? anonymityState()
        : h('div', { class: 'stack' },
          a ? h('ul', { class: 'dims', role: 'list', 'aria-label': 'Medias de la semana de referencia (escala 1 a 5)' },
            dim('Ánimo', a.animo, 1), dim('Energía', a.energia, 2), dim('Estrés', a.estres, 3)) : null,
          chartBlock({
            label: `Índice de bienestar semanal (0–100) · ${scopeName}`,
            labels,
            series: [{ name: 'Índice de bienestar', data: d.semanas.map((s) => s.indice), color: 1 }],
            yMin: 0, yMax: 100, stepY: 25, area: true, height: 240,
          }),
          chartBlock({
            label: `Ánimo, energía y estrés por semana (1–5) · ${scopeName}`,
            labels,
            series: [
              { name: 'Ánimo', data: d.semanas.map((s) => s.animo), color: 1 },
              { name: 'Energía', data: d.semanas.map((s) => s.energia), color: 2 },
              { name: 'Estrés', data: d.semanas.map((s) => s.estres), color: 3 },
            ],
            yMin: 1, yMax: 5, stepY: 1, height: 240,
          }),
          d.semanas.some((s) => !s.disponible)
            ? h('p', { class: 'anon-note' }, icon('lock', { size: 'sm' }), 'Las semanas con menos de 5 personas no se muestran para proteger el anonimato.')
            : null),
    });

    const teamsCard = d.ambito.tipo === 'EMPRESA'
      ? card({
        title: 'Equipos · últimas 4 semanas',
        iconName: 'users',
        body: d.equipos.length
          ? h('ul', { class: 'team-wb', role: 'list' }, d.equipos.map((t) => teamRow(t, selectTeam)))
          : emptyState({ title: 'Todavía no hay equipos.', text: 'Crea equipos en Plantilla para comparar su bienestar.', iconName: 'users' }),
      })
      : card({
        title: 'Equipo seleccionado',
        iconName: 'users',
        body: h('div', { class: 'stack' },
          h('p', { class: 'muted', text: 'Estás viendo solo este equipo. Vuelve a la vista general para compararlo con los demás.' }),
          button({ text: 'Ver toda la empresa', variant: 'secondary', iconName: 'arrow-left', onClick: () => selectTeam(null) })),
      });

    const alertsCard = card({
      title: 'Alertas de bienestar',
      iconName: 'bell',
      body: alertRes.data.length
        ? h('ul', { class: 'alert-list', role: 'list' }, alertRes.data.map((x) => alertItem(x, reload)))
        : emptyState({
          title: 'No hay alertas de bienestar.',
          text: 'Te avisaremos si el estrés de un equipo sube de forma marcada o su ánimo baja de 2,5.',
          iconName: 'circle-check',
        }),
    });

    return h('div', { class: 'stack' },
      kpis,
      h('div', { class: 'wb-grid' }, evolution, h('div', { class: 'stack' }, teamsCard, alertsCard)),
      h('p', { class: 'anon-note' }, icon('shield-check', { size: 'sm' }),
        `Datos agregados y anónimos: solo se muestran grupos de ${res.data.umbral_anonimato} personas o más. Nunca verás respuestas ni notas individuales. El check-in es voluntario y no responder no tiene ninguna consecuencia.`));
  }

  load();
  return page({
    title: 'Bienestar',
    subtitle: 'Conoce cómo se siente tu equipo y detecta a tiempo lo que necesita atención.',
    children: [scopeSlot, content],
  });
}

/* ---------- Piezas ---------- */

function dim(label, value, color) {
  return h('li', {},
    h('span', { class: 'dims__label' }, h('span', { class: `dims__dot dims__dot--${color}`, 'aria-hidden': 'true' }), label),
    h('span', { class: 'dims__value' }, dec(value), h('small', { text: '/5' })));
}

function teamRow(t, onSelect) {
  if (!t.disponible) {
    return h('li', { class: 'team-wb__item team-wb__item--locked' },
      h('span', { class: 'team-wb__name' }, icon('lock', { size: 'sm' }), t.nombre),
      wellbeingBadge(null),
      h('span', { class: 'team-wb__meta', text: 'Menos de 5 personas respondieron: se oculta para proteger el anonimato.' }));
  }
  const level = t.nivel ?? levelOf(t.indice);
  return h('li', { class: ['team-wb__item', `team-wb__item--${level}`] },
    h('span', { class: 'team-wb__name' },
      h('a', { href: '#/bienestar', onclick: (e) => { e.preventDefault(); onSelect(t.id); }, text: t.nombre })),
    h('span', { class: 'team-wb__value' }, String(t.indice), h('small', { text: '/100' })),
    h('span', { class: 'team-wb__bar', 'aria-hidden': 'true' }, h('span', { class: 'team-wb__fill', style: { '--w': `${t.indice}%` } })),
    h('span', { class: 'team-wb__meta' },
      wellbeingBadge(level),
      h('span', { text: `Estrés ${dec(t.estres)}/5` }),
      h('span', { text: `${t.participantes} personas` })));
}

function alertItem(x, reload) {
  const open = x.estado === 'ABIERTA';
  const actions = h('div', { class: 'alert-item__actions' });
  if (open) {
    const done = button({ text: 'Marcar como gestionada', variant: 'secondary', iconName: 'check' });
    const dismiss = button({ text: 'Descartar', variant: 'tertiary', iconName: 'x' });
    const act = (btn, estado, msg) => async () => {
      setLoading(btn, true, 'Guardando…');
      try {
        await alerts.update(x.id, { estado });
        toast(msg);
        reload();
      } catch (error) {
        setLoading(btn, false);
        toast(error.message, { tone: 'error' });
      }
    };
    done.addEventListener('click', act(done, 'GESTIONADA', 'Alerta marcada como gestionada.'));
    dismiss.addEventListener('click', act(dismiss, 'DESCARTADA', 'Alerta descartada.'));
    actions.append(done, dismiss);
  }
  const sev = x.severidad === 'ALTA'
    ? badge('Prioridad alta', { tone: 'danger', iconName: 'triangle-alert' })
    : badge('Prioridad media', { tone: 'warning', iconName: 'circle-alert' });
  const status = open ? sev : badge(x.estado === 'GESTIONADA' ? 'Gestionada' : 'Descartada', { tone: x.estado === 'GESTIONADA' ? 'success' : 'neutral', iconName: x.estado === 'GESTIONADA' ? 'circle-check' : 'x' });
  return h('li', { class: ['alert-item', `alert-item--${x.severidad}`, !open && 'alert-item--done'] },
    h('div', { class: 'alert-item__head' },
      status,
      x.entidad_nombre ? h('strong', { text: x.entidad_nombre }) : null,
      h('span', { class: 'alert-item__date', text: formatDate(x.creado_en) })),
    h('p', { text: x.mensaje }),
    open ? actions : (x.gestion ? h('p', { class: 'alert-item__gestion', text: `${x.estado === 'GESTIONADA' ? 'Gestionada' : 'Descartada'} por ${x.gestion.por ?? '—'} · ${formatDate(x.gestion.en)}` }) : null));
}

function anonymityState() {
  return emptyState({
    title: 'Todavía no hay respuestas suficientes.',
    text: 'Para proteger el anonimato, el bienestar solo se muestra cuando al menos 5 personas han respondido en la semana. Anima a tu equipo a hacer su check-in: es voluntario y solo lleva 15 segundos.',
    iconName: 'lock',
  });
}

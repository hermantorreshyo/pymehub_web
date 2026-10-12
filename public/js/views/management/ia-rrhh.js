import { alerts, baseline, dashboard, risk, teams } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatDate, formatNumber, label, plural } from '../../lib/format.js';
import { href, updateQuery } from '../../lib/router.js';
import { session } from '../../lib/store.js';
import { chartBlock } from '../../lib/charts.js';
import { DIMENSIONES, NIVELES_RIESGO, baselineComparison, factorChips, pct, scoreMeter, supervisionNote } from '../../lib/risk.js';
import { page, tabs } from '../../components/layout/Page.js';
import { kpiCard } from '../../components/dashboard/KPICard.js';
import { personLine } from '../../components/ui/Avatar.js';
import { badge, levelBadge } from '../../components/ui/Badge.js';
import { button, linkButton, setLoading } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { selectField, textField } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { table } from '../../components/ui/Table.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { toast } from '../../components/ui/Toast.js';

const TABS = ['panel', 'ranking', 'sesgos'];
const SUBTITLE = 'Anticipa la rotación y cuida a las personas que hacen crecer tu negocio.';

/* =====================================================================
 * Plan Entrada: vista informativa del plan Completo (RF-012)
 * ===================================================================== */
function planInfo() {
  const ventajas = [
    ['shield-alert', 'Riesgo de rotación explicado', 'Cada alerta muestra los factores que la provocan y su fuente, para que la decisión sea siempre de una persona.'],
    ['chart-line', 'Tendencias y línea base', 'Compara la rotación de tu empresa con la de los 12 meses anteriores, con datos reales.'],
    ['users', 'Alertas a RR. HH.', 'Avisos a tiempo para tener una conversación antes de que alguien decida irse.'],
  ];
  return page({
    title: 'IA de RR. HH.',
    subtitle: SUBTITLE,
    children: [
      card({
        title: 'Disponible en el plan Completo',
        iconName: 'sparkles',
        body: [
          h('p', { text: 'Tu empresa tiene el plan Entrada, con Bienestar, Formación y el Asesor de formación. El plan Completo añade la IA de RR. HH.:' }),
          h('ul', { class: 'list' }, ventajas.map(([ic, title, text]) => h('li', { class: 'list__item' },
            h('span', { class: 'person' },
              h('span', { class: 'state__icon' }, icon(ic)),
              h('span', { class: 'person__text' },
                h('strong', { text: title }),
                h('span', { class: 'person__meta', text }))))),
          ),
          h('p', { class: 'small muted', text: 'Para cambiar de plan, habla con tu persona de contacto en Pyme Hub.' }),
        ],
      }),
    ],
  });
}

/* =====================================================================
 * Plan Completo: panel, ranking y revisión de sesgos (§9)
 * ===================================================================== */
export default function iaRrhhView({ query }) {
  if (!session.hasFeature('riesgo_rotacion')) return planInfo();
  const tab = TABS.includes(query.tab) ? query.tab : 'panel';
  const nav = tabs('Secciones de IA de RR. HH.', [
    { id: 'panel', label: 'Panel', href: href('/ia-rrhh'), iconName: 'gauge' },
    { id: 'ranking', label: 'Por persona', href: href('/ia-rrhh', { tab: 'ranking' }), iconName: 'list-ordered' },
    { id: 'sesgos', label: 'Sesgos', href: href('/ia-rrhh', { tab: 'sesgos' }), iconName: 'scale' },
    { id: 'metodologia', label: 'Metodología', href: href('/ia-rrhh/metodologia'), iconName: 'book-open' },
  ], tab);
  const body = tab === 'ranking' ? rankingTab(query) : tab === 'sesgos' ? biasTab() : panelTab();
  return page({
    title: 'IA de RR. HH.',
    subtitle: SUBTITLE,
    tabs: nav,
    children: [h('div', { class: 'cq' }, body)],
  });
}

/* ---------- Recalcular (RF-031) ---------- */

function recalcButton(onDone) {
  const btn = button({ text: 'Recalcular ahora', variant: 'secondary', iconName: 'refresh-cw' });
  btn.addEventListener('click', async () => {
    setLoading(btn, true, 'Recalculando…');
    try {
      const r = await risk.recalculate();
      toast(`Riesgo recalculado: ${plural(r.alto, 'persona', 'personas')} en nivel alto${r.alertas ? ` y ${plural(r.alertas, 'alerta nueva', 'alertas nuevas')}` : ''}.`);
      onDone();
    } catch (error) {
      setLoading(btn, false);
      toast(error.code === 'PH-RATE-001' && error.apiMessage ? error.apiMessage : error.message, { tone: 'error' });
    }
  });
  return btn;
}

/* ---------- Panel ---------- */

function panelTab() {
  const root = h('div', { class: 'stack' });
  const view = dataView({
    loadingLabel: 'Cargando el panel de IA de RR. HH.…',
    lines: 8,
    load: async (signal) => {
      const [overview, trends, open] = await Promise.all([
        dashboard.overview(signal),
        dashboard.trends(6, signal),
        alerts.list({ status: 'all', tipo: 'RIESGO_ROTACION', per_page: 6 }, signal),
      ]);
      return { o: overview.data, trends: trends.data, alertas: open };
    },
    render: ({ o, trends, alertas }, { reload }) => panelBody(o, trends, alertas, reload),
  });
  root.append(view);
  return root;
}

function panelBody(o, trends, alertRes, reload) {
  const r = o.riesgo;
  const kpis = h('ul', { class: 'kpi-grid', role: 'list', 'aria-label': 'Indicadores de rotación y riesgo' },
    kpiCard({
      title: 'En riesgo alto',
      value: formatNumber(r.alto),
      note: `de ${plural(o.plantilla_activa, 'persona', 'personas')} de alta`,
      iconName: 'shield-alert',
      tone: r.alto ? 'danger' : 'success',
      href: href('/ia-rrhh', { tab: 'ranking', nivel: 'ALTO' }),
    }),
    kpiCard({
      title: 'Rotación a 12 meses',
      value: pct(o.rotacion_12m),
      note: `${pct(o.rotacion_voluntaria_12m)} voluntaria · ${plural(o.bajas_12m, 'baja', 'bajas')}`,
      iconName: 'trending-up',
      tone: 'info',
    }),
    kpiCard({
      title: 'Antigüedad media',
      value: o.antiguedad_media_meses === null ? 'Sin datos' : `${formatNumber(o.antiguedad_media_meses, { maximumFractionDigits: 1 })} meses`,
      note: 'De la plantilla de alta',
      iconName: 'calendar',
      tone: 'info',
    }),
    kpiCard({
      title: 'Alertas de rotación',
      value: formatNumber(o.alertas_riesgo_abiertas ?? 0),
      note: o.alertas_riesgo_abiertas ? 'Abiertas: pendientes de una conversación' : 'Ninguna pendiente',
      noteTone: o.alertas_riesgo_abiertas ? 'alert' : null,
      iconName: 'bell',
      tone: o.alertas_riesgo_abiertas ? 'warning' : 'success',
    }));

  const total = r.alto + r.medio + r.bajo;
  const distribution = card({
    title: 'Distribución del riesgo',
    iconName: 'gauge',
    actions: recalcButton(reload),
    body: total === 0
      ? emptyState({ title: 'Todavía no hay puntuaciones.', text: 'Añade personas a la plantilla: el riesgo se calcula cada noche y bajo demanda.', iconName: 'users' })
      : h('div', { class: 'stack' },
        h('ul', { class: 'risk-dist', role: 'list' }, ['ALTO', 'MEDIO', 'BAJO'].map((n) => {
          const count = r[n.toLowerCase()];
          const share = total ? Math.round((count / total) * 100) : 0;
          return h('li', { class: ['risk-dist__item', `risk-dist__item--${n}`] },
            h('a', { class: 'risk-dist__label', href: href('/ia-rrhh', { tab: 'ranking', nivel: n }) },
              levelBadge(n), h('span', { class: 'small muted', text: NIVELES_RIESGO[n].range })),
            h('span', { class: 'risk-dist__value' }, formatNumber(count), h('small', { text: ` · ${share} %` })),
            h('span', { class: 'risk-dist__bar', 'aria-hidden': 'true' }, h('span', { class: 'risk-dist__fill', style: { '--w': `${share}%` } })));
        })),
        h('p', { class: 'small muted', text: `Calculado el ${formatDate(r.calculado, 'long')} con las reglas ${r.version_reglas}. Se recalcula cada noche y al pulsar «Recalcular ahora».` }),
        linkButton({ text: 'Ver el riesgo por persona', href: href('/ia-rrhh', { tab: 'ranking' }), variant: 'tertiary', iconName: 'arrow-right' })),
  });

  const alertsCard = card({
    title: 'Alertas de riesgo de rotación',
    iconName: 'bell',
    body: alertRes.data.length
      ? h('ul', { class: 'alert-list', role: 'list' }, alertRes.data.map((x) => riskAlertItem(x, reload)))
      : emptyState({ title: 'No hay alertas de rotación.', text: 'Te avisaremos cuando alguien pase a nivel alto.', iconName: 'circle-check' }),
  });

  const labels = trends.map((t) => monthLabel(t.mes));
  const trendsCard = card({
    title: 'Tendencias · últimos 6 meses',
    iconName: 'activity',
    body: h('div', { class: 'stack' },
      chartBlock({
        label: 'Altas y bajas voluntarias por mes',
        type: 'bar',
        labels,
        series: [
          { name: 'Altas', data: trends.map((t) => t.altas), color: 1 },
          { name: 'Bajas voluntarias', data: trends.map((t) => t.bajas_voluntarias), color: 3 },
        ],
        yMin: 0, stepY: 1, height: 220,
      }),
      chartBlock({
        label: 'Riesgo medio de la plantilla (0–100) y personas en nivel alto (%)',
        labels,
        series: [
          { name: 'Riesgo medio', data: trends.map((t) => t.riesgo_medio), color: 2 },
          { name: '% en nivel alto', data: trends.map((t) => t.pct_alto), color: 3 },
        ],
        yMin: 0, yMax: 100, stepY: 25, height: 220,
      }),
      trends.some((t) => t.riesgo_medio === null)
        ? h('p', { class: 'small muted', text: 'Los meses sin riesgo medio son anteriores al alta de tu empresa en Pyme Hub.' })
        : null),
  });

  const retro = r.retrospectiva;
  const retroCard = card({
    title: 'Comprobación retrospectiva',
    iconName: 'history',
    body: retro.bajas_voluntarias === 0
      ? emptyState({ title: 'Sin bajas voluntarias desde el alta.', text: 'Cuando alguien se vaya, verás aquí qué nivel de riesgo tenía antes de marcharse.', iconName: 'circle-check' })
      : h('div', { class: 'stack' },
        h('p', {}, `De las ${plural(retro.bajas_voluntarias, 'baja voluntaria', 'bajas voluntarias')} desde el alta en Pyme Hub, su última puntuación antes de irse era:`),
        h('ul', { class: 'retro', role: 'list' },
          ['ALTO', 'MEDIO', 'BAJO'].map((n) => h('li', {}, levelBadge(n), h('strong', { text: formatNumber(retro[n.toLowerCase()]) }))),
          retro.sin_puntuacion ? h('li', {}, badge('Sin puntuación', { iconName: 'minus' }), h('strong', { text: formatNumber(retro.sin_puntuacion) })) : null),
        h('p', { class: 'small muted', text: 'Con pocas bajas es solo orientativa: sirve para revisar si el modelo avisa a tiempo, no para medir su precisión (§9.5).' })),
  });

  return h('div', { class: 'stack' },
    kpis,
    h('div', { class: 'wb-grid' },
      h('div', { class: 'stack' }, alertsCard, trendsCard),
      h('div', { class: 'stack' }, distribution, baselineCard(), retroCard)),
    supervisionNote());
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat('es-ES', { month: 'short', year: '2-digit' }).format(new Date(y, m - 1, 1));
}

/** Alerta de rotación gestionable: la decisión es siempre humana (LEG-005). */
function riskAlertItem(x, reload) {
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
    actions.append(linkButton({ text: 'Ver ficha', href: `#/plantilla/${x.entidad_id}`, variant: 'tertiary', iconName: 'arrow-right' }), done, dismiss);
  }
  const status = open
    ? (x.severidad === 'ALTA' ? badge('Prioridad alta', { tone: 'danger', iconName: 'triangle-alert' }) : badge('Prioridad media', { tone: 'warning', iconName: 'circle-alert' }))
    : badge(x.estado === 'GESTIONADA' ? 'Gestionada' : 'Descartada', { tone: x.estado === 'GESTIONADA' ? 'success' : 'neutral', iconName: x.estado === 'GESTIONADA' ? 'circle-check' : 'x' });
  return h('li', { class: ['alert-item', `alert-item--${x.severidad}`, !open && 'alert-item--done'] },
    h('div', { class: 'alert-item__head' },
      status,
      x.entidad_nombre ? h('a', { href: `#/plantilla/${x.entidad_id}` }, h('strong', { text: x.entidad_nombre })) : null,
      h('span', { class: 'alert-item__date', text: formatDate(x.creado_en) })),
    h('p', { text: x.mensaje }),
    open ? actions : (x.gestion ? h('p', { class: 'alert-item__gestion', text: `${x.estado === 'GESTIONADA' ? 'Gestionada' : 'Descartada'} por ${x.gestion.por ?? '—'} · ${formatDate(x.gestion.en)}` }) : null));
}

/** Impacto frente a la línea base (RF-037): comparación real, sin predicciones. */
function baselineCard() {
  return card({
    title: 'Impacto frente a la línea base',
    iconName: 'target',
    body: dataView({
      loadingLabel: 'Cargando la línea base…',
      load: (signal) => baseline.get(signal),
      isEmpty: (res) => res.data.linea_base === null,
      empty: () => emptyState({
        title: 'Registra la línea base.',
        text: 'Con la plantilla media, las bajas voluntarias y las ausencias de los 12 meses anteriores al alta, verás cómo evoluciona tu empresa.',
        iconName: 'target',
        action: linkButton({ text: 'Registrar en Configuración', href: '#/configuracion', variant: 'secondary', iconName: 'settings' }),
      }),
      render: (res) => baselineComparison(res.data),
    }),
  });
}

/* ---------- Ranking (RF-031, RF-034) ---------- */

function rankingTab(query) {
  const state = {
    level: NIVELES_RIESGO[query.nivel] ? query.nivel : '',
    team_id: query.equipo_id ?? '',
    q: query.q ?? '',
  };
  const results = h('div');
  let view = null;

  const columns = [
    {
      label: 'Persona',
      primary: true,
      render: (x) => personLine(x.empleado, { href: `#/plantilla/${x.empleado.id}`, meta: `${label('puesto', x.empleado.puesto)} · ${x.empleado.equipo_nombre ?? 'Sin equipo'}` }),
    },
    { label: 'Puntuación', render: (x) => scoreMeter(x.puntuacion, x.nivel, { size: 'sm' }) },
    { label: 'Factores principales', render: (x) => factorChips(x.factores) },
    { label: 'Turno y contrato', render: (x) => `${label('turno', x.empleado.turno)} · ${label('tipoContrato', x.empleado.tipo_contrato)}` },
  ];

  function load() {
    updateQuery({ tab: 'ranking', nivel: state.level, equipo_id: state.team_id, q: state.q });
    view = dataView({
      loadingLabel: 'Cargando el riesgo por persona…',
      lines: 8,
      load: (signal) => risk.list({ level: state.level, team_id: state.team_id, q: state.q }, signal),
      isEmpty: (res) => res.data.length === 0,
      empty: () => (state.level || state.team_id || state.q
        ? emptyState({ title: 'Nadie coincide con los filtros.', text: 'Prueba con otro nivel, equipo o nombre.', iconName: 'search' })
        : emptyState({ title: 'Todavía no hay puntuaciones.', text: 'Añade personas a la plantilla para calcular su riesgo.', iconName: 'users' })),
      render: (res) => h('div', { class: 'stack' },
        h('p', { class: 'small muted', text: `${plural(res.meta.total, 'persona', 'personas')} · alto ${res.meta.niveles.alto} · medio ${res.meta.niveles.medio} · bajo ${res.meta.niveles.bajo} · calculado el ${formatDate(res.meta.calculado)} (reglas ${res.meta.version_reglas})` }),
        table({ caption: 'Riesgo de rotación por persona, de mayor a menor', columns, rows: res.data })),
    });
    results.replaceChildren(view);
  }

  const search = textField({ name: 'q', label: 'Buscar', type: 'search', value: state.q, hint: 'Nombre, apellidos o código interno', attrs: { maxlength: 80, autocomplete: 'off' } });
  const nivel = selectField({
    name: 'level', label: 'Nivel', value: state.level, placeholder: 'Todos los niveles',
    options: Object.entries(NIVELES_RIESGO).map(([value, n]) => ({ value, label: `${n.text} (${n.range})` })),
  });
  const equipo = selectField({ name: 'team_id', label: 'Equipo', value: state.team_id, placeholder: 'Todos los equipos', options: [] });
  const equipoSelect = equipo.querySelector('select');
  teams.list().then((list) => {
    list.forEach((t) => equipoSelect.append(h('option', { value: t.id, text: t.nombre, selected: String(t.id) === String(state.team_id) })));
  }).catch(() => { equipoSelect.disabled = true; });

  let debounce = null;
  const toolbar = h('form', { class: 'toolbar', role: 'search', 'aria-label': 'Filtrar el riesgo por persona', onsubmit: (e) => e.preventDefault() }, search, nivel, equipo);
  toolbar.addEventListener('input', (e) => {
    if (e.target.name !== 'q') return;
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = e.target.value.trim(); load(); }, 350);
  });
  toolbar.addEventListener('change', (e) => {
    if (e.target.name === 'level') state.level = e.target.value;
    else if (e.target.name === 'team_id') state.team_id = e.target.value;
    else return;
    load();
  });

  load();
  return h('div', { class: 'stack' },
    card({ title: 'Riesgo de rotación por persona', iconName: 'list-ordered', actions: recalcButton(() => load()), body: [toolbar, results] }),
    supervisionNote());
}

/* ---------- Revisión de sesgos (LEG-015) ---------- */

function biasTab() {
  return h('div', { class: 'stack' },
    card({
      title: 'Revisión de sesgos',
      iconName: 'scale',
      body: dataView({
        loadingLabel: 'Cargando la revisión de sesgos…',
        lines: 6,
        load: (signal) => risk.bias(signal),
        isEmpty: (d) => d.personas === 0,
        empty: () => emptyState({ title: 'Todavía no hay puntuaciones que revisar.', iconName: 'scale' }),
        render: (d) => h('div', { class: 'stack' },
          h('p', {}, `Porcentaje de personas en nivel alto por grupo, frente al total de la empresa (${pct(d.pct_alto_total)}). Se marcan para revisión los grupos de 5 o más personas que se apartan más de ${d.umbral_pp} puntos.`),
          ...d.dimensiones.map((dim) => h('section', { class: 'stack bias-dim', 'aria-label': DIMENSIONES[dim.dimension] },
            h('h3', { class: 'small-heading', text: DIMENSIONES[dim.dimension] }),
            table({
              caption: `Nivel de riesgo por ${DIMENSIONES[dim.dimension].toLowerCase()}`,
              rows: dim.grupos,
              columns: [
                { label: 'Grupo', primary: true, render: (g) => groupName(dim.dimension, g.grupo) },
                { label: 'Personas', render: (g) => formatNumber(g.personas) },
                { label: 'Alto · medio · bajo', render: (g) => `${g.alto} · ${g.medio} · ${g.bajo}` },
                { label: '% en alto', render: (g) => pct(g.pct_alto) },
                { label: 'Diferencia', render: (g) => `${g.diferencia > 0 ? '+' : g.diferencia < 0 ? '−' : ''}${formatNumber(Math.abs(g.diferencia), { maximumFractionDigits: 1 })} pp` },
                { label: 'Revisión', render: (g) => biasBadge(g) },
              ],
            }))),
          h('p', { class: 'small muted', text: 'Un grupo marcado no implica un error: el turno y el tipo de contrato son factores del propio modelo y explican parte de las diferencias. La revisión es humana y su resultado se anota cada trimestre en la hoja técnica del modelo.' })),
      }),
    }),
    supervisionNote());
}

function groupName(dim, g) {
  if (dim === 'puesto') return label('puesto', g);
  if (dim === 'turno') return label('turno', g);
  if (dim === 'tipo_contrato') return label('tipoContrato', g);
  return g;
}

function biasBadge(g) {
  if (g.muestra_pequena) return badge('Muestra pequeña', { iconName: 'info' });
  if (!g.revisar) return badge('Sin diferencia relevante', { tone: 'success', iconName: 'circle-check' });
  return g.esperable
    ? badge('Revisar · factor del modelo', { tone: 'info', iconName: 'circle-alert' })
    : badge('Revisar', { tone: 'warning', iconName: 'triangle-alert' });
}

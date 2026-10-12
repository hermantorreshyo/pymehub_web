import { ApiError, baseline, users } from '../../services/api.js';
import { baselineComparison } from '../../lib/risk.js';
import { h } from '../../lib/dom.js';
import { formatDate, formatDateTime, label } from '../../lib/format.js';
import { session } from '../../lib/store.js';
import { page } from '../../components/layout/Page.js';
import { personLine } from '../../components/ui/Avatar.js';
import { accessBadge, badge } from '../../components/ui/Badge.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { alertBox, clearFieldErrors, showFieldErrors, textField } from '../../components/ui/Field.js';
import { toast } from '../../components/ui/Toast.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { table } from '../../components/ui/Table.js';

function companyCard() {
  const me = session.me;
  return card({
    title: 'Tu empresa',
    iconName: 'building',
    body: h('dl', { class: 'data-list' },
      h('div', {}, h('dt', { text: 'Empresa' }), h('dd', { text: me.interlocutor.nombre })),
      h('div', {}, h('dt', { text: 'Plan contratado' }), h('dd', {}, badge(label('plan', me.plan), { tone: 'info', iconName: 'circle-check' })))),
  });
}

/** Cuentas de gestión (GET /v1/users, solo gerencia). */
function accountsCard() {
  return card({
    title: 'Cuentas de gestión',
    iconName: 'users',
    body: dataView({
      loadingLabel: 'Cargando las cuentas…',
      load: (signal) => users.list(signal),
      isEmpty: (res) => (res?.data ?? []).length === 0,
      empty: () => emptyState({ title: 'No hay cuentas de RR. HH. todavía.', iconName: 'users' }),
      render: (res) => table({
        caption: 'Cuentas de gerencia y RR. HH.',
        rows: res.data,
        columns: [
          { label: 'Persona', primary: true, render: (u) => personLine(u, { meta: u.email }) },
          { label: 'Perfil', render: (u) => label('perfil', u.perfil) },
          { label: 'Acceso', render: (u) => accessBadge(u.estado_acceso) },
          { label: 'Último acceso', render: (u) => (u.ultimo_acceso_en ? formatDateTime(u.ultimo_acceso_en) : 'Nunca') },
        ],
      }),
    }),
  });
}

/**
 * Línea base de impacto (RF-037): plantilla media, bajas voluntarias y ausencias injustificadas
 * de los 12 meses anteriores al alta en Pyme Hub. Gerencia y RR. HH. con el plan Completo.
 */
function baselineCard() {
  if (!session.hasFeature('linea_base')) {
    return card({
      title: 'Línea base de impacto',
      iconName: 'target',
      body: emptyState({
        title: 'Disponible en el plan Completo.',
        text: 'Con la rotación y las ausencias de los 12 meses anteriores al alta, Pyme Hub compara la evolución real de tu empresa.',
        iconName: 'lock',
      }),
    });
  }
  return card({
    title: 'Línea base de impacto',
    iconName: 'target',
    body: dataView({
      loadingLabel: 'Cargando la línea base…',
      load: (signal) => baseline.get(signal),
      render: (res, { reload }) => baselineForm(res, reload),
    }),
  });
}

function baselineForm(res, reload) {
  const lb = res.data.linea_base;
  const sug = res.meta.sugerencia;
  const notice = h('div', { 'aria-live': 'polite' });
  const submit = button({ text: lb ? 'Actualizar la línea base' : 'Guardar la línea base', type: 'submit', iconName: 'check' });
  const num = { inputmode: 'numeric', min: 0, step: 1 };
  const form = h('form', { class: 'form', novalidate: true },
    h('p', { class: 'small muted', text: sug
      ? `Los 12 meses anteriores al alta de tu empresa en Pyme Hub (${formatDate(sug.alta, 'long')}). Usa los datos de nóminas y de partes de ausencia.`
      : 'Los 12 meses anteriores al alta de tu empresa en Pyme Hub.' }),
    h('div', { class: 'form__grid' },
      textField({ name: 'periodo_inicio', label: 'Desde', type: 'date', required: true, value: lb?.periodo_inicio ?? sug?.periodo_inicio ?? '' }),
      textField({ name: 'periodo_fin', label: 'Hasta', type: 'date', required: true, value: lb?.periodo_fin ?? sug?.periodo_fin ?? '' }),
      textField({ name: 'plantilla_media', label: 'Plantilla media', type: 'number', required: true, value: lb?.plantilla_media ?? '', hint: 'Personas de media en ese periodo.', attrs: { inputmode: 'decimal', min: 1, step: 0.1 } }),
      textField({ name: 'bajas_voluntarias', label: 'Bajas voluntarias', type: 'number', required: true, value: lb?.bajas_voluntarias ?? '', hint: 'Solo las que decidió la persona.', attrs: num }),
      textField({ name: 'dias_absentismo', label: 'Días de ausencia injustificada', type: 'number', required: true, value: lb?.dias_absentismo ?? '', hint: 'La misma medida que registra Pyme Hub: sin bajas médicas.', attrs: num }),
      textField({ name: 'fuente', label: 'De dónde salen los datos', value: lb?.fuente ?? '', hint: 'Opcional. Por ejemplo: nóminas de 2025.', attrs: { maxlength: 150 } })),
    h('div', { class: 'form__actions' }, submit));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    notice.replaceChildren();
    const v = (n) => form.elements[n].value.trim();
    const input = {
      periodo_inicio: v('periodo_inicio'),
      periodo_fin: v('periodo_fin'),
      plantilla_media: Number(v('plantilla_media').replace(',', '.')),
      bajas_voluntarias: Number.parseInt(v('bajas_voluntarias'), 10),
      dias_absentismo: Number.parseInt(v('dias_absentismo'), 10),
      fuente: v('fuente') || null,
    };
    const errors = {};
    if (!input.periodo_inicio) errors.periodo_inicio = 'Indica el inicio del periodo.';
    if (!input.periodo_fin) errors.periodo_fin = 'Indica el final del periodo.';
    if (!(input.plantilla_media >= 1)) errors.plantilla_media = 'Escribe la plantilla media (1 o más).';
    if (!(input.bajas_voluntarias >= 0)) errors.bajas_voluntarias = 'Escribe un número (0 si no hubo).';
    if (!(input.dias_absentismo >= 0)) errors.dias_absentismo = 'Escribe un número (0 si no hubo).';
    if (Object.keys(errors).length) {
      showFieldErrors(form, errors);
      return;
    }
    setLoading(submit, true, 'Guardando…');
    try {
      await baseline.save(input);
      toast('Línea base guardada. Ya puedes ver la comparación en IA de RR. HH.');
      reload();
    } catch (error) {
      setLoading(submit, false);
      const rest = error instanceof ApiError ? showFieldErrors(form, error.fieldErrors) : {};
      if (!(error instanceof ApiError) || !Object.keys(error.fieldErrors).length || Object.keys(rest).length) {
        notice.append(alertBox({ tone: 'danger', text: error.message, items: Object.values(rest) }));
      }
    }
  });

  return h('div', { class: 'stack' },
    lb ? baselineComparison(res.data) : null,
    notice,
    form);
}

export default function configuracionView() {
  const gerente = session.perfil === 'GERENTE';
  return page({
    title: 'Configuración',
    subtitle: gerente
      ? 'Tu empresa, las cuentas de RR. HH. y la línea base de impacto.'
      : 'Los datos de tu empresa en Pyme Hub y la línea base de impacto.',
    children: [
      h('div', { class: 'two-columns' }, companyCard(), gerente ? accountsCard() : null),
      baselineCard(),
    ],
  });
}

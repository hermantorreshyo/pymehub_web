import { admin, ApiError } from '../../services/api.js';
import { h, uniqueId } from '../../lib/dom.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { href } from '../../lib/router.js';
import { categoryBadge, minutes } from '../../lib/training.js';
import { page, tabs } from '../../components/layout/Page.js';
import { kpiCard } from '../../components/dashboard/KPICard.js';
import { badge } from '../../components/ui/Badge.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { alertBox, clearFieldErrors, showFieldErrors, textField } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { dataView, emptyState, loadingState, errorState } from '../../components/ui/StateView.js';
import { table } from '../../components/ui/Table.js';
import { toast } from '../../components/ui/Toast.js';
import { listingBadge, money } from '../formador/comun.js';

/**
 * Pyme Hub Skills para la plataforma (fase 9d): revisión de cursos, formadores y ventas con
 * comisiones y liquidaciones (Stripe Connect en modo prueba).
 */
export default function adminSkillsView({ query = {} }) {
  const tab = ['revision', 'formadores', 'ventas'].includes(query.tab) ? query.tab : 'revision';
  const nav = tabs('Secciones de Skills', [
    { id: 'revision', label: 'Revisión de cursos', href: href('/skills', { tab: 'revision' }), iconName: 'list-checks' },
    { id: 'formadores', label: 'Formadores', href: href('/skills', { tab: 'formadores' }), iconName: 'graduation-cap' },
    { id: 'ventas', label: 'Ventas y liquidaciones', href: href('/skills', { tab: 'ventas' }), iconName: 'receipt' },
  ], tab);
  const body = { revision: revisionView, formadores: trainersView, ventas: salesView }[tab]();
  return page({ title: 'Pyme Hub Skills', subtitle: 'Marketplace de cursos de formadores externos (Stripe en modo prueba).', tabs: nav, children: [body] });
}

/* ---------- Revisión ---------- */

function revisionView() {
  const view = dataView({
    loadingLabel: 'Cargando los cursos…',
    lines: 5,
    load: (signal) => admin.skillsCourses(null, signal),
    render: (res) => card({
      title: `Cursos · ${formatNumber(res.meta?.pendientes ?? 0)} pendientes de revisión`,
      iconName: 'list-checks',
      body: (res.data ?? []).length === 0
        ? emptyState({ title: 'No hay cursos enviados.', text: 'Cuando un formador envíe un curso a revisión, aparecerá aquí.', iconName: 'inbox' })
        : table({
          caption: 'Cursos de Skills',
          rows: res.data,
          columns: [
            { label: 'Curso', primary: true, render: (c) => h('span', { class: 'person__text' }, h('span', { class: 'person__name', text: c.titulo }), h('span', { class: 'person__meta', text: c.formador.nombre })) },
            { label: 'Categoría', render: (c) => categoryBadge(c.categoria) },
            { label: 'Duración', render: (c) => minutes(c.duracion_min) },
            { label: 'Precios', render: (c) => `${money(c.precio_empresa)} + IVA · ${money(c.precio_persona)} IVA incl.` },
            { label: 'Estado', render: (c) => listingBadge(c.estado) },
            { label: 'Enviado', render: (c) => formatDate(c.enviado_en) },
            { label: 'Acciones', render: (c) => button({ text: c.estado === 'PENDIENTE' ? 'Revisar' : 'Ver', variant: c.estado === 'PENDIENTE' ? 'primary' : 'tertiary', iconName: 'eye', onClick: () => reviewDialog(c.id, () => view.reload()) }) },
          ],
        }),
    }),
  });
  return view;
}

function reviewDialog(id, onDone) {
  const titleId = uniqueId('rev');
  const body = h('div', { class: 'stack dialog__body' }, loadingState({ label: 'Cargando el contenido…', lines: 4 }));
  const dialog = h('dialog', { class: 'dialog dialog--wide', 'aria-labelledby': titleId },
    h('header', { class: 'dialog__header' },
      h('h2', { id: titleId, text: 'Revisar curso' }),
      h('button', { type: 'button', class: 'btn btn--icon', 'aria-label': 'Cerrar', onclick: () => dialog.close() }, icon('x'))),
    body);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();

  admin.skillsCourse(id).then((c) => {
    const notice = h('div', { 'aria-live': 'polite' });
    const motivo = textField({ name: 'motivo', label: 'Motivo (obligatorio para rechazar o retirar)', attrs: { maxlength: 300 } });
    const act = (decision, text, variant, iconName) => {
      const b = button({ text, variant, iconName });
      b.addEventListener('click', async () => {
        notice.replaceChildren();
        setLoading(b, true, 'Guardando…');
        try {
          await admin.reviewCourse(id, { decision, motivo: motivo.querySelector('input').value.trim() || null });
          toast(decision === 'APROBAR' ? 'Curso aprobado: ya está a la venta.' : 'Decisión enviada al formador.');
          dialog.close();
          onDone();
        } catch (error) {
          setLoading(b, false);
          notice.append(alertBox({ tone: 'danger', text: error instanceof ApiError && error.fieldErrors.motivo ? error.fieldErrors.motivo : error.message }));
        }
      });
      return b;
    };
    body.replaceChildren(...[
      h('div', { class: 'training-item__tags' }, categoryBadge(c.categoria), listingBadge(c.estado), badge(minutes(c.duracion_min), { iconName: 'clock' })),
      h('h3', { text: c.titulo }),
      h('p', { class: 'small muted', text: `${c.formador.nombre} · ${money(c.precio_empresa)} + IVA (empresa) · ${money(c.precio_persona)} IVA incluido (particular)` }),
      h('p', { text: c.resumen }),
      h('ul', { class: 'skill-goals' }, (c.contenido?.objetivos ?? []).map((o) => h('li', {}, icon('check', { size: 'sm' }), h('span', { text: o })))),
      h('ol', { class: 'review-blocks' }, (c.contenido?.bloques ?? []).map((b) => h('li', {},
        h('strong', { text: b.titulo ?? { texto: 'Texto', lista: 'Lista', consejo: 'Consejo', imagen: 'Ilustración' }[b.tipo] ?? b.tipo }),
        b.texto ? h('p', { class: 'small', text: b.texto }) : null,
        b.items ? h('ul', { class: 'small' }, b.items.map((i) => h('li', { text: i }))) : null))),
      h('h3', { class: 'skill-subhead', text: 'Cuestionario' }),
      h('ol', { class: 'review-blocks' }, (c.preguntas ?? []).map((q) => h('li', {},
        h('span', { text: q.enunciado }),
        h('ul', { class: 'small' }, q.opciones.map((o, i) => h('li', {}, i === q.correcta ? h('strong', { class: 'inline-note' }, icon('check', { size: 'sm' }), h('span', { text: `${o} (correcta)` })) : o)))))),
      c.estado === 'RECHAZADO' && c.motivo ? alertBox({ tone: 'warning', title: 'Último motivo', text: c.motivo }) : null,
      motivo, notice,
      h('div', { class: 'dialog__actions' },
        c.estado === 'APROBADO' ? act('RETIRAR', 'Retirar de la venta', 'tertiary', 'x') : act('RECHAZAR', 'Pedir cambios', 'tertiary', 'circle-alert'),
        c.estado === 'APROBADO' ? null : act('APROBAR', 'Aprobar y poner a la venta', 'primary', 'check')),
    ].filter(Boolean));
  }).catch((error) => body.replaceChildren(errorState({ error })));
}

/* ---------- Formadores ---------- */

function trainersView() {
  const view = dataView({
    loadingLabel: 'Cargando los formadores…',
    lines: 4,
    load: (signal) => admin.trainers(signal),
    render: (res) => card({
      title: 'Formadores',
      iconName: 'graduation-cap',
      actions: button({ text: 'Nuevo formador', iconName: 'plus', onClick: () => trainerDialog(() => view.reload()) }),
      body: (res.data ?? []).length === 0
        ? emptyState({ title: 'Todavía no hay formadores.', iconName: 'graduation-cap' })
        : table({
          caption: 'Formadores de Skills',
          rows: res.data,
          columns: [
            { label: 'Formador', primary: true, render: (f) => h('span', { class: 'person__text' }, h('span', { class: 'person__name', text: f.nombre_comercial || f.nombre }), h('span', { class: 'person__meta', text: `${f.nombre} · ${f.nif}` })) },
            { label: 'Cobro (Stripe Connect)', render: (f) => (f.stripe.lista ? badge('Activo', { tone: 'success', iconName: 'circle-check' }) : f.stripe.cuenta ? badge('Alta a medias', { tone: 'warning', iconName: 'clock' }) : badge('Sin cuenta', { iconName: 'info' })) },
            { label: 'Cursos', render: (f) => `${formatNumber(f.cursos)} a la venta${f.pendientes ? ` · ${f.pendientes} en revisión` : ''}` },
            { label: 'Ventas', render: (f) => formatNumber(f.ventas) },
            { label: 'Liquidado al formador', render: (f) => money(f.liquidado) },
            { label: 'Comisión', render: (f) => money(f.comision) },
          ],
        }),
    }),
  });
  return view;
}

function trainerDialog(onDone) {
  const titleId = uniqueId('form');
  const notice = h('div', { 'aria-live': 'polite' });
  const submit = button({ text: 'Dar de alta e invitar', type: 'submit', iconName: 'send' });
  const form = h('form', { class: 'stack', novalidate: true },
    h('div', { class: 'form__grid' },
      textField({ name: 'nombre', label: 'Razón social', required: true, attrs: { maxlength: 150 } }),
      textField({ name: 'nombre_comercial', label: 'Nombre comercial', attrs: { maxlength: 150 } }),
      textField({ name: 'nif', label: 'NIF', required: true, attrs: { maxlength: 10, autocapitalize: 'characters' } }),
      textField({ name: 'formador.nombre', label: 'Nombre de la persona formadora', required: true }),
      textField({ name: 'formador.apellidos', label: 'Apellidos' }),
      textField({ name: 'formador.email', label: 'Email (recibe la invitación)', type: 'email', required: true })),
    notice,
    h('div', { class: 'dialog__actions' }, button({ text: 'Cancelar', variant: 'tertiary', onClick: () => dialog.close() }), submit));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    notice.replaceChildren();
    const v = (n) => form.elements[n].value.trim();
    setLoading(submit, true, 'Creando…');
    try {
      const r = await admin.createTrainer({
        nombre: v('nombre'), nombre_comercial: v('nombre_comercial') || null, nif: v('nif'),
        formador: { nombre: v('formador.nombre'), apellidos: v('formador.apellidos') || null, email: v('formador.email') },
      });
      form.replaceChildren(
        alertBox({ tone: 'success', title: 'Formador creado', text: 'Envía este enlace de invitación a la persona formadora (caduca en 72 horas):' }),
        h('p', {}, h('code', { class: 'break', text: r.invitacion.enlace })),
        h('div', { class: 'dialog__actions' }, button({ text: 'Hecho', onClick: () => dialog.close() })));
      onDone();
    } catch (error) {
      setLoading(submit, false);
      const rest = error instanceof ApiError ? showFieldErrors(form, error.fieldErrors) : {};
      if (!(error instanceof ApiError) || !Object.keys(error.fieldErrors).length || Object.keys(rest).length) notice.append(alertBox({ tone: 'danger', text: error.message }));
    }
  });
  const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': titleId },
    h('header', { class: 'dialog__header' },
      h('h2', { id: titleId, text: 'Nuevo formador' }),
      h('button', { type: 'button', class: 'btn btn--icon', 'aria-label': 'Cerrar', onclick: () => dialog.close() }, icon('x'))),
    form);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

/* ---------- Ventas ---------- */

function salesView() {
  return dataView({
    loadingLabel: 'Cargando las ventas…',
    lines: 5,
    load: (signal) => admin.skillsSales(signal),
    render: (res) => {
      const t = res.meta?.totales ?? {};
      return h('div', { class: 'stack' },
        res.meta?.stripe?.habilitado ? null : alertBox({ tone: 'info', text: 'Stripe no está activo: las ventas que ves son las ficticias de la demostración.' }),
        h('ul', { class: 'kpi-grid', role: 'list', 'aria-label': 'Resumen del marketplace' },
          kpiCard({ title: 'Ventas', value: formatNumber(t.ventas ?? 0), iconName: 'receipt' }),
          kpiCard({ title: 'Facturado (IVA incl.)', value: money(t.total ?? 0), iconName: 'credit-card', tone: 'info' }),
          kpiCard({ title: 'Comisión de Pyme Hub', value: money(t.comision ?? 0), iconName: 'store' }),
          kpiCard({ title: 'Liquidado a formadores', value: money(t.importe_formador ?? 0), note: 'Transferencias automáticas de Stripe Connect', iconName: 'credit-card', tone: 'muted' })),
        card({
          title: 'Ventas',
          iconName: 'receipt',
          body: (res.data ?? []).length === 0
            ? emptyState({ title: 'Todavía no hay ventas.', iconName: 'receipt' })
            : table({
              caption: 'Ventas de Pyme Hub Skills',
              rows: res.data,
              columns: [
                { label: 'Fecha', primary: true, render: (v) => formatDate(v.pagado_en ?? v.creado_en) },
                { label: 'Curso', render: (v) => v.titulo },
                { label: 'Formador', render: (v) => v.formador },
                { label: 'Cliente', render: (v) => (v.tipo === 'EMPRESA' ? `${v.cliente} (licencia)` : 'Particular') },
                { label: 'Base', render: (v) => money(v.base) },
                { label: 'IVA', render: (v) => money(v.iva) },
                { label: 'Comisión', render: (v) => money(v.comision) },
                { label: 'Al formador', render: (v) => money(v.importe_formador) },
                { label: 'Estado', render: (v) => badge(v.estado === 'PAGADA' ? `Pagada${v.ficticia ? ' · demo' : ''}` : v.estado, { tone: v.estado === 'PAGADA' ? 'success' : 'neutral', iconName: v.estado === 'PAGADA' ? 'circle-check' : 'info' }) },
              ],
            }),
        }));
    },
  });
}

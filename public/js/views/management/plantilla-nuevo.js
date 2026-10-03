import { employees, teams, ApiError } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { fullName, LABELS, todayIso } from '../../lib/format.js';
import { navigate } from '../../lib/router.js';
import { page } from '../../components/layout/Page.js';
import { button, linkButton, setLoading } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { alertBox, clearFieldErrors, selectField, showFieldErrors, textField } from '../../components/ui/Field.js';
import { toast } from '../../components/ui/Toast.js';

const options = (group) => Object.entries(LABELS[group]).map(([value, label]) => ({ value, label }));

/** Recoge el formulario con los nombres de la API; los opcionales vacíos van como null. */
function readForm(form) {
  const v = (name) => form.elements[name].value.trim();
  const opt = (name) => v(name) || null;
  return {
    nombre: v('nombre'),
    apellidos: opt('apellidos'),
    email: opt('email'),
    codigo_interno: opt('codigo_interno'),
    puesto: v('puesto'),
    tipo_contrato: v('tipo_contrato'),
    turno: v('turno'),
    fecha_alta: v('fecha_alta'),
    equipo_id: v('equipo_id') ? Number(v('equipo_id')) : null,
  };
}

function validate(input) {
  const errors = {};
  if (input.nombre.length < 2) errors.nombre = 'Escribe el nombre (al menos 2 letras).';
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = 'Revisa el formato del email.';
  if (!input.puesto) errors.puesto = 'Elige el puesto.';
  if (!input.tipo_contrato) errors.tipo_contrato = 'Elige el tipo de contrato.';
  if (!input.turno) errors.turno = 'Elige el turno.';
  if (!input.fecha_alta) errors.fecha_alta = 'Indica la fecha de alta.';
  return errors;
}

/** Alta de empleado en SIN_ACCESO (RF-021). La invitación se envía después desde la ficha. */
export default function nuevoEmpleadoView() {
  const notice = h('div', { 'aria-live': 'polite' });
  const equipo = selectField({ name: 'equipo_id', label: 'Equipo', placeholder: 'Sin equipo', options: [] });
  const equipoSelect = equipo.querySelector('select');
  teams.list()
    .then((list) => list.forEach((t) => equipoSelect.append(h('option', { value: t.id, text: t.nombre }))))
    .catch(() => {
      equipoSelect.disabled = true;
      equipo.append(h('p', { class: 'field__hint', text: 'No se han podido cargar los equipos; podrás asignarlo más tarde.' }));
    });

  const submit = button({ text: 'Guardar empleado', type: 'submit', iconName: 'user-plus' });
  const form = h('form', { class: 'form', novalidate: true },
    h('div', { class: 'form__grid' },
      textField({ name: 'nombre', label: 'Nombre', required: true, attrs: { maxlength: 80, autocomplete: 'off' } }),
      textField({ name: 'apellidos', label: 'Apellidos', attrs: { maxlength: 120, autocomplete: 'off' } }),
      textField({ name: 'email', label: 'Email', type: 'email', hint: 'Opcional hasta que le invites a Pyme Hub.', attrs: { autocomplete: 'off', inputmode: 'email' } }),
      textField({ name: 'codigo_interno', label: 'Código interno', hint: 'El que uséis en la empresa (por ejemplo, EMP-001).', attrs: { maxlength: 30, autocomplete: 'off' } }),
      selectField({ name: 'puesto', label: 'Puesto', required: true, placeholder: 'Elige un puesto', options: options('puesto') }),
      selectField({ name: 'tipo_contrato', label: 'Tipo de contrato', required: true, placeholder: 'Elige el contrato', options: options('tipoContrato') }),
      selectField({ name: 'turno', label: 'Turno', required: true, placeholder: 'Elige el turno', options: options('turno') }),
      textField({ name: 'fecha_alta', label: 'Fecha de alta', type: 'date', value: todayIso(), required: true }),
      equipo),
    h('div', { class: 'form__actions' },
      submit,
      linkButton({ text: 'Cancelar', href: '#/plantilla', variant: 'tertiary' })));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    notice.replaceChildren();
    const input = readForm(form);
    const errors = validate(input);
    if (Object.keys(errors).length) {
      showFieldErrors(form, errors);
      return;
    }
    setLoading(submit, true, 'Guardando…');
    try {
      const created = await employees.create(input);
      toast(`${fullName(created)} ya forma parte de la plantilla.`);
      navigate(`/plantilla/${created.id}`, {}, { replace: true });
    } catch (error) {
      setLoading(submit, false);
      const rest = error instanceof ApiError ? showFieldErrors(form, error.fieldErrors) : {};
      const hasFieldErrors = error instanceof ApiError && Object.keys(error.fieldErrors).length > Object.keys(rest).length;
      if (!hasFieldErrors || Object.keys(rest).length) {
        notice.append(alertBox({ tone: 'danger', text: error.message, items: Object.values(rest) }));
        notice.scrollIntoView({ block: 'nearest' });
      }
    }
  });

  return page({
    title: 'Añadir empleado',
    subtitle: 'La persona se da de alta sin acceso a Pyme Hub; la invitación es un paso aparte.',
    back: { href: '#/plantilla', label: 'Volver a la plantilla' },
    children: [card({ body: [notice, form] })],
  });
}

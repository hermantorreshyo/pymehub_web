import { auth, ApiError } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { href } from '../../lib/router.js';
import { button, linkButton, setLoading } from '../../components/ui/Button.js';
import { alertBox, checkboxField, clearFieldErrors, passwordField, showFieldErrors } from '../../components/ui/Field.js';
import { authLayout } from './auth-layout.js';

const MIN_PASSWORD = 10;

/** Resumen del aviso de privacidad que se acepta al activar la cuenta (LEG-001). */
function privacySummary() {
  return h('details', { class: 'small' },
    h('summary', { text: 'Lee el aviso de privacidad' }),
    h('ul', {},
      h('li', { text: 'Pyme Hub trata tus datos por encargo de tu empresa para cuidar el bienestar y la formación del equipo.' }),
      h('li', { text: 'Tus respuestas al check-in solo se muestran agregadas, con un mínimo de 5 personas; tus notas solo las ves tú.' }),
      h('li', { text: 'Ningún dato personal se envía a proveedores de inteligencia artificial.' }),
      h('li', { text: 'Puedes pedir a tu empresa la exportación o la supresión de tus datos en cualquier momento.' })));
}

/** Activación de la cuenta desde el enlace de invitación (RF-005). */
export default function invitationView({ params }) {
  const notice = h('div', { 'aria-live': 'polite' });
  const submit = button({ text: 'Activar mi cuenta', type: 'submit', block: true });
  const form = h('form', { class: 'form', novalidate: true },
    passwordField({
      name: 'password',
      label: 'Crea tu contraseña',
      autocomplete: 'new-password',
      hint: `Mínimo ${MIN_PASSWORD} caracteres. Una frase que recuerdes es una buena opción.`,
      attrs: { minlength: MIN_PASSWORD },
    }),
    passwordField({ name: 'password2', label: 'Repite la contraseña', autocomplete: 'new-password' }),
    privacySummary(),
    checkboxField({ name: 'acepta_privacidad', label: 'He leído y acepto el aviso de privacidad', required: true }),
    submit);

  const layout = authLayout({
    title: 'Activa tu cuenta',
    intro: 'Crea tu contraseña para empezar a usar Pyme Hub.',
    children: [notice, form],
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    notice.replaceChildren();
    const password = form.elements.password.value;
    const errors = {};
    if (password.length < MIN_PASSWORD) errors.password = `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`;
    if (form.elements.password2.value !== password) errors.password2 = 'Las contraseñas no coinciden.';
    if (!form.elements.acepta_privacidad.checked) errors.acepta_privacidad = 'Necesitamos que aceptes el aviso de privacidad.';
    if (Object.keys(errors).length) {
      showFieldErrors(form, errors);
      return;
    }

    setLoading(submit, true, 'Activando…');
    try {
      const result = await auth.acceptInvitation(params.token, password, true);
      form.replaceWith(h('div', { class: 'form' },
        alertBox({ tone: 'success', title: 'Tu cuenta está lista.', text: 'Ya puedes entrar con tu email y la contraseña que acabas de crear.' }),
        linkButton({ text: 'Entrar en Pyme Hub', href: href('/acceso', { email: result?.email }), variant: 'primary', block: true, iconName: 'arrow-right' })));
      layout.querySelector('h1').focus();
    } catch (error) {
      setLoading(submit, false);
      if (error instanceof ApiError && error.code === 'PH-VAL-001') {
        const rest = showFieldErrors(form, error.fieldErrors);
        if (Object.keys(rest).length) notice.append(alertBox({ tone: 'danger', text: error.message }));
      } else {
        notice.append(alertBox({ tone: 'danger', text: error.message ?? 'No hemos podido activar la cuenta.' }));
      }
    }
  });

  return { title: 'Activa tu cuenta', node: layout };
}

import { auth, ApiError } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { navigate } from '../../lib/router.js';
import { session } from '../../lib/store.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { alertBox, clearFieldErrors, passwordField, showFieldErrors, textField } from '../../components/ui/Field.js';
import { authLayout } from './auth-layout.js';

/** Acceso con email y contraseña (RF-001). */
export default function loginView({ query }) {
  const notice = h('div', { 'aria-live': 'polite' });
  if (query.motivo === 'caducada') {
    notice.append(alertBox({ tone: 'warning', text: 'Tu sesión ha caducado por inactividad. Vuelve a entrar para continuar.' }));
  }

  const submit = button({ text: 'Entrar', type: 'submit', block: true, iconName: 'arrow-right' });
  const form = h('form', { class: 'form', novalidate: true },
    textField({ name: 'email', label: 'Email', type: 'email', value: query.email ?? '', required: true, attrs: { autocomplete: 'username', inputmode: 'email' } }),
    passwordField({ name: 'password', label: 'Contraseña', autocomplete: 'current-password' }),
    submit);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    notice.replaceChildren();
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const missing = {};
    if (!email) missing.email = 'Escribe tu email.';
    if (!password) missing.password = 'Escribe tu contraseña.';
    if (Object.keys(missing).length) {
      showFieldErrors(form, missing);
      return;
    }

    setLoading(submit, true, 'Entrando…');
    try {
      const me = await auth.login(email, password);
      session.set(me);
      const volver = query.volver && query.volver.startsWith('/') ? query.volver : '/inicio';
      navigate(volver, {}, { replace: true });
    } catch (error) {
      setLoading(submit, false);
      if (error instanceof ApiError && error.code === 'PH-VAL-001') {
        const rest = showFieldErrors(form, error.fieldErrors);
        if (Object.keys(rest).length) notice.append(alertBox({ tone: 'danger', text: error.message }));
      } else {
        notice.append(alertBox({ tone: 'danger', text: error.message ?? 'No hemos podido iniciar la sesión.' }));
        form.elements.password.select();
      }
    }
  });

  return {
    title: 'Entrar',
    node: authLayout({
      title: 'Te damos la bienvenida',
      intro: 'Entra para ver cómo evoluciona tu equipo.',
      children: [notice, form],
    }),
  };
}

import { auth } from '../services/api.js';
import { toast } from '../components/ui/Toast.js';
import { navigate } from './router.js';
import { session } from './store.js';

/** Cierra la sesión en la API (RF-008) y vuelve a la pantalla de acceso. */
export async function logout() {
  try {
    await auth.logout();
  } catch {
    // Aunque falle la red, la sesión local se cierra; la del servidor caduca sola
  }
  session.clear();
  navigate('/acceso', {}, { replace: true });
  toast('Has cerrado la sesión. ¡Hasta pronto!', { tone: 'info' });
}

import { page } from '../../components/layout/Page.js';
import { card } from '../../components/ui/Card.js';
import { soonState } from '../../components/ui/StateView.js';

/**
 * Página de un módulo cuya API aún no existe: estado vacío propio, sin datos de ejemplo
 * (los mockups no se reproducen con cifras inventadas, §13.6).
 */
export function comingSoonPage({ title, subtitle, iconName, heading, text }) {
  return page({
    title,
    subtitle,
    children: [card({ body: soonState({ title: heading, text, iconName }) })],
  });
}

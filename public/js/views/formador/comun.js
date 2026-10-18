import { formatNumber } from '../../lib/format.js';
import { badge } from '../../components/ui/Badge.js';

/** Utilidades del panel del formador (Pyme Hub Skills, fase 9d). */
export const money = (v) => formatNumber(v, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ESTADOS = {
  SIN_PRECIO: { text: 'Sin precio', tone: 'neutral', icon: 'tag' },
  BORRADOR: { text: 'Sin enviar', tone: 'neutral', icon: 'file-text' },
  PENDIENTE: { text: 'En revisión', tone: 'warning', icon: 'clock' },
  APROBADO: { text: 'A la venta', tone: 'success', icon: 'circle-check' },
  RECHAZADO: { text: 'Necesita cambios', tone: 'danger', icon: 'circle-alert' },
  RETIRADO: { text: 'Retirado', tone: 'neutral', icon: 'x' },
};

/** Estado comercial del curso, con texto e icono. */
export function listingBadge(estado) {
  const e = ESTADOS[estado] ?? { text: estado ?? '—', tone: 'neutral', icon: 'info' };
  return badge(e.text, { tone: e.tone, iconName: e.icon });
}

import { comingSoonPage } from '../shared/proximamente.js';

/** Check-in diario (§11). Pendiente de los endpoints de la fase 4 y de la cola sin conexión (RF-062). */
export default function checkinView() {
  return comingSoonPage({
    title: 'Check-in',
    subtitle: '¿Cómo estás hoy? Tu respuesta ayuda a cuidar al equipo sin señalar a nadie.',
    iconName: 'smile',
    heading: 'El check-in llega en la próxima versión.',
    text: 'Podrás responder aunque no tengas cobertura: se enviará solo al recuperar la señal.',
  });
}

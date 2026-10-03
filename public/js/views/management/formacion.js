import { comingSoonPage } from '../shared/proximamente.js';

/** Upskilling para la gestión (§10). Pendiente de los endpoints de la fase 5. */
export default function formacionView() {
  return comingSoonPage({
    title: 'Formación',
    subtitle: 'Impulsa el crecimiento de tu equipo con micro-formación pensada para el día a día.',
    iconName: 'graduation-cap',
    heading: 'Estamos preparando el catálogo de formación.',
    text: 'Podrás asignar módulos, seguir el avance de cada persona y ver qué formación pide tu equipo.',
  });
}

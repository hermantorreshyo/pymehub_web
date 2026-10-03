import { comingSoonPage } from '../shared/proximamente.js';

/** Formación y Asesor de formación del empleado (§10 y §12). Pendiente de las fases 5 y 6. */
export default function employeeTrainingView() {
  return comingSoonPage({
    title: 'Formación',
    subtitle: 'Aprende a tu ritmo con módulos cortos pensados para tu día a día.',
    iconName: 'graduation-cap',
    heading: 'Tu formación llega en la próxima versión.',
    text: 'Verás tus módulos asignados, el catálogo y un asesor que te recomienda por dónde seguir según tus intereses.',
  });
}

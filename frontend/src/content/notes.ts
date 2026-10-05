export type NoteTopic = 'Entrenamiento' | 'Alimentación' | 'Hábitos';
export interface ReadingNote {
  slug: string;
  title: string;
  topic: NoteTopic;
  summary: string;
  tags: string[];
  sections: { title: string; text: string }[];
  takeaway: string;
  sources: { title: string; pages?: string; url?: string }[];
}

const training = (pages: string) => ({ title: 'Joel Twinem · TNF Muscle Building Manual', pages });
const nutrition = (pages: string) => ({ title: 'TNF · Fat Loss & Building Phases', pages });
const acsm = { title: 'ACSM · Orientaciones de entrenamiento de fuerza (2026)', url: 'https://acsm.org/effective-resistance-training-program-infographic/' };
const niddk = { title: 'NIDDK · Alimentación, actividad física y hábitos saludables', url: 'https://www.niddk.nih.gov/health-information/weight-management/healthy-eating-physical-activity-for-life/health-tips-for-adults' };

// Public editorial reading notes. Never put private measurements or diary entries here.
export const readingNotes: ReadingNote[] = [
  {
    slug: 'progresar-sin-cambiar-la-tecnica', title: 'Progresar sin cambiar las reglas', topic: 'Entrenamiento',
    summary: 'Más peso o más repeticiones sirven para comparar si el movimiento sigue siendo el mismo.',
    tags: ['sobrecarga progresiva', 'técnica', 'repeticiones'],
    sections: [
      { title: 'La idea', text: 'La progresión se entiende mejor cuando mantienes una técnica comparable. Mover más carga con menos recorrido o con más impulso cambia la tarea; no demuestra por sí solo que hayas mejorado en el ejercicio original.' },
      { title: 'Un ejemplo sencillo', text: 'Hacer 9 repeticiones donde antes hacías 8, con la misma carga y el mismo recorrido, ofrece una comparación útil. Repetir la marca con menor esfuerzo también puede indicar una mejora, aunque el número no cambie.' },
      { title: 'Qué mirar en tu registro', text: 'Compara carga, repeticiones y RIR junto con la técnica. Una sesión aislada no resume todo un proceso: mira varias exposiciones al mismo ejercicio antes de interpretar la tendencia.' },
    ],
    takeaway: 'Antes de subir el peso, define qué repetición vas a considerar válida.', sources: [training('3')],
  },
  {
    slug: 'rir-en-palabras-simples', title: 'RIR: cuánto quedaba en la serie', topic: 'Entrenamiento',
    summary: 'Una forma sencilla de describir el esfuerzo sin depender solo de los kilos.',
    tags: ['RIR', 'fallo', 'intensidad'],
    sections: [
      { title: 'Qué significa', text: 'RIR son las repeticiones que estimas que podrías completar antes de no poder terminar otra con la técnica prevista. Si crees que quedaban dos, anotas 2 RIR. Es una estimación, no una medición exacta.' },
      { title: 'Por qué ayuda', text: 'Dos series con el mismo peso y repeticiones pueden requerir esfuerzos distintos. Registrar el margen que quedaba aporta contexto para comparar sesiones y entender la fatiga.' },
      { title: 'Un matiz importante', text: 'El manual usa una convención propia alrededor de 0 y 1 RIR. Para tu registro, elige una definición y úsala de forma consistente. La orientación general de ACSM no exige llegar al fallo en todas las series para obtener resultados.' },
    ],
    takeaway: 'Describe el margen que quedaba con honestidad; no es una puntuación que tengas que ganar.', sources: [training('4, 6'), acsm],
  },
  {
    slug: 'volumen-y-recuperacion', title: 'Volumen: contar series con contexto', topic: 'Entrenamiento',
    summary: 'El número de series dice más cuando sabes qué esfuerzo y qué músculo representan.',
    tags: ['volumen', 'series', 'recuperación'],
    sections: [
      { title: 'Qué cuenta el manual', text: 'TNF distingue las series de trabajo de las de calentamiento y usa el número de series como medida práctica del volumen. Esto es diferente del total de kilos movidos, que combina carga y repeticiones.' },
      { title: 'Por qué no basta una cifra', text: 'Importan el esfuerzo, la distribución semanal y si un músculo participa directamente o como apoyo. No todas las series aportan exactamente el mismo estímulo ni cuestan la misma recuperación.' },
      { title: 'Cómo leer tu propia semana', text: 'Anota las series de trabajo, observa el rendimiento de las sesiones siguientes y evita sumar trabajo únicamente para alcanzar una cifra. Los rangos concretos del autor pertenecen a su enfoque; no son una dosis universal.' },
    ],
    takeaway: 'Una serie adicional tiene sentido si aporta algo y puedes recuperarte de ella.', sources: [training('6, 18–19')],
  },
  {
    slug: 'ejercicios-que-puedes-repetir', title: 'Elegir ejercicios que puedas repetir bien', topic: 'Entrenamiento',
    summary: 'Comodidad, control y un movimiento comparable ayudan a interpretar el progreso.',
    tags: ['estabilidad', 'máquinas', 'recorrido', 'ROM'],
    sections: [
      { title: 'La estabilidad como herramienta', text: 'El manual destaca la estabilidad al elegir ejercicios para hipertrofia. Un apoyo puede facilitar que el equilibrio no sea lo que limite la serie. Eso no convierte automáticamente un ejercicio en la mejor opción para todas las personas.' },
      { title: 'Recorrido y control', text: 'Define un recorrido que puedas repetir con control y que se adapte al movimiento. Acortarlo para mover más peso dificulta comparar registros. No hace falta copiar a otra persona si su equipo o sus proporciones son diferentes.' },
      { title: 'La elección práctica', text: 'Valora el objetivo del ejercicio, el equipo disponible y cómo lo ejecutas. Máquinas y pesos libres pueden ser útiles; la elección debe permitir entrenar de forma consistente.' },
    ],
    takeaway: 'Busca un ejercicio que puedas ejecutar y registrar de forma repetible.', sources: [training('4, 7–8'), acsm],
  },
  {
    slug: 'menos-ejercicios-repetidos', title: 'Que cada ejercicio tenga una función', topic: 'Entrenamiento',
    summary: 'Variar el equipo no siempre cambia lo que estás entrenando.',
    tags: ['redundancia', 'selección de ejercicios', 'rutina'],
    sections: [
      { title: 'Qué es la redundancia', text: 'Dos ejercicios pueden parecer diferentes y exigir un patrón muy parecido. TNF propone revisar qué aporta cada uno, en lugar de asumir que una rutina es mejor solo porque contiene más variantes.' },
      { title: 'Parecidos no significa inútiles', text: 'Trabajar el mismo músculo de varias maneras puede tener sentido si cambia el papel del ejercicio, el recorrido o la forma de cargarlo. La pregunta es qué añade esa variante al conjunto.' },
      { title: 'Cambios con intención', text: 'Mantener algunas referencias durante un tiempo facilita ver el progreso. Cambiar un ejercicio porque no encaja es distinto de cambiar todo cada semana sin una razón clara.' },
    ],
    takeaway: 'Pregúntate: ¿qué aporta este ejercicio que no estaba cubierto?', sources: [training('5, 62')],
  },
  {
    slug: 'distribuir-la-semana', title: 'Organizar la semana y el orden de los ejercicios', topic: 'Entrenamiento',
    summary: 'La frecuencia y el orden ayudan a distribuir el trabajo, el tiempo y la fatiga.',
    tags: ['frecuencia', 'agenda', 'fatiga', 'prioridades'],
    sections: [
      { title: 'Frecuencia y volumen van juntos', text: 'La frecuencia describe cuántas veces entrenas un músculo; el volumen, cuánto trabajo haces. Cambiar los días sin mirar las series y su esfuerzo deja fuera parte de la decisión.' },
      { title: 'Qué hacer primero', text: 'La fatiga puede afectar al rendimiento conforme avanza la sesión. El manual relaciona el orden con las prioridades: si una tarea es importante, conviene pensar dónde encaja en lugar de dejarla siempre para el final.' },
      { title: 'Que el plan quepa en tu vida', text: 'La discusión sobre frecuencia tiene matices y no produce una única división semanal para todos. Una agenda que puedes cumplir, con trabajo distribuido y recuperación suficiente, es más útil que una planificación ideal que abandonas.' },
    ],
    takeaway: 'Diseña la semana alrededor de tu disponibilidad real y revisa cómo rindes.', sources: [training('10–12, 16–18'), acsm],
  },
  {
    slug: 'empezar-con-una-base', title: 'Al empezar, construir una base', topic: 'Hábitos',
    summary: 'Aprender, repetir y registrar antes de perseguir todos los detalles.',
    tags: ['principiantes', 'constancia', 'técnica'],
    sections: [
      { title: 'Menos decisiones al principio', text: 'En el manual, la etapa inicial prioriza desarrollar una base antes de especializar cada parte del físico. No necesitas decidir desde el primer día cuáles serán tus puntos débiles a largo plazo.' },
      { title: 'Una práctica que puedes sostener', text: 'Aprender los movimientos, repetirlos y llevar un registro sencillo facilita reconocer mejoras. Los detalles de una rutina avanzada pueden esperar si todavía estás aprendiendo a entrenar con regularidad.' },
      { title: 'Tu primera referencia', text: 'El registro puede ser tan simple como ejercicio, carga, repeticiones y esfuerzo. Revisa qué pudiste hacer con una técnica comparable, sin usar el rendimiento de otra persona como requisito de entrada.' },
    ],
    takeaway: 'Una rutina comprensible y constante es un buen punto de partida.', sources: [training('13, 20–22'), acsm],
  },
  {
    slug: 'peso-diario-y-tendencia', title: 'El peso de hoy no cuenta toda la historia', topic: 'Alimentación',
    summary: 'Condiciones parecidas y varios registros ayudan a distinguir tendencia de ruido.',
    tags: ['peso', 'promedio', 'agua', 'seguimiento'],
    sections: [
      { title: 'Hacer comparables los registros', text: 'El manual propone pesarse en condiciones parecidas y guardar la fecha. La idea es reducir diferencias de horario, ropa y comidas, en lugar de tratar cada lectura como una medida exacta de grasa corporal.' },
      { title: 'Mirar más de un día', text: 'El peso puede cambiar por agua y contenido digestivo. TNF destaca que una bajada inicial no equivale necesariamente a la misma cantidad de grasa perdida. Compara tendencias antes de concluir que un plan funciona o dejó de funcionar.' },
      { title: 'Cómo ayuda la bitácora', text: 'Un promedio de varios días resume mejor el conjunto que elegir el valor más alto o el más bajo. Usa el peso junto con el contexto del registro y el rendimiento; el promedio tampoco identifica por sí solo cuánto músculo o grasa cambió.' },
    ],
    takeaway: 'No hagas una gran corrección a partir de una sola lectura de la báscula.', sources: [nutrition('19–22')],
  },
  {
    slug: 'calorias-y-macros', title: 'Calorías y macros, sin complicarlo', topic: 'Alimentación',
    summary: 'La energía total y la composición de la comida responden preguntas diferentes.',
    tags: ['calorías', 'proteína', 'carbohidratos', 'grasas'],
    sections: [
      { title: 'Una distinción útil', text: 'Las calorías describen energía. Los macronutrientes describen componentes de los alimentos: proteína, carbohidratos y grasa. Dos menús con energía similar pueden diferir en nutrientes y en lo fácil que resulta sostenerlos.' },
      { title: 'Un registro aproximado', text: 'Como referencia de lectura, proteína y carbohidratos aportan aproximadamente 4 kcal por gramo, y la grasa 9. Las etiquetas y los registros no son mediciones perfectas; usa estos números para entenderlos, no para exigir precisión absoluta.' },
      { title: 'Objetivos personales', text: 'El manual propone sus propios métodos para fijar macros. Aquí no se convierten sus tablas en una receta universal: las necesidades dependen de la persona y del contexto. El total energético no reemplaza la variedad y la calidad de la alimentación.' },
    ],
    takeaway: 'Usa calorías y macros como información, no como la única medida de una buena alimentación.', sources: [nutrition('6, 23–27'), niddk],
  },
  {
    slug: 'alimentacion-que-encaje', title: 'Un plan que encaje con tu día', topic: 'Hábitos',
    summary: 'Presupuesto, horarios y preferencias también forman parte del plan.',
    tags: ['adherencia', 'comidas', 'flexibilidad', 'presupuesto'],
    sections: [
      { title: 'Partir de lo que tienes', text: 'La guía pide considerar el tiempo para cocinar, el presupuesto, los gustos y la vida social. Un plan que depende de condiciones que nunca tienes puede ser difícil de sostener, aunque sobre el papel parezca perfecto.' },
      { title: 'Simplificar decisiones', text: 'Tener algunas comidas habituales y opciones para días ocupados puede facilitar la constancia. Puedes incluir alimentos variados y adaptar la estructura a tus preferencias; no necesitas reproducir los menús del manual.' },
      { title: 'Flexibilidad con continuidad', text: 'Una comida diferente no elimina todo el proceso. Vuelve a las prácticas que puedes mantener, observa qué te resultó difícil y ajusta la organización en vez de convertir cada imprevisto en un fracaso.' },
    ],
    takeaway: 'Planea también el día ocupado, no solo el día ideal.', sources: [nutrition('8, 10, 23, 28, 34'), niddk],
  },
  {
    slug: 'mantener-despues-de-la-dieta', title: 'El mantenimiento también es una fase', topic: 'Alimentación',
    summary: 'Llegar a una meta no elimina la necesidad de hábitos que puedas sostener.',
    tags: ['mantenimiento', 'hambre', 'definición', 'hábitos'],
    sections: [
      { title: 'Después de alcanzar una meta', text: 'La segunda parte de la guía trata lo que ocurre al terminar una fase de pérdida de grasa. Su idea central es planificar la continuidad: alimentación, actividad y seguimiento siguen teniendo un papel.' },
      { title: 'Observar la transición', text: 'El hambre y el peso pueden cambiar durante esa transición. Mira cómo evolucionan junto con la rutina y el bienestar, sin interpretar cada aumento puntual como que has perdido todo el progreso.' },
      { title: 'Lo que esta nota no calcula', text: 'No hay aquí una cifra de calorías ni una velocidad de ajuste válida para todos. Es una nota sobre hábitos y seguimiento, no una pauta de recuperación tras una preparación de competición ni un tratamiento nutricional.' },
    ],
    takeaway: 'Define qué hábitos continuarás cuando termine la fase, antes de darla por cerrada.', sources: [nutrition('42–45'), niddk],
  },
  {
    slug: 'construir-musculo-y-medir-progreso', title: 'Construir músculo no es solo subir de peso', topic: 'Entrenamiento',
    summary: 'El objetivo de una fase de construcción se interpreta también desde el entrenamiento.',
    tags: ['volumen', 'construcción', 'rendimiento', 'recuperación'],
    sections: [
      { title: 'Qué se quiere conseguir', text: 'TNF diferencia una fase de construcción muscular de la idea de aumentar el peso por aumentarlo. La alimentación se plantea como apoyo al entrenamiento y a la recuperación, con el desarrollo muscular como objetivo.' },
      { title: 'Varias señales, no una sola', text: 'El peso aporta contexto, pero no indica por sí mismo cuánto músculo has ganado. Los registros de entrenamiento permiten observar si mejoras en movimientos comparables y cómo se sostiene el rendimiento.' },
      { title: 'Expectativas y tiempo', text: 'El ritmo de progreso no es constante ni igual entre personas. Antes de atribuir todo a comer más o menos, revisa la constancia, el entrenamiento y la recuperación. Esta nota no promete una cantidad de músculo ni prescribe un superávit.' },
    ],
    takeaway: 'Usa la báscula junto con el registro del gimnasio, no como un marcador único de crecimiento.', sources: [nutrition('45–48'), training('3')],
  },
];

export const noteTopics: NoteTopic[] = ['Entrenamiento', 'Alimentación', 'Hábitos'];
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const readingMinutes = (note: ReadingNote) => Math.max(1, Math.ceil(note.sections.map(s => s.text).join(' ').split(/\s+/).length / 180));

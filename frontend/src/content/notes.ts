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
    slug: 'progresar-sin-cambiar-la-tecnica', title: 'Sobrecarga progresiva', topic: 'Entrenamiento',
    summary: "Cómo comparar peso, repeticiones y técnica entre sesiones.",
    tags: ['sobrecarga progresiva', 'técnica', 'repeticiones'],
    sections: [
      {
            "title": "Definición",
            "text": "Sobrecarga progresiva: aumentar la exigencia del entrenamiento a lo largo del tiempo. Puedes registrar cambios en carga o repeticiones."
      },
      {
            "title": "Ejemplo",
            "text": "Sesión anterior: 60 kg × 8 repeticiones a 2 RIR. Sesión actual: 60 kg × 9 a 2 RIR, con el mismo recorrido. Has hecho una repetición más en condiciones comparables."
      },
      {
            "title": "Registro",
            "text": "Anota peso, repeticiones y RIR. Si cambias el recorrido, el equipo o la técnica, deja una observación antes de comparar las marcas."
      }
],
    takeaway: "Compara el mismo ejercicio con el mismo recorrido y un esfuerzo similar.", sources: [training('3')],
  },
  {
    slug: 'rir-en-palabras-simples', title: 'Repeticiones en reserva (RIR)', topic: 'Entrenamiento',
    summary: "Qué significan 0, 1 y 2 RIR al registrar una serie.",
    tags: ['RIR', 'fallo', 'intensidad'],
    sections: [
      {
            "title": "Definición",
            "text": "RIR significa repeticiones en reserva. Es tu estimación de cuántas repeticiones adicionales podrías completar con la técnica prevista."
      },
      {
            "title": "Escala",
            "text": "0 RIR: no podrías completar otra repetición. 1 RIR: estimas que podrías hacer una más. 2 RIR: estimas que podrías hacer dos más."
      },
      {
            "title": "Ejemplo",
            "text": "Terminas 10 repeticiones y calculas que podrías haber llegado a 12: registra 10 reps y 2 RIR. No registres 12 reps; las dos restantes no se hicieron."
      }
],
    takeaway: "El RIR describe el margen al terminar la serie.", sources: [training('4, 6'), acsm],
  },
  {
    slug: 'volumen-y-recuperacion', title: 'Volumen de entrenamiento', topic: 'Entrenamiento',
    summary: "Series de trabajo por músculo, por día y por semana.",
    tags: ['volumen', 'series', 'recuperación'],
    sections: [
      {
            "title": "Qué se cuenta",
            "text": "En esta plataforma, el volumen se expresa en series de trabajo. Las aproximaciones de calentamiento se registran aparte y no se suman a ese total."
      },
      {
            "title": "Ejemplo",
            "text": "El martes haces 3 series de press y 3 de aperturas para pecho: 6 series ese día. Si repites ese trabajo el sábado, son 12 series semanales con frecuencia 2."
      },
      {
            "title": "Cómo cuenta la app",
            "text": "El resumen agrupa las series por el músculo principal asignado a cada ejercicio. Suma las regiones del pecho y no añade automáticamente series por la participación secundaria de otros músculos."
      }
],
    takeaway: "Distingue las series de una sesión del total semanal.", sources: [training('6, 18–19')],
  },
  {
    slug: 'ejercicios-que-puedes-repetir', title: 'Selección de ejercicios', topic: 'Entrenamiento',
    summary: "Músculo principal, equipo, estabilidad y recorrido.",
    tags: ['estabilidad', 'máquinas', 'recorrido', 'ROM'],
    sections: [
      {
            "title": "Músculo y movimiento",
            "text": "Identifica el músculo principal y el movimiento del ejercicio. La biblioteca permite filtrar por músculo y patrón."
      },
      {
            "title": "Ejecución",
            "text": "Elige una posición y un recorrido que puedas repetir. Anota ajustes del asiento, agarre o altura de la polea si cambian entre sesiones."
      },
      {
            "title": "Sustituciones",
            "text": "Si el equipo está ocupado, busca una alternativa para el mismo músculo. Ajusta la carga: 40 kg en una máquina no equivalen necesariamente a 40 kg en otra."
      }
],
    takeaway: "Registra la carga del ejercicio que realmente hiciste.", sources: [training('4, 7–8'), acsm],
  },
  {
    slug: 'menos-ejercicios-repetidos', title: 'Redundancia de ejercicios', topic: 'Entrenamiento',
    summary: "Cómo revisar dos ejercicios que trabajan el mismo músculo.",
    tags: ['redundancia', 'selección de ejercicios', 'rutina'],
    sections: [
      {
            "title": "Qué comparar",
            "text": "Compara movimiento, posición de las articulaciones, recorrido y forma de aplicar la carga. Compartir músculo principal no basta para llamar redundantes a dos ejercicios."
      },
      {
            "title": "Ejemplo",
            "text": "Una extensión de tríceps por encima de la cabeza y un press JM tienen posiciones y ejecuciones diferentes. La etiqueta «tríceps» no demuestra que sean intercambiables."
      },
      {
            "title": "En la plataforma",
            "text": "La revisión automática señala un mismo ejercicio añadido dos veces. Revisa si es intencional antes de quitarlo; la alerta no demuestra que una variante sea inútil."
      }
],
    takeaway: "Mismo músculo no significa mismo ejercicio.", sources: [training('5, 62')],
  },
  {
    slug: 'distribuir-la-semana', title: 'Frecuencia y orden de ejercicios', topic: 'Entrenamiento',
    summary: "Frecuencia semanal y posición de los ejercicios prioritarios.",
    tags: ['frecuencia', 'agenda', 'fatiga', 'prioridades'],
    sections: [
      {
            "title": "Frecuencia",
            "text": "Es el número de días por semana en que entrenas un músculo. Pecho el martes y el sábado equivale a frecuencia 2. Dos ejercicios de pecho el martes siguen contando como un día."
      },
      {
            "title": "Orden",
            "text": "Si quieres priorizar un músculo, coloca sus ejercicios al principio de la sesión. El optimizador ordena primero la prioridad alta, después la media y finalmente el resto."
      },
      {
            "title": "Tiempo",
            "text": "Con la estimación de la app —1 minuto de ejecución y 3 de descanso por serie—, 20 series ocupan 80 minutos. El calentamiento y los cambios de equipo requieren tiempo adicional."
      }
],
    takeaway: "Cuenta días distintos para la frecuencia y minutos para la duración.", sources: [training('10–12, 16–18'), acsm],
  },
  {
    slug: 'empezar-con-una-base', title: 'Entrenamiento para principiantes', topic: 'Hábitos',
    summary: "Qué registrar cuando empiezas a entrenar.",
    tags: ['principiantes', 'constancia', 'técnica'],
    sections: [
      {
            "title": "Preparar la sesión",
            "text": "Elige los días disponibles y una rutina. Antes de empezar, revisa los ejercicios, las series previstas y el equipo que necesitas."
      },
      {
            "title": "Registrar una serie",
            "text": "Guarda el ejercicio, el peso, las repeticiones completadas y el RIR estimado. Mantén la misma unidad de peso al comparar registros."
      },
      {
            "title": "Revisar la siguiente sesión",
            "text": "Consulta la columna «Anterior». Comprueba si repetiste la carga y el recorrido antes de interpretar un cambio en repeticiones."
      }
],
    takeaway: "Registro mínimo: ejercicio, peso, repeticiones y RIR.", sources: [training('13, 20–22'), acsm],
  },
  {
    slug: 'peso-diario-y-tendencia', title: 'Peso corporal y tendencia', topic: 'Alimentación',
    summary: "Cómo registrar el peso y calcular un promedio.",
    tags: ['peso', 'promedio', 'agua', 'seguimiento'],
    sections: [
      {
            "title": "Condiciones de medida",
            "text": "Usa la misma báscula y procura repetir el horario y las condiciones de ropa y comida. Guarda la fecha junto al peso."
      },
      {
            "title": "Promedio",
            "text": "Suma los pesos registrados y divide entre el número de mediciones. Por ejemplo: 75,0 + 75,4 + 74,9 = 225,3 kg; dividido entre 3 da 75,1 kg."
      },
      {
            "title": "Interpretación",
            "text": "El peso incluye agua y contenido digestivo, además de los tejidos corporales. Una diferencia entre dos días no permite calcular cuánta grasa o músculo cambió."
      }
],
    takeaway: "Compara promedios de periodos equivalentes, no solo dos pesajes.", sources: [nutrition('19–22')],
  },
  {
    slug: 'calorias-y-macros', title: 'Calorías y macronutrientes', topic: 'Alimentación',
    summary: "Kilocalorías y gramos de proteína, carbohidratos y grasa.",
    tags: ['calorías', 'proteína', 'carbohidratos', 'grasas'],
    sections: [
      {
            "title": "Unidades",
            "text": "Las kilocalorías (kcal) expresan energía. Los macronutrientes se registran en gramos: proteína, carbohidratos y grasa."
      },
      {
            "title": "Cálculo aproximado",
            "text": "Proteína: 4 kcal/g. Carbohidratos: 4 kcal/g. Grasa: 9 kcal/g. Una comida con 30 g de proteína, 50 g de carbohidratos y 10 g de grasa suma aproximadamente 410 kcal."
      },
      {
            "title": "Registro",
            "text": "Comprueba si la etiqueta informa por 100 g o por porción. Una porción de 150 g de un alimento con 200 kcal por 100 g aporta 300 kcal. Las etiquetas pueden incluir redondeos."
      }
],
    takeaway: "Ajusta los valores de la etiqueta a la cantidad que comiste.", sources: [nutrition('6, 23–27'), niddk],
  },
  {
    slug: 'alimentacion-que-encaje', title: 'Planificación de comidas', topic: 'Hábitos',
    summary: "Lista de compras, porciones y alternativas para días ocupados.",
    tags: ['adherencia', 'comidas', 'flexibilidad', 'presupuesto'],
    sections: [
      {
            "title": "Organizar",
            "text": "Anota cuántas comidas prepararás, qué ingredientes necesitas y qué cantidades comprarás."
      },
      {
            "title": "Ejemplo de preparación",
            "text": "Si cocinas cuatro porciones juntas, registra los ingredientes de la receta completa. Divide entre cuatro solo si las porciones son equivalentes."
      },
      {
            "title": "Alternativas",
            "text": "Deja anotada una comida alternativa para los días en que no puedas cocinar. Registra la opción que consumiste y su cantidad, aunque sea diferente de la prevista."
      }
],
    takeaway: "Calcula la receta completa antes de repartirla en porciones.", sources: [nutrition('8, 10, 23, 28, 34'), niddk],
  },
  {
    slug: 'mantener-despues-de-la-dieta', title: 'Fase de mantenimiento', topic: 'Alimentación',
    summary: "Qué significa mantener el peso y qué datos revisar.",
    tags: ['mantenimiento', 'hambre', 'definición', 'hábitos'],
    sections: [
      {
            "title": "Definición",
            "text": "Una fase de mantenimiento busca mantener aproximadamente estable el peso a lo largo del tiempo. No implica que cada pesaje tenga que ser idéntico."
      },
      {
            "title": "Seguimiento",
            "text": "Revisa el promedio de peso junto con los registros de alimentación, actividad y entrenamiento. Un cambio en cualquiera de ellos puede modificar la tendencia."
      },
      {
            "title": "Registro en la app",
            "text": "Selecciona «Mantenimiento» como fase y guarda su fecha de inicio. Conserva los pesajes para comparar periodos de esa fase."
      }
],
    takeaway: "Estabilidad de la tendencia no significa peso idéntico todos los días.", sources: [nutrition('42–45'), niddk],
  },
  {
    slug: 'construir-musculo-y-medir-progreso', title: 'Hipertrofia y progreso', topic: 'Entrenamiento',
    summary: "Qué puede mostrar el registro y qué no mide la báscula.",
    tags: ['volumen', 'construcción', 'rendimiento', 'recuperación'],
    sections: [
      {
            "title": "Definición",
            "text": "Hipertrofia es el aumento del tamaño muscular. El peso corporal total no permite separar por sí solo músculo, grasa y agua."
      },
      {
            "title": "Rendimiento",
            "text": "Compara carga, repeticiones, técnica y RIR en el mismo ejercicio. Mejorar una marca muestra progreso en esa tarea; no permite convertir la mejora en kilos de músculo."
      },
      {
            "title": "Seguimiento",
            "text": "Revisa los registros de entrenamiento junto con la tendencia del peso. Si usas medidas corporales o fotografías, repite las condiciones de toma."
      }
],
    takeaway: "Una subida de peso no equivale automáticamente a ganancia muscular.", sources: [nutrition('45–48'), training('3')],
  },
];

export const noteTopics: NoteTopic[] = ['Entrenamiento', 'Alimentación', 'Hábitos'];
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const readingMinutes = (note: ReadingNote) => Math.max(1, Math.ceil(note.sections.map(s => s.text).join(' ').split(/\s+/).length / 180));

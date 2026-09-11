# Daily Fitness Platform

Plataforma web personal de coaching de fitness: organiza rutinas de gym reales
(migradas de un Excel/Google Sheet), las estructura por grupo muscular y
patrón de movimiento, y hace seguimiento de progreso (peso, medidas,
macros, volumen de entrenamiento) con datos reales cargados por el usuario.

Nace del pitch en [`IDEA.txt`](./IDEA.txt): "Proyecto 2 - Coach de Fitness
(Cloud / Full-stack)", pensado como pieza defendible en entrevistas técnicas
por tener un modelo de datos no trivial y una API propia, no solo un CRUD
plano.

## Arquitectura

Monorepo con dos apps independientes que se comunican por HTTP/JSON:

```
daily-fitness-platform/
├── backend/     FastAPI + SQLAlchemy + SQLite (Postgres-ready)
└── frontend/    React 19 + TypeScript + Vite, SPA con auth por JWT
```

- El **backend** expone una API REST bajo `/api/*`, protegida con JWT excepto
  registro/login. No hay SSR: es una API pura consumida por el SPA.
- El **frontend** es un SPA client-side (React Router) que guarda el token en
  `localStorage` y lo adjunta en cada request (`frontend/src/api.ts`).
- Toda la lógica de dominio "interesante" (fórmulas de body-fat, FFMI,
  macros, sugerencias de fase, guías de volumen) vive en el frontend como
  funciones puras en `src/utils/`, separada de los componentes de UI — así
  se puede testear y razonar sobre ella sin tocar React.

### Modelo de datos

El núcleo del proyecto es esta cadena de relaciones (`backend/app/models.py`):

```
MuscleGroup → Muscle → Exercise → WorkoutExercise → Workout → Routine → User
                                        │
                                        └── WorkoutSession → SetLog (peso, reps, RIR reales)
```

- **`Routine`**: un programa (ej. "Push/Pull/Legs"), con `is_active` para
  marcar cuál sigue el usuario.
- **`Workout`**: un día tipo dentro de la rutina (ej. "Upper", "Push").
- **`WorkoutExercise`**: el "slot" de un ejercicio dentro de un día —
  series/reps/RIR objetivo, no lo que realmente se hizo.
- **`WorkoutSession`** + **`SetLog`**: la ejecución real en una fecha
  concreta, serie por serie (peso, reps, RIR real). Esto es lo que alimenta
  el progreso — nunca se mezcla con el plan.
- **`BodyStat`**: tracking diario (peso, cintura/cuello/cadera, calorías,
  macros, pasos, sueño, cardio) con constraint único `(user_id, date)` —
  un registro por usuario por día, sin datos de relleno.

Esta separación plan-vs-ejecución es la decisión de diseño central: permite
comparar lo prescrito contra lo realmente entrenado.

## Stack y por qué

| Capa | Tecnología | Notas |
|---|---|---|
| Backend framework | **FastAPI** | tipado con Pydantic, docs automáticas en `/docs` |
| ORM | **SQLAlchemy** | modelos declarativos, migraciones caseras (ver abajo) |
| DB local | **SQLite** (`fitness.db`) | mismo código sirve para Postgres/Supabase en prod — solo cambia `DATABASE_URL` |
| Auth | **JWT** (`python-jose`) + **bcrypt** | `OAuth2PasswordBearer`, tokens de 7 días |
| Frontend framework | **React 19** + **TypeScript** | Vite como bundler/dev server |
| Routing | **React Router 7** | rutas protegidas con wrapper `RequireAuth` |
| Estado de servidor | Hook propio (`useApi`), sin librería externa (no React Query/SWR) |
| Estilos | CSS plano (`index.css`) con `data-theme` para dark/light/system |
| Lint | **oxlint** (en vez de ESLint) |
| i18n | Contexto propio (`LanguageContext`) con diccionario de traducciones |

Decisión notable: **sin migraciones tipo Alembic**. `database.py` tiene un
`run_migrations()` casero que en cada arranque compara las columnas del
modelo contra las de la tabla existente en SQLite y agrega las que falten
con `ALTER TABLE`. Suficiente para desarrollo en solitario; se cambiaría por
Alembic si el proyecto pasara a Postgres en equipo.

## Features implementadas

- **Auth**: registro/login con JWT, perfil de usuario (altura, sexo, fecha
  de nacimiento, fase actual: cut/maintain/bulk).
- **Rutinas**: CRUD de rutinas y días, con picker de ejercicios por músculo
  y plantillas predefinidas (`routineTemplates.ts`).
- **Sesión de entrenamiento**: registrar series reales (peso/reps/RIR) contra
  el plan del día.
- **Daily log**: peso corporal, medidas, macros, pasos, sueño, cardio,
  cheat meals.
- **Dashboard**: cálculo de:
  - **% de grasa corporal** — fórmula Navy (circunferencias) y fórmula de
    Deurenberg (BMI + edad) como fallback.
  - **FFMI** (Fat-Free Mass Index) con bandas de clasificación para
    lifters naturales (basadas en el estudio de Kouri et al.), ajustadas
    para mujeres.
  - **Tendencia de peso** (`phaseSuggestion.ts`): analiza la pendiente de
    peso semanal y sugiere ajuste de calorías según la fase (cut/bulk).
  - **Volumen semanal por músculo** (`volumeGuideline.ts`): compara series
    semanales reales contra objetivos por músculo, con soporte para
    "pisos" (mínimos) vs techos.
  - **Mapa de fuerza** (Strength Map): vista corporal anterior/posterior
    con estado de volumen por músculo.
- **Macro calculator**: rangos de calorías/macros por peso corporal y sexo
  (tablas adaptadas de una guía de pérdida de grasa, convertidas de
  lb/in a kg/cm).
- **Historial y progreso por ejercicio**: series pasadas, gráfico de
  tendencia por área muscular.
- **Glosario**: términos de entrenamiento explicados, reutilizable como
  página standalone (`/glossary`) o embebida en la app.
- **Preferencias**: tema (claro/oscuro/sistema) e idioma, persistidos en
  `localStorage`.

## Cómo correrlo en local

**Backend** (`backend/`):

```bash
pip install -r requirements.txt
python -m app.seed        # carga la librería de ejercicios (idempotente)
uvicorn app.main:app --reload
```

Health check: `http://127.0.0.1:8000/api/health` · Docs: `/docs`

**Frontend** (`frontend/`):

```bash
npm install
npm run dev
```

Corre en Vite (puerto 5173 por defecto). `VITE_API_BASE` en `.env` apunta
al backend local; el CORS del backend ya permite `localhost:5173-5175`.

## Qué aprendí / de qué me sirvió este proyecto

- **Separar plan de ejecución en el modelo de datos.** `WorkoutExercise`
  (prescripción) vs `SetLog` (lo real) es el patrón que hace posible
  comparar progreso contra plan sin ensuciar ninguno de los dos.
- **FastAPI + SQLAlchemy + JWT de punta a punta**: dependency injection con
  `Depends(get_current_user)`, `OAuth2PasswordBearer`, hashing con bcrypt.
- **Migraciones "a mano" con introspección de SQLAlchemy** (`inspect(engine)`)
  como alternativa liviana a Alembic para un proyecto en solitario —
  entendiendo el trade-off (no sirve para producción en equipo).
- **Llevar fórmulas de dominio reales a código**: body-fat (Navy,
  Deurenberg), FFMI, bandas de clasificación, macros por peso — traducir
  tablas/fórmulas de una fuente externa a funciones puras testeables.
- **React 19 + Router 7 sin librerías de data-fetching**: manejar loading/
  error/cache a mano con un hook propio en vez de reachar por React Query,
  para entender qué resuelve esa clase de librería.
- **Diseñar para portar de SQLite a Postgres desde el día uno** (mismo
  `DATABASE_URL`, mismo ORM) sin sobre-ingenierizar el MVP.
- **i18n y theming con Context API puro**, sin librerías, para un SPA chico.

## Fuera de alcance (v1)

Documentado en `IDEA.txt`:

- Reconocimiento de imágenes / estimación visual de composición corporal.
- Taxonomía avanzada de biomecánica ("joint actions").
- Conteo de repeticiones por visión por computadora, reusando el modelo de
  pose de un proyecto hermano (`motion-runner-edge-ai`) — planeado como
  feature diferenciadora futura, no parte del MVP.

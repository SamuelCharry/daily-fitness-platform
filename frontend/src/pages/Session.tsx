import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useApi } from "../hooks/useApi";
import type {
  Routine,
  WorkoutSession,
  WorkoutExerciseEntry,
  LastSetsByExercise,
} from "../types";
import WeightTools from "../components/WeightTools";
import SessionExercisePicker from "../components/SessionExercisePicker";
import QuickSubstitution from "../components/QuickSubstitution";
import {
  displayWeight,
  storedWeight,
  type WeightUnit,
} from "../utils/weightTools";
type Draft = { weight: string; reps: string; rir: string };
function Clock({ start, rest }: { start: string | null; rest: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = (time: number) => {
    const n = Math.max(0, Math.floor((now - time) / 1000));
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  };
  return (
    <div className="training-clock">
      <span>
        Sesión{" "}
        <strong>
          {start
            ? elapsed(
                Date.parse(
                  /[Zz]|[+-]\d\d:\d\d$/.test(start) ? start : `${start}Z`,
                ),
              )
            : "0:00"}
        </strong>
      </span>
      <span>
        Descanso <strong>{rest ? elapsed(rest) : "0:00"}</strong>
      </span>
    </div>
  );
}
export default function Session() {
  const { workoutId } = useParams();
  return <Player key={workoutId} />;
}
function Player() {
  const { workoutId } = useParams(),
    navigate = useNavigate();
  const { data, error, loading, reload } = useApi(async () => {
    const [routines, last, session] = await Promise.all([
      api.get<Routine[]>("/api/routines"),
      api.get<LastSetsByExercise>(`/api/sessions/last-sets/${workoutId}`),
      api.post<WorkoutSession>("/api/sessions", {
        workout_id: Number(workoutId),
      }),
    ]);
    return {
      workout: routines
        .flatMap((r) => r.workouts)
        .find((w) => w.id === Number(workoutId)),
      last,
      session,
    };
  }, [workoutId]);
  const [session, setSession] = useState<WorkoutSession | null>(null),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false),
    [substituting, setSubstituting] = useState(false),
    [finishing, setFinishing] = useState(false),
    [skip, setSkip] = useState(false);
  const [mood, setMood] = useState(2),
    [energy, setEnergy] = useState(2),
    [ate, setAte] = useState(true);
  const [unit, setUnit] = useState<WeightUnit>(() =>
    localStorage.getItem("cfts-weight-unit") === "lb" ? "lb" : "kg",
  );
  const [rest, setRest] = useState<number | null>(null),
    [drafts, setDrafts] = useState<Record<string, Draft>>({}),
    [focused, setFocused] = useState(0);
  useEffect(() => {
    if (data) {
      setSession(data.session);
      try {
        setDrafts(
          JSON.parse(
            sessionStorage.getItem(`drafts-${data.session.id}`) || "{}",
          ),
        );
        setRest(
          Number(localStorage.getItem(`rest-${data.session.id}`)) || null,
        );
      } catch {
        /* empty */
      }
    }
  }, [data]);
  const plan = session?.plan || data?.workout?.exercises || [];
  const exercises = plan.map((e) => {
    const choice = session?.substitutions?.[e.id];
    return choice ? { ...e, ...choice, id: e.id, exercise_id: choice.id } : e;
  });
  const ex = exercises[index];
  function draftKey(e: WorkoutExerciseEntry, n: number) {
    return `${e.id}-${e.exercise_id}-${unit}-${n}`;
  }
  function draft(n: number): Draft {
    if (!ex) return { weight: "", reps: "", rir: "" };
    const logged = session?.sets.find(
      (s) => s.workout_exercise_id === ex.id && s.set_number === n,
    );
    return (
      drafts[draftKey(ex, n)] || {
        weight:
          logged?.weight == null
            ? ""
            : String(displayWeight(logged.weight, unit)),
        reps: String(logged?.reps ?? ""),
        rir: String(logged?.rir ?? ex.rir_target ?? ""),
      }
    );
  }
  function toggleUnit() {
    const next = unit === "kg" ? "lb" : "kg";
    const converted = { ...drafts };
    for (const [key, value] of Object.entries(drafts)) {
      const parts = key.split("-");
      if (parts[2] !== unit) continue;
      parts[2] = next;
      converted[parts.join("-")] = {
        ...value,
        weight:
          value.weight === ""
            ? ""
            : String(
                displayWeight(storedWeight(Number(value.weight), unit), next),
              ),
      };
    }
    setDrafts(converted);
    if (session)
      sessionStorage.setItem(`drafts-${session.id}`, JSON.stringify(converted));
    setUnit(next);
    setFocused(0);
    localStorage.setItem("cfts-weight-unit", next);
  }
  function edit(n: number, key: keyof Draft, value: string) {
    if (!session || !ex) return;
    const next = {
      ...drafts,
      [draftKey(ex, n)]: { ...draft(n), [key]: value },
    };
    setDrafts(next);
    sessionStorage.setItem(`drafts-${session.id}`, JSON.stringify(next));
    if (key === "weight") setFocused(Number(value) || 0);
  }
  async function update(
    path: string,
    body?: unknown,
    method: "post" | "put" | "delete" = "post",
  ) {
    if (!session || busy) return false;
    setBusy(true);
    setMessage("");
    try {
      const result =
        method === "delete"
          ? await api.delete<WorkoutSession>(
              `/api/sessions/${session.id}${path}`,
            )
          : await api[method]<WorkoutSession>(
              `/api/sessions/${session.id}${path}`,
              body,
            );
      setSession(result);
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo guardar.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function log(n: number) {
    if (!ex || !session) return;
    const d = draft(n),
      reps = Number(d.reps),
      weight = d.weight === "" ? null : storedWeight(Number(d.weight), unit),
      rir = d.rir === "" ? null : Number(d.rir);
    if (
      !Number.isInteger(reps) ||
      reps < 1 ||
      reps > 1000 ||
      (weight != null &&
        (!Number.isFinite(weight) || weight < 0 || weight > 2000)) ||
      (rir != null && (!Number.isInteger(rir) || rir < 0 || rir > 10))
    ) {
      setMessage("Revisa peso, repeticiones y RIR.");
      return;
    }
    const logged = session.sets.find(
      (s) => s.workout_exercise_id === ex.id && s.set_number === n,
    );
    if (
      await update("/sets", {
        workout_exercise_id: ex.id,
        exercise_id: logged?.exercise_id ?? ex.exercise_id,
        set_number: n,
        weight,
        reps,
        rir,
      })
    ) {
      const now = Date.now();
      setRest(now);
      localStorage.setItem(`rest-${session.id}`, String(now));
    }
  }
  async function finish(save_default: boolean) {
    if (!session || busy) return;
    if (!session.sets.length) {
      setMessage("Registra al menos una serie.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/sessions/${session.id}/finish`, { save_default });
      localStorage.removeItem(`rest-${session.id}`);
      navigate("/app/history", { replace: true });
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p>Cargando entrenamiento…</p>;
  if (error)
    return (
      <p role="alert">
        {error}
        <button onClick={reload}>Reintentar</button>
      </p>
    );
  if (!session || !data?.workout) return <p>Entrenamiento no encontrado.</p>;
  const sets = session.sets.filter((s) => s.workout_exercise_id === ex?.id),
    total = Math.max(ex?.target_sets ?? 0, ...sets.map((s) => s.set_number), 0);
  if (!session.readiness && !skip && !session.sets.length && !sessionStorage.getItem(`survey-skipped-${session.id}`)) return (
        <section className="readiness readiness-screen">
          <Link to="/app/routines">← Entrenamientos</Link><h1>Antes de entrenar</h1>
          {message && <p role="alert" className="error-banner">{message}</p>}
          <div className="readiness-fields">
            <label>
              Ánimo
              <select
                value={mood}
                onChange={(e) => setMood(Number(e.target.value))}
              >
                <option value={1}>Bajo</option>
                <option value={2}>Normal</option>
                <option value={3}>Bueno</option>
              </select>
            </label>
            <label>
              Energía
              <select
                value={energy}
                onChange={(e) => setEnergy(Number(e.target.value))}
              >
                <option value={1}>Baja</option>
                <option value={2}>Media</option>
                <option value={3}>Alta</option>
              </select>
            </label>
            <label>
              ¿Comiste antes?
              <select
                value={String(ate)}
                onChange={(e) => setAte(e.target.value === "true")}
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>
          <button
            disabled={busy}
            onClick={() => update("/readiness", { mood, energy, ate }, "put")}
          >
            Guardar y entrenar
          </button>
          <button disabled={busy} onClick={() => {sessionStorage.setItem(`survey-skipped-${session.id}`, "1");setSkip(true);}}>Omitir y entrenar</button>
        </section>
  );
  if (finishing) return (
        <section className="panel finish-options finish-screen">
          <h1>Finalizar entrenamiento</h1>
          {message && <p className="error-banner" role="alert">{message}</p>}
          <p>{session.sets.length} series registradas.</p>
          <p>
            El predeterminado conservará los ejercicios y el número de series
            realizados hoy. Los ejercicios sin series registradas se quitarán de
            este día.
          </p>
          <button
            disabled={busy}
            className="btn-primary"
            onClick={() => finish(false)}
          >
            Solo este entrenamiento
          </button>
          <button
            disabled={busy}
            className="btn-ghost"
            onClick={() => finish(true)}
          >
            Guardar como predeterminado
          </button>
          <button disabled={busy} onClick={() => setFinishing(false)}>Seguir entrenando</button>
        </section>
  );
  return (
    <div className="training-player">
      <header className="training-header">
        <Link to="/app/routines" aria-label="Volver a entrenamientos">
          ☰
        </Link>
        <Clock start={session.started_at} rest={rest} />
        <button disabled={busy} onClick={() => setFinishing(true)}>
          Finalizar
        </button>
      </header>
      <nav className="training-exercises" aria-label="Ejercicios">
        {exercises.map((e, i) => (
          <button
            key={e.id}
            aria-pressed={i === index}
            onClick={() => {
              setIndex(i);
              setFocused(0);
              setSubstituting(false);
            }}
          >
            <span className="exercise-tile">
              {session.sets.some((s) => s.workout_exercise_id === e.id)
                ? "✓"
                : i + 1}
            </span>
            <small>{e.name}</small>
          </button>
        ))}
        <button onClick={() => setAdding(true)} aria-label="Añadir ejercicio">
          <span className="exercise-tile">+</span>
        </button>
      </nav>
      {message && (
        <p role="alert" className="error-banner">
          {message}
        </p>
      )}
      {adding && (
        <SessionExercisePicker
          onClose={() => setAdding(false)}
          onPick={async (id) => {
            if (await update("/exercises", { exercise_id: id })) {
              setAdding(false);
              setIndex(exercises.length);
            }
          }}
        />
      )}
      {ex ? (
        <>
          <div className="training-title">
            <div>
              <h1>{ex.name}</h1>
              <small>
                {sets.length} de {total} series · {session.workout_name}
              </small>
            </div>
            <button onClick={toggleUnit}>{unit} ⇄</button>
          </div>
          <div className="training-chips">
            <button onClick={() => setSubstituting(!substituting)}>
              Sustituir
            </button>
            <span>
              {ex.rep_range_min ?? 8}–{ex.rep_range_max ?? 12} reps
            </span>
            <span>{ex.rir_target ?? 1} RIR</span>
            <span>{(ex.rest_seconds ?? 180) / 60} min</span>
          </div>
          {substituting && (
            <QuickSubstitution
              original={plan.find((e) => e.id === ex.id)!}
              current={ex}
              used={exercises
                .filter((e) => e.id !== ex.id)
                .map((e) => e.exercise_id)}
              busy={busy}
              onClose={() => setSubstituting(false)}
              onPick={async (id) => {
                if (
                  await update("/substitute", {
                    workout_exercise_id: ex.id,
                    exercise_id: id,
                    expected_exercise_id: ex.exercise_id,
                  })
                )
                  setSubstituting(false);
              }}
            />
          )}
          <table className="training-sets">
            <thead>
              <tr>
                <th>Serie</th>
                <th>Anterior</th>
                <th>{unit}</th>
                <th>Reps</th>
                <th>RIR</th>
                <th>✓</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
                const logged = sets.find((s) => s.set_number === n),
                  d = draft(n),
                  previous = data.last[ex.id]?.find(
                    (s) =>
                      s.set_number === n && s.exercise_id === ex.exercise_id,
                  );
                return (
                  <tr key={n} className={logged ? "is-logged" : ""}>
                    <td>
                      <span className="set-number">{n}</span>
                    </td>
                    <td>
                      <button
                        className="previous-set"
                        disabled={!previous || busy}
                        onClick={() => {
                          if (previous) {
                            edit(
                              n,
                              "weight",
                              previous.weight == null
                                ? ""
                                : String(displayWeight(previous.weight, unit)),
                            );
                            const next = {
                              ...drafts,
                              [draftKey(ex, n)]: {
                                weight:
                                  previous.weight == null
                                    ? ""
                                    : String(
                                        displayWeight(previous.weight, unit),
                                      ),
                                reps: String(previous.reps ?? ""),
                                rir: String(previous.rir ?? ""),
                              },
                            };
                            setDrafts(next);
                            sessionStorage.setItem(
                              `drafts-${session.id}`,
                              JSON.stringify(next),
                            );
                          }
                        }}
                      >
                        {previous
                          ? `${previous.weight == null ? "—" : displayWeight(previous.weight, unit)} × ${previous.reps}`
                          : "—"}
                      </button>
                      {logged?.exercise_id !== ex.exercise_id && logged && (
                        <small>{logged.exercise_name}</small>
                      )}
                    </td>
                    {(["weight", "reps", "rir"] as const).map((key) => (
                      <td key={key}>
                        <input
                          aria-label={`${key === "weight" ? "Peso" : key === "reps" ? "Repeticiones" : "RIR"} serie ${n}`}
                          type="number"
                          min={key === "reps" ? 1 : 0}
                          max={key === "rir" ? 10 : undefined}
                          step={key === "weight" ? "any" : 1}
                          inputMode={key === "weight" ? "decimal" : "numeric"}
                          value={d[key]}
                          disabled={busy}
                          onFocus={() => {
                            if (key === "weight")
                              setFocused(Number(d.weight) || 0);
                          }}
                          onChange={(e) => edit(n, key, e.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        className="set-check"
                        aria-label={`Guardar serie ${n}`}
                        aria-pressed={!!logged}
                        disabled={busy || !d.reps}
                        onClick={() => log(n)}
                      >
                        {logged ? "☑" : "□"}
                      </button>
                    </td>
                    <td>
                      <button disabled={busy} aria-label={`Eliminar serie ${n}`} onClick={async () => {
                        if (await update(`/exercises/${ex.id}/series/${n}`, undefined, 'delete')) {
                          const next: Record<string,Draft> = {};
                          for (const [key,value] of Object.entries(drafts)) {
                            if (!key.startsWith(`${ex.id}-`)) {next[key]=value;continue;}
                            const parts=key.split('-'), number=Number(parts[3]);
                            if(number===n)continue;
                            if(number>n)parts[3]=String(number-1);
                            next[parts.join('-')]=value;
                          }
                          setDrafts(next);sessionStorage.setItem(`drafts-${session.id}`,JSON.stringify(next));
                        }
                      }}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            className="add-series"
            disabled={busy || total >= 100}
            onClick={() =>
              update(
                `/exercises/${ex.id}/series`,
                { target_sets: total + 1 },
                "put",
              )
            }
          >
            + Serie
          </button>
          <WeightTools
            key={`${ex.id}-${unit}`}
            weight={focused || Number(draft(1).weight) || 0}
            unit={unit}
          />
          <Link
            className="exercise-progress-link"
            to={`/app/exercises/${ex.exercise_id}/progress`}
          >
            Historial del ejercicio
          </Link>
        </>
      ) : (
        <button className="btn-primary" onClick={() => setAdding(true)}>
          Añadir ejercicio
        </button>
      )}
    </div>
  );
}

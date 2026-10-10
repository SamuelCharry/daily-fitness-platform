import { useState } from "react";
import { muscleName } from "../data/labels";
import { api } from "../api";
import { useApi } from "../hooks/useApi";
import type { Exercise } from "../types";
export default function SessionExercisePicker({
  onPick,
  onClose,
  createInitially = false,
}: {
  createInitially?: boolean;
  onPick: (id: number) => Promise<void>;
  onClose: () => void;
}) {
  const { data, reload, error } = useApi(() =>
    api.get<Exercise[]>("/api/exercises"),
  );
  const [query, setQuery] = useState(""),
    [create, setCreate] = useState(createInitially),
    [name, setName] = useState(""),
    [muscle, setMuscle] = useState(""),
    [pattern, setPattern] = useState(""),
    [equipment, setEquipment] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function choose(id: number) {
    setBusy(true);
    try {
      await onPick(id);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    try {
      const ex = await api.post<{ id: number }>("/api/exercises", {
        name,
        muscle,
        joint_action: pattern,
        equipment,
      });
      reload();
      await onPick(ex.id);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Añadir ejercicio</h2>
        <button onClick={onClose}>Cerrar</button>
      </div>
      <input
        aria-label="Buscar ejercicio"
        placeholder="Buscar ejercicio"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={() => setCreate(!create)}>Crear ejercicio</button>
      {(message || error) && <p role="alert">{message || error}</p>}
      {create ? (
        <div className="tool-body">
          <label>
            Usar como referencia
            <select
              defaultValue=""
              onChange={(e) => {
                const ex = data?.find((x) => x.id === Number(e.target.value));
                if (ex) {
                  setMuscle(ex.muscle);
                  setPattern(ex.joint_action || "");
                  setEquipment(ex.equipment || "");
                }
              }}
            >
              <option value="">Sin referencia</option>
              {data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Músculo
            <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
              <option value="">Elegir</option>
              {[...new Set(data?.map((e) => e.muscle))].sort().map((m) => (
                <option key={m} value={m}>{muscleName(m)}</option>
              ))}
            </select>
          </label>
          <label>
            Patrón
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
          </label>
          <label>
            Equipo
            <input
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
            />
          </label>
          <button
            disabled={
              busy ||
              !name.trim() ||
              !muscle ||
              !pattern.trim() ||
              !equipment.trim()
            }
            onClick={save}
          >
            Crear y añadir
          </button>
        </div>
      ) : (
        <div className="exercise-picker-list">
          {data
            ?.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
            .map((e) => (
              <button disabled={busy} key={e.id} onClick={() => choose(e.id)}>
                {e.name}
                <small>
                  {muscleName(e.muscle)} · {e.equipment}
                </small>
              </button>
            ))}
        </div>
      )}
    </section>
  );
}

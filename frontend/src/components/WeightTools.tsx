import { useState } from "react";
import { plates, type WeightUnit } from "../utils/weightTools";
export default function WeightTools({
  weight,
  unit,
}: {
  weight: number;
  unit: WeightUnit;
}) {
  const [tab, setTab] = useState<"plates" | "warmup" | null>(null);
  const [bar, setBar] = useState(unit === "kg" ? 20 : 45);
  const [sizes, setSizes] = useState(
    unit === "kg" ? "25,20,15,10,5,2.5,1.25" : "45,35,25,10,5,2.5",
  );
  const result = plates(weight, bar, sizes.split(",").map(Number));
  return (
    <div className="weight-tools">
      <div className="training-chips">
        <button
          aria-expanded={tab === "plates"}
          onClick={() => setTab(tab === "plates" ? null : "plates")}
        >
          Discos
        </button>
        <button
          aria-expanded={tab === "warmup"}
          onClick={() => setTab(tab === "warmup" ? null : "warmup")}
        >
          Calentamiento
        </button>
      </div>
      {tab === "plates" && (
        <div className="tool-body">
          <label>
            Barra ({unit})
            <input
              type="number"
              min="0"
              value={bar}
              onChange={(e) => setBar(Number(e.target.value))}
            />
          </label>
          <label>
            Discos disponibles ({unit}, separados por coma)
            <input value={sizes} onChange={(e) => setSizes(e.target.value)} />
          </label>
          <p>
            Total: {weight} {unit}, incluida la barra
          </p>
          {result ? (
            <>
              <div className="plate-visual">
                {result.result.map((p) => (
                  <span key={p.weight}>
                    {p.count} × {p.weight}
                  </span>
                ))}
              </div>
              <p>
                Por lado ·{" "}
                {result.exact
                  ? "Peso exacto"
                  : `Peso posible: ${result.actual} ${unit}`}
              </p>
              <small>
                Calculado con pares de discos; comprueba cuántos hay
                disponibles.
              </small>
            </>
          ) : (
            <p>El peso total debe ser mayor o igual al peso de la barra.</p>
          )}
        </div>
      )}
      {tab === "warmup" && (
        <div className="tool-body">
          <p>
            1 · {Number((weight * 0.8).toFixed(2))} {unit} × 4 reps
          </p>
          <p>
            2 · {Number((weight * 0.9).toFixed(2))} {unit} × 2 reps
          </p>
          <small>
            Aproximaciones opcionales. Ajusta al peso disponible; no cuentan
            como series de trabajo.
          </small>
        </div>
      )}
    </div>
  );
}

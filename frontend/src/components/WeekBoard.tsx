import { useState, type ReactNode } from 'react';
import { WEEKDAYS, WEEKDAYS_SHORT } from '../data/labels';

export interface BoardItem {
  id: number;
  day: number | null; // 0-6, null = tray
  label: string;
  content: ReactNode;
  tone?: 'done' | 'missed' | 'moved' | 'default';
  locked?: boolean; // already trained: can't be moved
}

export interface BoardDay {
  title?: string; // e.g. "6 oct"
  today?: boolean;
  past?: boolean;
}

// Seven droppable weekday columns plus an optional tray. Drag works with a mouse;
// on touch screens (no HTML5 drag) every card also has a "Mover a" menu.
export default function WeekBoard({ items, days, trayLabel, onMove, emptyText = 'Descanso' }: {
  items: BoardItem[];
  days?: BoardDay[];
  trayLabel?: string;
  onMove: (id: number, day: number | null) => void;
  emptyText?: string;
}) {
  const [over, setOver] = useState<number | 'tray' | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  function drop(day: number | null) {
    setOver(null);
    if (dragging == null) return;
    const item = items.find(i => i.id === dragging);
    setDragging(null);
    if (item && item.day !== day && !item.locked) onMove(item.id, day);
  }

  function zoneProps(day: number | null) {
    const key = day ?? 'tray';
    return {
      onDragOver: (e: React.DragEvent) => { if (dragging != null) { e.preventDefault(); setOver(key); } },
      onDragLeave: () => setOver(o => (o === key ? null : o)),
      onDrop: (e: React.DragEvent) => { e.preventDefault(); drop(day); },
    };
  }

  function card(item: BoardItem) {
    return (
      <div
        key={item.id}
        className={`board-card tone-${item.tone || 'default'}${dragging === item.id ? ' dragging' : ''}`}
        draggable={!item.locked}
        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(item.id)); setDragging(item.id); }}
        onDragEnd={() => { setDragging(null); setOver(null); }}
      >
        {item.content}
        {!item.locked && (
          <select
            className="board-move"
            aria-label={`Mover ${item.label} a otro día`}
            value={item.day ?? ''}
            onChange={e => onMove(item.id, e.target.value === '' ? null : Number(e.target.value))}
          >
            {trayLabel && <option value="">{trayLabel}</option>}
            {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        )}
      </div>
    );
  }

  return (
    <div className="week-board">
      <div className="board-days">
        {WEEKDAYS_SHORT.map((name, day) => {
          const meta = days?.[day];
          const dayItems = items.filter(i => i.day === day);
          return (
            <div key={name} className={`board-day${over === day ? ' over' : ''}${meta?.today ? ' today' : ''}${meta?.past ? ' past' : ''}`} {...zoneProps(day)}>
              <div className="board-day-head"><strong>{name}</strong>{meta?.title && <span>{meta.title}</span>}{meta?.today && <em>Hoy</em>}</div>
              {dayItems.map(card)}
              {!dayItems.length && <span className="board-empty">{emptyText}</span>}
            </div>
          );
        })}
      </div>
      {trayLabel && (
        <div className={`board-tray${over === 'tray' ? ' over' : ''}`} {...zoneProps(null)}>
          <span className="board-tray-label">{trayLabel}</span>
          {items.filter(i => i.day == null).map(card)}
          {!items.some(i => i.day == null) && <span className="board-empty">Arrastra aquí un día para sacarlo de la semana</span>}
        </div>
      )}
    </div>
  );
}

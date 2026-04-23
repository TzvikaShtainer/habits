import { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Habit, DayData } from '../types';
import { binaryCount, binaryPercentage, getStreakInfo, getPctColorClass, getBinaryPaceTooltip } from '../utils/calculations';
import confetti from 'canvas-confetti';

const CELL_BG: Record<number, string> = {
  0: 'bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700',
  1: 'bg-green-500 hover:bg-green-600',
  2: 'bg-red-500 hover:bg-red-600',
  3: 'bg-black hover:bg-gray-800',
};

interface Props {
  habit: Habit;
  dayData: DayData;
  isEven: boolean;
  rowIdx: number;
  totalBinaryRows: number;
  weekId: string;
  isDraggingActive: boolean;
  onCycleCell: (dayIndex: number) => void;
  onSetValue: (dayIndex: number, value: 0 | 1 | 2 | 3) => void;
  onArchive: () => void;
  onRename: (name: string) => void;
  onUpdateGoal: (goal: number | null) => void;
}

export function BinaryRow({
  habit, dayData, isEven, rowIdx, totalBinaryRows,
  weekId, isDraggingActive: _isDraggingActive, onCycleCell, onSetValue, onArchive, onRename, onUpdateGoal,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(habit.name);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalVal, setGoalVal] = useState(String(habit.goal ?? ''));
  const [popDay, setPopDay] = useState<number | null>(null);
  const prevCountRef = useRef(0);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });

  const count = binaryCount(dayData);
  const pct = binaryPercentage(dayData, habit.goal);
  const { streakDays, activeStreak } = getStreakInfo(dayData);

  const countMeetsGoal = habit.goal !== null && count >= habit.goal;
  const weekFull = [0, 1, 2, 3, 4, 5, 6].every((d) => Number(dayData[d] ?? 0) !== 0);
  const summaryBg = countMeetsGoal
    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
    : weekFull
    ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
    : 'text-gray-700 dark:text-slate-300';
  const rowBg = isEven ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-900';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  useEffect(() => {
    if (habit.goal && prevCountRef.current < habit.goal && count >= habit.goal) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
    prevCountRef.current = count;
  }, [count, habit.goal]);

  function triggerPopIfStreakCompletes(day: number, nextVal: number) {
    if (nextVal !== 1) return;
    const simulated: DayData = { ...dayData, [day]: 1 };
    const { activeStreak: newStreak } = getStreakInfo(simulated);
    if (activeStreak < 3 && newStreak >= 3) {
      setPopDay(day);
      setTimeout(() => setPopDay(null), 500);
    }
  }

  function handleCycleCell(day: number) {
    const nextVal = (Number(dayData[day] ?? 0) + 1) % 4;
    triggerPopIfStreakCompletes(day, nextVal);
    onCycleCell(day);
  }

  function handleSetValue(day: number, val: 0 | 1 | 2 | 3) {
    triggerPopIfStreakCompletes(day, val);
    onSetValue(day, val);
  }

  function commitGoal() {
    setEditingGoal(false);
    const num = parseInt(goalVal, 10);
    if (goalVal.trim() === '') {
      onUpdateGoal(null);
    } else if (!isNaN(num) && num > 0) {
      onUpdateGoal(num);
    } else {
      setGoalVal(String(habit.goal ?? ''));
    }
  }

  function commitRename() {
    setEditing(false);
    if (nameVal.trim() && nameVal.trim() !== habit.name) {
      onRename(nameVal.trim());
    } else {
      setNameVal(habit.name);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, day: number) {
    if (e.key === '1') { e.preventDefault(); handleSetValue(day, 1); }
    else if (e.key === '2') { e.preventDefault(); handleSetValue(day, 2); }
    else if (e.key === '3') { e.preventDefault(); handleSetValue(day, 3); }
    else if (e.key === '4') { e.preventDefault(); handleSetValue(day, 0); }
    else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (day > 0) document.getElementById(`bin-${rowIdx}-${day - 1}`)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (day < 6) document.getElementById(`bin-${rowIdx}-${day + 1}`)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIdx > 0) document.getElementById(`bin-${rowIdx - 1}-${day}`)?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIdx < totalBinaryRows - 1) document.getElementById(`bin-${rowIdx + 1}-${day}`)?.focus();
    }
  }

  return (
    <tr ref={setNodeRef} style={style} className={`${rowBg} transition-opacity`}>
      {/* Habit name — sticky start-0 = right in RTL */}
      <td className={`border border-gray-200 dark:border-slate-700 px-3 py-2 sticky start-0 z-10 ${rowBg} min-w-[160px] max-w-[220px]`}>
        <div className="flex items-center gap-2">
          <button
            onClick={onArchive}
            className="text-gray-300 dark:text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 text-base leading-none"
            title="מחק הרגל"
          >
            🗑
          </button>
          {editing ? (
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setEditing(false); setNameVal(habit.name); }
              }}
              className="flex-1 text-sm border-b border-blue-400 bg-transparent outline-none dark:text-slate-200"
            />
          ) : (
            <span
              onClick={() => setEditing(true)}
              {...attributes}
              {...listeners}
              className="flex-1 text-sm text-gray-800 dark:text-slate-200 cursor-grab active:cursor-grabbing hover:text-blue-600 dark:hover:text-blue-400 truncate select-none"
              title={`${habit.name} — לחץ לחיצה ארוכה לגרירה`}
            >
              {habit.name}
            </span>
          )}
        </div>
      </td>

      {/* Day cells */}
      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
        const val = Number(dayData[day] ?? 0);
        const inStreak = streakDays.has(day);
        const isPopping = popDay === day;

        const ringClass = inStreak
          ? 'ring-4 ring-orange-400 animate-pulse focus:outline-none'
          : 'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 dark:focus:ring-offset-slate-900';

        return (
          <td key={day} className="border border-gray-200 dark:border-slate-700 p-0">
            <div className="flex items-center justify-center min-h-[40px]">
            <button
              id={`bin-${rowIdx}-${day}`}
              onClick={() => handleCycleCell(day)}
              onKeyDown={(e) => handleKeyDown(e, day)}
              className={`w-8 h-8 rounded cursor-pointer transition-colors flex items-center justify-center ${CELL_BG[val] ?? CELL_BG[0]} ${ringClass} ${isPopping ? 'animate-pop' : ''}`}
              aria-label={`יום ${day + 1}`}
            >
              {val === 1 && inStreak && (
                <span className="text-[11px] leading-none select-none">🔥</span>
              )}
            </button>
            </div>
          </td>
        );
      })}

      {/* Summary columns */}
      <td className={`border border-gray-200 dark:border-slate-700 px-2 py-2 text-center text-sm font-medium whitespace-nowrap ${summaryBg}`}>
        <span dir="ltr">
          {activeStreak >= 3 && <span className="me-0.5">🔥</span>}
          {count}
          {editingGoal ? (
            <input
              autoFocus
              type="number"
              min="1"
              max="7"
              value={goalVal}
              onChange={(e) => setGoalVal(e.target.value)}
              onBlur={commitGoal}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitGoal();
                if (e.key === 'Escape') { setEditingGoal(false); setGoalVal(String(habit.goal ?? '')); }
              }}
              className="w-10 text-center text-sm border border-blue-400 rounded px-1 ms-1 outline-none bg-white dark:bg-slate-700 dark:text-slate-200 font-normal"
            />
          ) : (
            <span
              className="opacity-60 font-normal cursor-pointer hover:opacity-100 hover:text-blue-600 dark:hover:text-blue-400"
              title="לחץ לשינוי יעד"
              onClick={() => { setGoalVal(String(habit.goal ?? '')); setEditingGoal(true); }}
            >
              {habit.goal !== null ? ` / ${habit.goal}` : ' / —'}
            </span>
          )}
        </span>
      </td>
      <td
        className={`border border-gray-200 dark:border-slate-700 px-2 py-2 text-center text-sm font-medium whitespace-nowrap ${pct !== null ? getPctColorClass(pct) : 'text-gray-400 dark:text-slate-500'}`}
        title={pct !== null && habit.goal !== null ? getBinaryPaceTooltip(count, habit.goal, weekId) : undefined}
      >
        {pct !== null ? `${pct}%` : '—'}
      </td>
    </tr>
  );
}

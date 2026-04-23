import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Habit, DayData } from '../types';
import { numericTotal, numericAverage, numericPercentage, getPctColorClass, getNumericPaceTooltip } from '../utils/calculations';

interface Props {
  habit: Habit;
  dayData: DayData;
  isEven: boolean;
  weekId: string;
  isDraggingActive: boolean;
  onSetCell: (dayIndex: number, value: string) => void;
  onArchive: () => void;
  onRename: (name: string) => void;
  onUpdateGoal: (goal: number | null) => void;
}

export function NumericRow({ habit, dayData, isEven, weekId: _weekId, isDraggingActive: _isDraggingActive, onSetCell, onArchive, onRename, onUpdateGoal }: Props) {
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(habit.name);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalVal, setGoalVal] = useState(String(habit.goal ?? ''));

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });

  const total = numericTotal(dayData);
  const avg = numericAverage(dayData);
  const pct = numericPercentage(dayData, habit.goal);

  const rowBg = isEven ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-900';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  function openCell(day: number) {
    setEditingDay(day);
    setInputVal(String(dayData[day] ?? ''));
  }

  function commitCell() {
    if (editingDay === null) return;
    const num = parseFloat(inputVal);
    if (inputVal.trim() === '') {
      onSetCell(editingDay, '');
    } else if (!isNaN(num) && num >= 0) {
      onSetCell(editingDay, String(num));
    }
    setEditingDay(null);
    setInputVal('');
  }

  function commitGoal() {
    setEditingGoal(false);
    const num = parseFloat(goalVal);
    if (goalVal.trim() === '') {
      onUpdateGoal(null);
    } else if (!isNaN(num) && num > 0) {
      onUpdateGoal(num);
    } else {
      setGoalVal(String(habit.goal ?? ''));
    }
  }

  function commitRename() {
    setEditingName(false);
    if (nameVal.trim() && nameVal.trim() !== habit.name) {
      onRename(nameVal.trim());
    } else {
      setNameVal(habit.name);
    }
  }

  return (
    <tr ref={setNodeRef} style={style} className={`${rowBg} border-t-2 border-t-gray-300 dark:border-t-slate-600 transition-opacity`}>
      {/* Habit name — sticky start-0 = right in RTL */}
      <td className={`border border-gray-200 dark:border-slate-700 px-2 py-2 sticky start-0 z-10 ${rowBg} w-auto min-w-[110px] max-w-[180px]`}>
        <div className="flex items-center gap-2">
          <button
            onClick={onArchive}
            className="text-gray-300 dark:text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 text-base leading-none"
            title="מחק הרגל"
          >
            🗑
          </button>
          {editingName ? (
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setEditingName(false); setNameVal(habit.name); }
              }}
              className="flex-1 text-sm border-b border-blue-400 bg-transparent outline-none dark:text-slate-200"
            />
          ) : (
            <span
              onClick={() => setEditingName(true)}
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
      {[0, 1, 2, 3, 4, 5, 6].map((day) => (
        <td key={day} className="border border-gray-200 dark:border-slate-700 p-0 w-[35px]">
          <div className="flex items-center justify-center min-h-[36px] px-0.5">
            {editingDay === day ? (
              <input
                autoFocus
                type="number"
                min="0"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onBlur={commitCell}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitCell();
                  if (e.key === 'Escape') setEditingDay(null);
                }}
                className="w-full text-center text-sm border border-blue-400 rounded px-1 py-1 outline-none bg-white dark:bg-slate-700 dark:text-slate-200"
              />
            ) : (
              <button
                onClick={() => openCell(day)}
                className="w-full text-sm text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 rounded py-1 px-1 min-h-[32px] flex items-center justify-center"
              >
                {dayData[day] !== undefined && dayData[day] !== ''
                  ? Number(dayData[day]).toLocaleString('he-IL')
                  : ''}
              </button>
            )}
          </div>
        </td>
      ))}
      {/* Summary columns */}
      <td className="border border-gray-200 dark:border-slate-700 px-2 py-2 text-center text-sm text-gray-700 dark:text-slate-300 whitespace-nowrap">
        {total > 0 ? total.toLocaleString('he-IL') : '—'}
      </td>
      <td
        className={`border border-gray-200 dark:border-slate-700 px-2 py-2 text-center text-sm font-medium whitespace-nowrap ${pct !== null ? getPctColorClass(pct) : 'text-gray-700 dark:text-slate-300'}`}
        title={pct !== null && habit.goal !== null ? getNumericPaceTooltip(avg, habit.goal) : undefined}
      >
        {avg !== null ? avg.toLocaleString('he-IL') : '—'}
        {pct !== null && (
          <span className="block text-xs font-normal opacity-80">{pct}%</span>
        )}
        {editingGoal ? (
          <input
            autoFocus
            type="number"
            min="1"
            value={goalVal}
            onChange={(e) => setGoalVal(e.target.value)}
            onBlur={commitGoal}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitGoal();
              if (e.key === 'Escape') { setEditingGoal(false); setGoalVal(String(habit.goal ?? '')); }
            }}
            className="mt-1 w-20 text-center text-xs border border-blue-400 rounded px-1 py-0.5 outline-none bg-white dark:bg-slate-700 dark:text-slate-200 font-normal"
          />
        ) : (
          <span
            className="block text-xs font-normal cursor-pointer text-gray-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 mt-0.5"
            title="לחץ לשינוי יעד"
            onClick={() => { setGoalVal(String(habit.goal ?? '')); setEditingGoal(true); }}
          >
            יעד: {habit.goal !== null ? habit.goal.toLocaleString('he-IL') : '—'}
          </span>
        )}
      </td>
    </tr>
  );
}

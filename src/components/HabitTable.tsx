import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Habit, WeekData } from '../types';
import { DAYS_HE, formatDDMM, getWeekDayDates } from '../utils/weekUtils';
import { BinaryRow } from './BinaryRow';
import { NumericRow } from './NumericRow';
import { ConfirmModal } from './ConfirmModal';
import { WeeklyScoreBar } from './WeeklyScoreBar';

interface Props {
  habits: Habit[];
  weekData: WeekData;
  weekId: string;
  isCurrentWeek: boolean;
  onCycleCell: (weekId: string, habitId: string, day: number) => void;
  onSetBinaryCell: (weekId: string, habitId: string, day: number, value: 0 | 1 | 2 | 3) => void;
  onSetCell: (weekId: string, habitId: string, day: number, value: string) => void;
  onArchive: (habitId: string) => void;
  onRename: (habitId: string, name: string) => void;
  onUpdateGoal: (habitId: string, goal: number | null) => void;
  onReorder: (activeId: string, overId: string) => void;
  onLoadExamples?: () => void;
}

export function HabitTable({
  habits, weekData, weekId,
  onCycleCell, onSetBinaryCell, onSetCell, onArchive, onRename, onUpdateGoal, onReorder, onLoadExamples,
}: Props) {
  const [pendingArchive, setPendingArchive] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const dayDates = getWeekDayDates(weekId);
  const visibleHabits = habits.filter((h) => !h.archived);
  const binaryHabits = visibleHabits.filter((h) => h.type === 'binary');
  const numericHabits = visibleHabits.filter((h) => h.type === 'numeric');
  const activeHabit = activeId ? visibleHabits.find((h) => h.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  }

  const numericRowOffset = binaryHabits.length;

  if (visibleHabits.length === 0) {
    return (
      <>
        <WeeklyScoreBar habits={[]} weekData={weekData} />
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <p className="text-lg font-semibold text-gray-600 dark:text-slate-300" style={{ fontFamily: 'Rubik, sans-serif' }}>
            ברוכים הבאים! אין לכם הרגלים עדיין.
          </p>
          {onLoadExamples && (
            <button
              onClick={onLoadExamples}
              className="px-6 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600 text-base font-semibold shadow-md transition-colors"
              style={{ fontFamily: 'Rubik, sans-serif' }}
            >
              טען הרגלים לדוגמה
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <WeeklyScoreBar habits={visibleHabits} weekData={weekData} />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <table className="border-collapse sm:min-w-[560px] w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-800 sticky top-[52px] z-10">
                <th className="border border-gray-200 dark:border-slate-700 px-1.5 sm:px-3 py-2 sm:py-3 text-start font-semibold text-gray-700 dark:text-slate-200 sticky start-0 z-20 bg-gray-100 dark:bg-slate-800 w-auto min-w-[94px] sm:min-w-[110px]">
                  שם ההרגל
                </th>
                {DAYS_HE.map((day, i) => (
                  <th key={day} className="border border-gray-200 dark:border-slate-700 px-0.5 sm:px-1 py-2 sm:py-3 text-center font-semibold text-gray-800 dark:text-slate-100 whitespace-nowrap w-[35px]">
                    <div className="text-xs sm:text-sm">{day}</div>
                    <div className="text-[10px] sm:text-xs font-normal text-gray-500 dark:text-slate-400 mt-0.5" dir="ltr">{formatDDMM(dayDates[i])}</div>
                  </th>
                ))}
                <th className="border border-gray-200 dark:border-slate-700 px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold text-gray-700 dark:text-slate-200 whitespace-nowrap">
                  סיכום
                </th>
                <th className="border border-gray-200 dark:border-slate-700 px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold text-gray-700 dark:text-slate-200 whitespace-nowrap">
                  ממוצע / %
                </th>
              </tr>
            </thead>
            <tbody>
              <SortableContext items={binaryHabits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
                {binaryHabits.map((habit, i) => (
                  <BinaryRow
                    key={habit.id}
                    habit={habit}
                    dayData={weekData[habit.id] ?? {}}
                    isEven={i % 2 === 0}
                    rowIdx={i}
                    totalBinaryRows={binaryHabits.length}
                    weekId={weekId}
                    isDraggingActive={activeId === habit.id}
                    onCycleCell={(day) => onCycleCell(weekId, habit.id, day)}
                    onSetValue={(day, val) => onSetBinaryCell(weekId, habit.id, day, val)}
                    onArchive={() => setPendingArchive(habit.id)}
                    onRename={(name) => onRename(habit.id, name)}
                    onUpdateGoal={(goal) => onUpdateGoal(habit.id, goal)}
                  />
                ))}
              </SortableContext>
              <SortableContext items={numericHabits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
                {numericHabits.map((habit, i) => (
                  <NumericRow
                    key={habit.id}
                    habit={habit}
                    dayData={weekData[habit.id] ?? {}}
                    isEven={(numericRowOffset + i) % 2 === 0}
                    weekId={weekId}
                    isDraggingActive={activeId === habit.id}
                    onSetCell={(day, val) => onSetCell(weekId, habit.id, day, val)}
                    onArchive={() => setPendingArchive(habit.id)}
                    onRename={(name) => onRename(habit.id, name)}
                    onUpdateGoal={(goal) => onUpdateGoal(habit.id, goal)}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeHabit ? (
            <div className="bg-white dark:bg-slate-800 shadow-xl rounded-lg px-4 py-2.5 opacity-80 scale-[1.02] text-sm font-medium text-gray-800 dark:text-slate-200 border border-blue-300 dark:border-blue-600 pointer-events-none">
              ⠿ {activeHabit.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pendingArchive && (
        <ConfirmModal
          message="האם למחוק את ההרגל לצמיתות?"
          onConfirm={() => { onArchive(pendingArchive); setPendingArchive(null); }}
          onCancel={() => setPendingArchive(null)}
        />
      )}
    </>
  );
}

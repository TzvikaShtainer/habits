import { useRef, useState, useEffect } from 'react';
import { useAppState } from './hooks/useAppState';
import { useDarkMode } from './hooks/useDarkMode';
import { HabitTable } from './components/HabitTable';
import { WeekNav } from './components/WeekNav';
import { AddHabitModal } from './components/AddHabitModal';
import { Affirmations } from './components/Affirmations';
import { DailyReflection } from './components/DailyReflection';
import { SavedToast } from './components/SavedToast';
import { RitualsSidebar } from './components/RitualsSidebar';
import { DailyFocusSidebar } from './components/DailyFocusSidebar';

export default function App() {
  const {
    state, sortedWeekIds,
    cycleBinaryCell, setBinaryCell, setCellValue,
    setReflection, undo,
    addHabit, archiveHabit, renameHabit, updateHabitGoal, reorderHabits,
    createNewWeek, navigateWeek,
    exportState, importState, loadExampleHabits,
  } = useAppState();

  const { dark, toggle: toggleDark } = useDarkMode();
  const [showAddModal, setShowAddModal] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  // Ctrl+Z undo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  const currentWeekData = state.weeks[state.currentWeekId] ?? {};
  const habitsForWeek = state.habits.filter((h) => !h.archived);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-slate-900 font-sans transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:gap-4 sm:mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-slate-100">📋 מעקב הרגלים</h1>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              title={dark ? 'מצב יום' : 'מצב לילה'}
            >
              {dark ? '☀️' : '🌙'}
              <span className="hidden sm:inline"> {dark ? 'יום' : 'לילה'}</span>
            </button>
            <button
              onClick={exportState}
              className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              ⬇ <span className="hidden sm:inline">ייצוא </span>JSON
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              ⬆ <span className="hidden sm:inline">ייבוא </span>JSON
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { importState(file); e.target.value = ''; }
              }}
            />
          </div>
        </div>

        {/* Main grid: tracker + rituals sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="col-span-1 lg:col-span-3">
            {/* Affirmations */}
            <Affirmations />

            {/* Week navigation */}
            <div className="mb-6">
              <WeekNav
                currentWeekId={state.currentWeekId}
                sortedWeekIds={sortedWeekIds}
                onNavigate={navigateWeek}
                onNewWeek={createNewWeek}
              />
            </div>

            {/* Main table */}
            <div className="block overflow-x-auto">
            <HabitTable
              habits={habitsForWeek}
              weekData={currentWeekData}
              weekId={state.currentWeekId}
              isCurrentWeek={true}
              onCycleCell={cycleBinaryCell}
              onSetBinaryCell={setBinaryCell}
              onSetCell={(weekId, habitId, day, val) => setCellValue(weekId, habitId, day, val)}
              onArchive={archiveHabit}
              onRename={renameHabit}
              onUpdateGoal={updateHabitGoal}
              onReorder={reorderHabits}
              onLoadExamples={loadExampleHabits}
            />
            </div>

            {/* Add habit */}
            <div className="mt-4">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 text-sm font-medium"
              >
                + הוסף הרגל
              </button>
            </div>

            {/* Daily Reflection */}
            <DailyReflection
              weekId={state.currentWeekId}
              reflections={state.reflections ?? {}}
              onSave={setReflection}
            />

            {/* Keyboard hint */}
            <p className="mt-4 text-xs text-gray-400 dark:text-slate-600 text-center">
              ניווט: חצים · קיצורי מקלדת: 1=ירוק · 2=אדום · 3=שחור · 4=ריק · Ctrl+Z=ביטול
            </p>
          </div>

          {/* Right sidebars */}
          <div className="col-span-1 flex flex-col gap-4">
            <DailyFocusSidebar />
            <RitualsSidebar weekId={state.currentWeekId} />
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddHabitModal
          onAdd={(name, type, goal) => addHabit(name, type, goal)}
          onClose={() => setShowAddModal(false)}
        />
      )}

      <SavedToast />
    </div>
  );
}

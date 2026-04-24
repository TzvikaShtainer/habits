import { useRef, useState, useEffect, useCallback } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useAppState } from './hooks/useAppState';
import { useDarkMode } from './hooks/useDarkMode';
import { useIsMobile } from './hooks/useIsMobile';
import { HabitTable } from './components/HabitTable';
import { WeekNav } from './components/WeekNav';
import { AddHabitModal } from './components/AddHabitModal';
import { Affirmations } from './components/Affirmations';
import { DailyReflection } from './components/DailyReflection';
import { SavedToast } from './components/SavedToast';
import { RitualsSidebar } from './components/RitualsSidebar';
import { DailyFocusSidebar } from './components/DailyFocusSidebar';

const LAYOUT_KEY = 'habits-panel-layout';
const DEFAULT_LAYOUT = { rituals: 20, main: 60, focus: 20 };

function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    if (parsed.rituals && parsed.main && parsed.focus) return parsed;
    return DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function ResizeHandle() {
  return (
    <Separator className="group relative flex items-center justify-center w-2 cursor-col-resize hover:bg-blue-500/10 dark:hover:bg-blue-400/10 transition-colors z-10 flex-shrink-0">
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gray-200 dark:bg-slate-700 group-hover:bg-blue-400 dark:group-hover:bg-blue-500 transition-colors" />
      <div className="relative flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1 h-1 rounded-full bg-blue-400 dark:bg-blue-500" />
        ))}
      </div>
    </Separator>
  );
}

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
  const isMobile = useIsMobile();
  const [panelLayout] = useState(loadLayout);

  const savePanelLayout = useCallback((layout: Record<string, number>) => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  }, []);

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

  // ── Shared main column content ───────────────────────────────────────────
  const mainContent = (
    <>
      <Affirmations />
      <div className="mb-6">
        <WeekNav
          currentWeekId={state.currentWeekId}
          sortedWeekIds={sortedWeekIds}
          onNavigate={navigateWeek}
          onNewWeek={createNewWeek}
        />
      </div>
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
      <div className="mt-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 text-sm font-medium"
        >
          + הוסף הרגל
        </button>
      </div>
      <DailyReflection
        weekId={state.currentWeekId}
        reflections={state.reflections ?? {}}
        onSave={setReflection}
      />
      <p className="mt-4 text-xs text-gray-400 dark:text-slate-600 text-center">
        ניווט: חצים · קיצורי מקלדת: 1=ירוק · 2=אדום · 3=שחור · 4=ריק · Ctrl+Z=ביטול
      </p>
    </>
  );

  return (
    <div dir="rtl" className="h-screen flex flex-col bg-gray-50 dark:bg-slate-900 font-sans transition-colors overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
        <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-slate-100">
            📋 מעקב הרגלים
          </h1>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
            <button
              onClick={toggleDark}
              className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title={dark ? 'מצב יום' : 'מצב לילה'}
            >
              {dark ? '☀️' : '🌙'}
              <span className="hidden sm:inline"> {dark ? 'יום' : 'לילה'}</span>
            </button>
            <button
              onClick={exportState}
              className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              ⬇ <span className="hidden sm:inline">ייצוא </span>JSON
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
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
      </div>

      {/* ── Content ── */}
      {isMobile ? (
        // Mobile: stacked vertically — Daily Focus → Table → Rituals
        <div dir="rtl" className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
          <DailyFocusSidebar />
          {mainContent}
          <RitualsSidebar weekId={state.currentWeekId} />
        </div>
      ) : (
        // Desktop: resizable 3-column layout
        // dir="ltr" on the wrapper so drag physics work naturally;
        // each panel re-applies dir="rtl" for Hebrew content.
        // DOM order (LTR): [Rituals LEFT] | [Main CENTER] | [Focus RIGHT]
        <div dir="ltr" className="flex-1 overflow-hidden">
          <Group
            orientation="horizontal"
            className="h-full"
            defaultLayout={panelLayout}
            onLayoutChanged={savePanelLayout}
          >
            {/* LEFT — Daily Rituals */}
            <Panel id="rituals" defaultSize={20} minSize={15} maxSize={35} className="overflow-y-auto">
              <div dir="rtl" className="p-3">
                <RitualsSidebar weekId={state.currentWeekId} />
              </div>
            </Panel>

            <ResizeHandle />

            {/* CENTER — Main habits table */}
            <Panel id="main" defaultSize={60} minSize={40} className="overflow-y-auto">
              <div dir="rtl" className="px-4 py-4">
                {mainContent}
              </div>
            </Panel>

            <ResizeHandle />

            {/* RIGHT — Daily Focus */}
            <Panel id="focus" defaultSize={20} minSize={15} maxSize={35} className="overflow-y-auto">
              <div dir="rtl" className="p-3">
                <DailyFocusSidebar />
              </div>
            </Panel>
          </Group>
        </div>
      )}

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

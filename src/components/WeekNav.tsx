import { getWeekLabel } from '../utils/weekUtils';

interface Props {
  currentWeekId: string;
  sortedWeekIds: string[];
  onNavigate: (weekId: string) => void;
  onNewWeek: () => void;
}

export function WeekNav({ currentWeekId, sortedWeekIds, onNavigate, onNewWeek }: Props) {
  const currentIndex = sortedWeekIds.indexOf(currentWeekId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < sortedWeekIds.length - 1;

  return (
    <div className="flex justify-center items-center gap-6 flex-wrap">
      <button
        onClick={() => hasPrev && onNavigate(sortedWeekIds[currentIndex - 1])}
        disabled={!hasPrev}
        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
      >
        ← הקודם
      </button>
      <span className="font-semibold text-gray-800 dark:text-slate-100 text-sm">{getWeekLabel(currentWeekId)}</span>
      <button
        onClick={() => hasNext && onNavigate(sortedWeekIds[currentIndex + 1])}
        disabled={!hasNext}
        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
      >
        הבא →
      </button>
      <button
        onClick={onNewWeek}
        className="px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 text-sm font-medium"
      >
        + שבוע חדש
      </button>
    </div>
  );
}

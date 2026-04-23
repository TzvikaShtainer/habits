import type { Habit, WeekData } from '../types';
import { computeWeeklyScore } from '../utils/calculations';

interface Props {
  habits: Habit[];
  weekData: WeekData;
}

export function WeeklyScoreBar({ habits, weekData }: Props) {
  const score = computeWeeklyScore(habits, weekData);

  const { bg, text } = score === null
    ? { bg: 'bg-gray-200 dark:bg-slate-700', text: 'text-gray-500 dark:text-slate-400' }
    : score <= 30
    ? { bg: 'bg-red-500', text: 'text-white' }
    : score <= 70
    ? { bg: 'bg-yellow-400', text: 'text-black' }
    : { bg: 'bg-green-500', text: 'text-white' };

  return (
    <div
      className={`w-full rounded-xl px-6 py-3 mb-3 flex items-center justify-center gap-4 shadow-sm transition-colors duration-300 ${bg} ${text}`}
    >
      <span className="font-bold text-lg" style={{ fontFamily: 'Rubik, sans-serif' }}>
        ציון שבועי כללי
      </span>
      <span className="font-bold text-2xl">
        {score === null ? '— / 100' : `${score} / 100`}
      </span>
    </div>
  );
}

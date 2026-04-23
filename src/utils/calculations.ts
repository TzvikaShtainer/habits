import type { DayData } from '../types';

export function binaryCount(dayData: DayData): number {
  return Object.values(dayData).filter((v) => v === 1).length;
}

export function binaryNaCount(dayData: DayData): number {
  return Object.values(dayData).filter((v) => v === 3).length;
}

export function binaryPercentage(dayData: DayData, goal: number | null): number | null {
  if (!goal) return null;
  const green = binaryCount(dayData);
  return Math.round((green / goal) * 100);
}

export function numericTotal(dayData: DayData): number {
  return Object.values(dayData)
    .filter((v) => v !== '' && v !== undefined && v !== null)
    .reduce((sum, v) => sum + Number(v), 0);
}

export function numericAverage(dayData: DayData): number | null {
  const vals = Object.values(dayData).filter(
    (v) => v !== '' && v !== undefined && v !== null
  );
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((sum, v) => sum + Number(v), 0) / vals.length);
}

export function numericPercentage(dayData: DayData, goal: number | null): number | null {
  if (!goal) return null;
  const avg = numericAverage(dayData);
  if (avg === null) return null;
  return Math.round((avg / goal) * 100);
}

export function getPctColorClass(pct: number): string {
  if (pct <= 30) return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400';
  if (pct <= 70) return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400';
  if (pct < 100) return 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400';
  return 'bg-green-500 text-white';
}

export function getElapsedDaysInWeek(weekId: string): number {
  const weekStart = new Date(weekId + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - weekStart.getTime()) / 86400000);
  return Math.min(Math.max(diff, 0), 6);
}

export function getBinaryPaceTooltip(count: number, goal: number, weekId: string): string {
  const elapsed = getElapsedDaysInWeek(weekId);
  const expected = ((elapsed + 1) / 7) * goal;
  return count >= expected ? '✓ בקצב טוב' : '✗ מאחר בקצב';
}

export function getNumericPaceTooltip(avg: number | null, goal: number): string {
  if (avg === null) return '— אין נתונים';
  return avg >= goal ? '✓ בקצב טוב' : '✗ מאחר בקצב';
}

export function computeWeeklyScore(
  habits: import('../types').Habit[],
  weekData: import('../types').WeekData,
): number | null {
  const percentages: number[] = [];

  for (const habit of habits) {
    if (habit.archived && !weekData[habit.id]) continue;
    const dayData = weekData[habit.id] ?? {};

    if (habit.type === 'binary') {
      // Mirrors binaryPercentage(): greenCount / weeklyGoal * 100
      const pct = binaryPercentage(dayData, habit.goal);
      if (pct !== null) percentages.push(pct);
    } else if (habit.type === 'numeric') {
      // Mirrors numericPercentage(): average(values) / goal * 100
      const pct = numericPercentage(dayData, habit.goal);
      if (pct !== null) percentages.push(pct);
    }
  }

  if (percentages.length === 0) return null;
  return Math.round(percentages.reduce((s, v) => s + v, 0) / percentages.length);
}

export function getStreakInfo(dayData: DayData): { streakDays: Set<number>; activeStreak: number } {
  // Per-day streak count: Green increments, N/A pauses (inherits), Red/Empty resets
  const counts: number[] = Array(7).fill(0);
  let prev = 0;
  for (let d = 0; d <= 6; d++) {
    const v = Number(dayData[d] ?? 0);
    if (v === 1)      { prev++;        counts[d] = prev; }
    else if (v === 3) {                counts[d] = prev; } // N/A pauses
    else              { prev = 0;      counts[d] = 0;    } // break
  }

  // Tag every green day that is part of a 3+ streak segment
  const streakDays = new Set<number>();
  for (let d = 0; d <= 6; d++) {
    if (counts[d] >= 3 && Number(dayData[d] ?? 0) === 1) {
      let remaining = counts[d];
      for (let i = d; i >= 0 && remaining > 0; i--) {
        const v = Number(dayData[i] ?? 0);
        if (v === 1)      { streakDays.add(i); remaining--; }
        else if (v === 3) { /* skip N/A bridges */ }
        else              { break; }
      }
    }
  }

  // Active streak = count at the last green-or-N/A day (unfilled future days don't reset it)
  let activeStreak = 0;
  for (let d = 6; d >= 0; d--) {
    const v = Number(dayData[d] ?? 0);
    if (v === 1 || v === 3) { activeStreak = counts[d]; break; }
  }

  return { streakDays, activeStreak };
}

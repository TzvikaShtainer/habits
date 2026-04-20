export interface Habit {
  id: string;
  name: string;
  type: 'binary' | 'numeric';
  goal: number | null;
  archived: boolean;
}

export interface DayData {
  [dayIndex: number]: number | string;
}

export interface WeekData {
  [habitId: string]: DayData;
}

export interface AppState {
  habits: Habit[];
  weeks: {
    [weekId: string]: WeekData;
  };
  currentWeekId: string;
  reflections?: {
    [key: string]: string; // key = `${weekId}-${dayIndex}`
  };
}

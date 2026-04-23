import type { Habit } from '../types';

export const DEFAULT_HABITS: Habit[] = [
  { id: 'd1', name: 'אימון בוקר 🏃‍♂️', type: 'binary', goal: 5, archived: false },
  { id: 'd2', name: 'שתיית מים (2 ליטר) 💧', type: 'binary', goal: 7, archived: false },
  { id: 'd3', name: 'קריאת ספר 📚', type: 'binary', goal: 7, archived: false },
  { id: 'd4', name: 'צחצוח שיניים 🪥', type: 'binary', goal: 7, archived: false },
  { id: 'd5', name: 'כמות צעדים 👣', type: 'numeric', goal: 8000, archived: false },
];

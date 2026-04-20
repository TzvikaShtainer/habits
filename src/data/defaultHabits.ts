import type { Habit } from '../types';

export const DEFAULT_HABITS: Habit[] = [
  { id: 'h1', name: 'עבדתי על יוניטי', type: 'binary', goal: 5, archived: false },
  { id: 'h2', name: 'תרגילים לגב', type: 'binary', goal: 3, archived: false },
  { id: 'h3', name: 'אימון', type: 'binary', goal: 3, archived: false },
  { id: 'h4', name: 'לצחצח שיניים בערב', type: 'binary', goal: 7, archived: false },
  { id: 'h5', name: 'לאכול אוכל אמיתי', type: 'binary', goal: 6, archived: false },
  { id: 'h6', name: 'עקרונות תכנות', type: 'binary', goal: 2, archived: false },
  { id: 'h7', name: 'לקרוא ספר חיובי', type: 'binary', goal: 1, archived: false },
  { id: 'h8', name: 'ללכת 20ד ביום', type: 'binary', goal: 7, archived: false },
  { id: 'h9', name: 'כמות צעדים', type: 'numeric', goal: 8500, archived: false },
  { id: 'h10', name: 'משקל', type: 'numeric', goal: null, archived: false },
  { id: 'h11', name: 'קלוריות', type: 'numeric', goal: null, archived: false },
];

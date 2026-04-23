import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppState, Habit } from '../types';
import { DEFAULT_HABITS } from '../data/defaultHabits';
import { getSundayDate, nextSundayFrom } from '../utils/weekUtils';

const STORAGE_KEY = 'habit-tracker-state';

function buildInitialState(): AppState {
  const currentWeekId = getSundayDate(new Date());
  return {
    habits: DEFAULT_HABITS,
    weeks: { [currentWeekId]: {} },
    currentWeekId,
    reflections: {},
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { reflections: {}, ...parsed };
    }
  } catch {}
  return buildInitialState();
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState);
  const historyRef = useRef<AppState[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('habit-saved'));
  }, [state]);

  function pushHistory(prev: AppState) {
    historyRef.current = [...historyRef.current.slice(-29), prev];
  }

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setState(prev);
  }, []);

  const setCellValue = useCallback(
    (weekId: string, habitId: string, dayIndex: number, value: number | string) => {
      setState((prev) => {
        pushHistory(prev);
        return {
          ...prev,
          weeks: {
            ...prev.weeks,
            [weekId]: {
              ...prev.weeks[weekId],
              [habitId]: {
                ...(prev.weeks[weekId]?.[habitId] ?? {}),
                [dayIndex]: value,
              },
            },
          },
        };
      });
    },
    []
  );

  const cycleBinaryCell = useCallback(
    (weekId: string, habitId: string, dayIndex: number) => {
      setState((prev) => {
        pushHistory(prev);
        const current = prev.weeks[weekId]?.[habitId]?.[dayIndex] ?? 0;
        const next = ((Number(current) + 1) % 4) as 0 | 1 | 2 | 3;
        return {
          ...prev,
          weeks: {
            ...prev.weeks,
            [weekId]: {
              ...prev.weeks[weekId],
              [habitId]: {
                ...(prev.weeks[weekId]?.[habitId] ?? {}),
                [dayIndex]: next,
              },
            },
          },
        };
      });
    },
    []
  );

  const setBinaryCell = useCallback(
    (weekId: string, habitId: string, dayIndex: number, value: 0 | 1 | 2 | 3) => {
      setState((prev) => {
        pushHistory(prev);
        return {
          ...prev,
          weeks: {
            ...prev.weeks,
            [weekId]: {
              ...prev.weeks[weekId],
              [habitId]: {
                ...(prev.weeks[weekId]?.[habitId] ?? {}),
                [dayIndex]: value,
              },
            },
          },
        };
      });
    },
    []
  );

  const setReflection = useCallback((weekId: string, dayIndex: number, text: string) => {
    setState((prev) => {
      pushHistory(prev);
      return {
        ...prev,
        reflections: {
          ...(prev.reflections ?? {}),
          [`${weekId}-${dayIndex}`]: text,
        },
      };
    });
  }, []);

  const addHabit = useCallback((name: string, type: 'binary' | 'numeric', goal: number | null) => {
    const id = `h${Date.now()}`;
    const newHabit: Habit = { id, name, type, goal, archived: false };
    setState((prev) => ({
      ...prev,
      habits: [...prev.habits, newHabit],
    }));
  }, []);

  const archiveHabit = useCallback((habitId: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== habitId),
    }));
  }, []);

  const renameHabit = useCallback((habitId: string, name: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => (h.id === habitId ? { ...h, name } : h)),
    }));
  }, []);

  const updateHabitGoal = useCallback((habitId: string, goal: number | null) => {
    setState((prev) => {
      pushHistory(prev);
      return {
        ...prev,
        habits: prev.habits.map((h) => (h.id === habitId ? { ...h, goal } : h)),
      };
    });
  }, []);

  const reorderHabits = useCallback((activeId: string, overId: string) => {
    setState((prev) => {
      const oldIndex = prev.habits.findIndex((h) => h.id === activeId);
      const newIndex = prev.habits.findIndex((h) => h.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
      const reordered = [...prev.habits];
      reordered.splice(newIndex, 0, reordered.splice(oldIndex, 1)[0]);
      return { ...prev, habits: reordered };
    });
  }, []);

  const createNewWeek = useCallback(() => {
    setState((prev) => {
      const newWeekId = nextSundayFrom(prev.currentWeekId);
      return {
        ...prev,
        weeks: prev.weeks[newWeekId]
          ? { ...prev.weeks }
          : { ...prev.weeks, [newWeekId]: {} },
        currentWeekId: newWeekId,
      };
    });
  }, []);

  const navigateWeek = useCallback((weekId: string) => {
    setState((prev) => ({ ...prev, currentWeekId: weekId }));
  }, []);

  const exportState = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'habits.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const loadExampleHabits = useCallback(() => {
    setState((prev) => {
      pushHistory(prev);
      return { ...prev, habits: DEFAULT_HABITS };
    });
  }, []);

  const importState = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed: AppState = JSON.parse(e.target?.result as string);
        setState({ reflections: {}, ...parsed });
      } catch {
        alert('קובץ לא תקין');
      }
    };
    reader.readAsText(file);
  }, []);

  const sortedWeekIds = Object.keys(state.weeks).sort();

  return {
    state,
    sortedWeekIds,
    setCellValue,
    cycleBinaryCell,
    setBinaryCell,
    setReflection,
    undo,
    addHabit,
    archiveHabit,
    renameHabit,
    updateHabitGoal,
    reorderHabits,
    createNewWeek,
    navigateWeek,
    exportState,
    importState,
    loadExampleHabits,
  };
}

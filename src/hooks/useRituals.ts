import { useState, useEffect } from 'react';

export interface RitualQuestion {
  id: string;
  text: string;
}

export interface RitualSection {
  id: string;
  title: string;
  color: 'orange' | 'purple' | 'green';
  questions: RitualQuestion[];
  affirmation?: string;
}

const TEMPLATES_KEY = 'ritual_templates';
const ENTRIES_KEY = 'ritual_entries';

const DEFAULT_SECTIONS: RitualSection[] = [
  {
    id: 'morning',
    title: 'טקס בוקר',
    color: 'orange',
    questions: [
      { id: 'm1', text: '' },
      { id: 'm2', text: '' },
      { id: 'm3', text: '' },
    ],
  },
  {
    id: 'night',
    title: 'טקס לילה',
    color: 'purple',
    questions: [
      { id: 'n1', text: '' },
      { id: 'n2', text: '' },
      { id: 'n3', text: '' },
    ],
  },
  {
    id: 'focus',
    title: 'מיקוד והצלחה',
    color: 'green',
    questions: [
      { id: 'f1', text: '' },
      { id: 'f2', text: '' },
    ],
    affirmation: 'אני ישן בשקט כי אני יודע שהחיים פועלים לטובתי גם כשאני נח',
  },
];

function loadSections(): RitualSection[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    return raw ? (JSON.parse(raw) as RitualSection[]) : DEFAULT_SECTIONS;
  } catch {
    return DEFAULT_SECTIONS;
  }
}

function loadEntries(): Record<string, Record<string, string>> {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Record<string, string>>) : {};
  } catch {
    return {};
  }
}

export function useRituals() {
  const [sections, setSections] = useState<RitualSection[]>(loadSections);
  const [entries, setEntries] = useState<Record<string, Record<string, string>>>(loadEntries);

  useEffect(() => {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(sections));
  }, [sections]);

  useEffect(() => {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  }, [entries]);

  function updateQuestion(sectionId: string, questionId: string, text: string) {
    setSections(prev =>
      prev.map(s =>
        s.id === sectionId
          ? { ...s, questions: s.questions.map(q => (q.id === questionId ? { ...q, text } : q)) }
          : s
      )
    );
  }

  function setAnswer(weekId: string, dayIndex: number, questionId: string, text: string) {
    const key = `${weekId}-${dayIndex}`;
    setEntries(prev => ({
      ...prev,
      [key]: { ...prev[key], [questionId]: text },
    }));
  }

  function getAnswer(weekId: string, dayIndex: number, questionId: string): string {
    const key = `${weekId}-${dayIndex}`;
    return entries[key]?.[questionId] ?? '';
  }

  return { sections, updateQuestion, setAnswer, getAnswer };
}

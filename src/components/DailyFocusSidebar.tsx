import { useState, useCallback } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TopThreeItem {
  id: string;
  text: string;
  done: boolean;
}

interface GeneralTask {
  id: string;
  text: string;
  done: boolean;
}

interface DailyFocusData {
  date: string;
  topThree: TopThreeItem[];
  generalTasks: GeneralTask[];
}

const STORAGE_KEY = 'daily-focus';

const VIP_LABELS = ['🥇', '🥈', '🥉'];
const VIP_COLORS = [
  'border-amber-400 bg-amber-50 dark:bg-amber-900/20',
  'border-slate-400 bg-slate-50 dark:bg-slate-700/30',
  'border-orange-400/70 bg-orange-50 dark:bg-orange-900/20',
];
const VIP_INPUT_COLORS = [
  'placeholder:text-amber-300 dark:placeholder:text-amber-700/60',
  'placeholder:text-slate-400 dark:placeholder:text-slate-600',
  'placeholder:text-orange-300 dark:placeholder:text-orange-700/60',
];
const VIP_PLACEHOLDERS = ['המשימה החשובה ביותר...', 'עדיפות שנייה...', 'עדיפות שלישית...'];

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function defaultTopThree(): TopThreeItem[] {
  return [
    { id: 'top-1', text: '', done: false },
    { id: 'top-2', text: '', done: false },
    { id: 'top-3', text: '', done: false },
  ];
}

function loadData(): DailyFocusData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: getTodayStr(), topThree: defaultTopThree(), generalTasks: [] };
    const parsed: DailyFocusData = JSON.parse(raw);
    if (parsed.date !== getTodayStr()) {
      return {
        date: getTodayStr(),
        topThree: (parsed.topThree ?? defaultTopThree()).map(t => ({ ...t, done: false })),
        generalTasks: (parsed.generalTasks ?? []).filter(t => !t.done),
      };
    }
    return {
      ...parsed,
      topThree: parsed.topThree ?? defaultTopThree(),
      generalTasks: parsed.generalTasks ?? [],
    };
  } catch {
    return { date: getTodayStr(), topThree: defaultTopThree(), generalTasks: [] };
  }
}

function saveData(data: DailyFocusData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Sortable general task row ─────────────────────────────────────────────────

interface SortableTaskProps {
  task: GeneralTask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function SortableTask({ task, onToggle, onDelete }: SortableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2 py-1.5 group border-b border-gray-100 dark:border-slate-700/60 last:border-0"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-slate-600 hover:text-gray-400 dark:hover:text-slate-400 touch-none flex-shrink-0 text-base leading-none"
        tabIndex={-1}
        aria-label="גרור לסידור מחדש"
      >
        ⠿
      </button>
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => onToggle(task.id)}
        className="flex-shrink-0 w-3.5 h-3.5 accent-blue-500 cursor-pointer"
      />
      <span
        className={`flex-1 text-xs leading-4 break-words ${
          task.done
            ? 'line-through text-gray-400 dark:text-slate-500'
            : 'text-gray-700 dark:text-slate-200'
        }`}
        dir="rtl"
      >
        {task.text}
      </span>
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 text-xs flex-shrink-0 leading-none transition-opacity"
        aria-label="מחק משימה"
      >
        ✕
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DailyFocusSidebar() {
  const [data, setData] = useState<DailyFocusData>(loadData);
  const [newTaskText, setNewTaskText] = useState('');

  const persist = useCallback((next: DailyFocusData) => {
    setData(next);
    saveData(next);
  }, []);

  const updateTopText = (id: string, text: string) =>
    persist({ ...data, topThree: data.topThree.map(t => (t.id === id ? { ...t, text } : t)) });

  const toggleTop = (id: string) =>
    persist({ ...data, topThree: data.topThree.map(t => (t.id === id ? { ...t, done: !t.done } : t)) });

  const toggleTask = (id: string) =>
    persist({ ...data, generalTasks: data.generalTasks.map(t => (t.id === id ? { ...t, done: !t.done } : t)) });

  const deleteTask = (id: string) =>
    persist({ ...data, generalTasks: data.generalTasks.filter(t => t.id !== id) });

  const addTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    persist({ ...data, generalTasks: [...data.generalTasks, { id: `task-${Date.now()}`, text, done: false }] });
    setNewTaskText('');
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = data.generalTasks.findIndex(t => t.id === active.id);
    const newIndex = data.generalTasks.findIndex(t => t.id === over.id);
    persist({ ...data, generalTasks: arrayMove(data.generalTasks, oldIndex, newIndex) });
  };

  const doneCount = data.topThree.filter(t => t.done && t.text).length;
  const totalFilled = data.topThree.filter(t => t.text).length;

  return (
    <div className="flex flex-col gap-3" dir="rtl">

      {/* ── Section title ── */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm text-gray-800 dark:text-slate-100 flex items-center gap-1.5">
          🎯 מיקוד יומי
        </h2>
        {totalFilled > 0 && (
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {doneCount}/{totalFilled} הושלמו
          </span>
        )}
      </div>

      {/* ── VIP Top 3 ── */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-l from-amber-50 to-amber-100/60 dark:from-amber-900/20 dark:to-amber-800/10 px-3 py-2 border-b border-amber-200 dark:border-amber-800/40">
          <h3 className="font-semibold text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            ⭐ Top 3 — עדיפות עליונה
          </h3>
        </div>
        <div className="p-2 flex flex-col gap-2">
          {data.topThree.map((item, index) => (
            <div
              key={item.id}
              className={`rounded-lg border-2 ${VIP_COLORS[index]} px-3 py-2.5 flex items-start gap-2.5 transition-opacity ${item.done ? 'opacity-60' : ''}`}
            >
              {/* Medal badge */}
              <span className="text-lg leading-none flex-shrink-0 mt-0.5" aria-hidden>
                {VIP_LABELS[index]}
              </span>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={item.text}
                  onChange={e => updateTopText(item.id, e.target.value)}
                  placeholder={VIP_PLACEHOLDERS[index]}
                  dir="rtl"
                  className={`w-full text-sm font-medium bg-transparent focus:outline-none leading-tight ${
                    item.done
                      ? 'line-through text-gray-400 dark:text-slate-500'
                      : 'text-gray-800 dark:text-slate-100'
                  } ${VIP_INPUT_COLORS[index]}`}
                />
              </div>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleTop(item.id)}
                className="flex-shrink-0 w-4 h-4 accent-amber-500 cursor-pointer mt-0.5"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── General Tasks ── */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-800/40 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-l from-blue-50 to-blue-100/40 dark:from-blue-900/20 dark:to-blue-800/10 px-3 py-2 border-b border-blue-200 dark:border-blue-800/40 flex items-center justify-between">
          <h3 className="font-semibold text-xs text-blue-700 dark:text-blue-400 uppercase tracking-wide">
            📝 משימות כלליות
          </h3>
          {data.generalTasks.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {data.generalTasks.filter(t => t.done).length}/{data.generalTasks.length}
            </span>
          )}
        </div>

        <div className="p-2">
          {data.generalTasks.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-500 italic py-2 text-center">
              אין משימות — הוסף למטה
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={data.generalTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col">
                  {data.generalTasks.map(task => (
                    <SortableTask key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Add task */}
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
            <input
              type="text"
              value={newTaskText}
              onChange={e => setNewTaskText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="הוסף משימה..."
              dir="rtl"
              className="flex-1 text-xs bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-gray-800 dark:text-slate-100"
            />
            <button
              onClick={addTask}
              disabled={!newTaskText.trim()}
              className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors flex-shrink-0"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

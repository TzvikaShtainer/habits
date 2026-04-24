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
      // New day: reset top-3 checkboxes, remove completed general tasks
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

// ── Sortable general task row ────────────────────────────────────────────────

interface SortableTaskProps {
  task: GeneralTask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function SortableTask({ task, onToggle, onDelete }: SortableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-1 group"
    >
      {/* drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-slate-600 hover:text-gray-400 dark:hover:text-slate-400 touch-none flex-shrink-0"
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
        className={`flex-1 text-xs leading-4 ${
          task.done
            ? 'line-through text-gray-400 dark:text-slate-500'
            : 'text-gray-700 dark:text-slate-200'
        }`}
        style={{ direction: 'rtl' }}
      >
        {task.text}
      </span>

      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 text-xs flex-shrink-0 leading-none"
        aria-label="מחק משימה"
      >
        ✕
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function DailyFocusSidebar() {
  const [data, setData] = useState<DailyFocusData>(loadData);
  const [newTaskText, setNewTaskText] = useState('');

  const persist = useCallback((next: DailyFocusData) => {
    setData(next);
    saveData(next);
  }, []);

  // Top 3 handlers
  const updateTopText = (id: string, text: string) => {
    persist({
      ...data,
      topThree: data.topThree.map(t => (t.id === id ? { ...t, text } : t)),
    });
  };

  const toggleTop = (id: string) => {
    persist({
      ...data,
      topThree: data.topThree.map(t => (t.id === id ? { ...t, done: !t.done } : t)),
    });
  };

  // General tasks handlers
  const toggleTask = (id: string) => {
    persist({
      ...data,
      generalTasks: data.generalTasks.map(t => (t.id === id ? { ...t, done: !t.done } : t)),
    });
  };

  const deleteTask = (id: string) => {
    persist({ ...data, generalTasks: data.generalTasks.filter(t => t.id !== id) });
  };

  const addTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    const task: GeneralTask = { id: `task-${Date.now()}`, text, done: false };
    persist({ ...data, generalTasks: [...data.generalTasks, task] });
    setNewTaskText('');
  };

  // DnD
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

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      {/* ── Daily Top 3 ── */}
      <div className="rounded-xl border-2 border-amber-400/50 bg-amber-50 dark:bg-slate-800 shadow-sm p-3">
        <h3 className="font-semibold text-sm mb-3 text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <span>⭐</span> Top 3 היום
        </h3>

        <div className="flex flex-col gap-2">
          {data.topThree.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 dark:text-amber-500 w-4 flex-shrink-0 text-center">
                {index + 1}
              </span>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleTop(item.id)}
                className="flex-shrink-0 w-3.5 h-3.5 accent-amber-500 cursor-pointer"
              />
              <input
                type="text"
                value={item.text}
                onChange={e => updateTopText(item.id, e.target.value)}
                placeholder={`עדיפות ${index + 1}...`}
                dir="rtl"
                className={`flex-1 text-xs bg-transparent border-b border-amber-200 dark:border-slate-600 focus:border-amber-400 dark:focus:border-amber-400 focus:outline-none py-0.5 transition-colors ${
                  item.done
                    ? 'line-through text-gray-400 dark:text-slate-500'
                    : 'text-gray-800 dark:text-slate-100'
                } placeholder:text-amber-300 dark:placeholder:text-slate-600`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── General Tasks ── */}
      <div className="rounded-xl border-2 border-blue-400/40 bg-white dark:bg-slate-800 shadow-sm p-3">
        <h3 className="font-semibold text-sm mb-2 text-blue-500 dark:text-blue-400 flex items-center gap-1.5">
          <span>📝</span> משימות כלליות
        </h3>

        {data.generalTasks.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-slate-500 italic mb-2">
            אין משימות עדיין
          </p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={data.generalTasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-slate-700">
              {data.generalTasks.map(task => (
                <SortableTask
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add task input */}
        <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
          <input
            type="text"
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="הוסף משימה..."
            dir="rtl"
            className="flex-1 text-xs bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-gray-800 dark:text-slate-100"
          />
          <button
            onClick={addTask}
            disabled={!newTaskText.trim()}
            className="px-2.5 py-1.5 rounded bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex-shrink-0"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

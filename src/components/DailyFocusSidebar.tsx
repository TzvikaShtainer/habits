import { useState, useCallback, useRef } from 'react';
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface TopThreeItem {
  id: string;
  text: string;
  done: boolean;
}

interface GeneralTask {
  id: string;
  type: 'task';
  text: string;
  done: boolean;
}

interface GeneralHeader {
  id: string;
  type: 'header';
  text: string;
  color: string;
}

type GeneralItem = GeneralTask | GeneralHeader;

interface DailyFocusData {
  date: string;
  topThree: TopThreeItem[];
  generalTasks: GeneralItem[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

const HEADER_COLORS = [
  { value: '#3B82F6', label: 'כחול' },
  { value: '#10B981', label: 'ירוק' },
  { value: '#8B5CF6', label: 'סגול' },
  { value: '#F59E0B', label: 'כתום' },
  { value: '#EF4444', label: 'אדום' },
  { value: '#64748B', label: 'אפור' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function migrateItem(raw: GeneralItem | { id: string; text: string; done: boolean }): GeneralItem {
  if ('type' in raw) return raw as GeneralItem;
  // legacy format — plain task without type field
  return { id: raw.id, type: 'task', text: raw.text, done: (raw as { done: boolean }).done };
}

function loadData(): DailyFocusData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: getTodayStr(), topThree: defaultTopThree(), generalTasks: [] };
    const parsed = JSON.parse(raw);
    const tasks: GeneralItem[] = (parsed.generalTasks ?? []).map(migrateItem);
    if (parsed.date !== getTodayStr()) {
      return {
        date: getTodayStr(),
        topThree: (parsed.topThree ?? defaultTopThree()).map((t: TopThreeItem) => ({ ...t, done: false })),
        generalTasks: tasks.filter(t => t.type === 'header' || !t.done),
      };
    }
    return {
      ...parsed,
      topThree: parsed.topThree ?? defaultTopThree(),
      generalTasks: tasks,
    };
  } catch {
    return { date: getTodayStr(), topThree: defaultTopThree(), generalTasks: [] };
  }
}

function saveData(data: DailyFocusData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Color picker popover ───────────────────────────────────────────────────────

interface ColorPickerProps {
  current: string;
  onChange: (color: string) => void;
  onClose: () => void;
}

function ColorPicker({ current, onChange, onClose }: ColorPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className="absolute top-full mt-1 end-0 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-2 flex gap-1.5"
      dir="ltr"
      onMouseDown={e => e.stopPropagation()}
    >
      {HEADER_COLORS.map(c => (
        <button
          key={c.value}
          title={c.label}
          onClick={() => { onChange(c.value); onClose(); }}
          className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0"
          style={{
            backgroundColor: c.value,
            borderColor: current === c.value ? '#fff' : c.value,
            outline: current === c.value ? `2px solid ${c.value}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ── Sortable header row ────────────────────────────────────────────────────────

interface SortableHeaderProps {
  item: GeneralHeader;
  isFirst: boolean;
  onUpdate: (id: string, patch: Partial<GeneralHeader>) => void;
  onDelete: (id: string) => void;
}

function SortableHeader({ item, isFirst, onUpdate, onDelete }: SortableHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`group relative flex items-center gap-1.5 py-1 ${isFirst ? '' : 'mt-5'}`}
    >
      {/* Colored left border accent */}
      <div className="absolute inset-y-0 end-0 w-0.5 rounded-full" style={{ backgroundColor: item.color }} />

      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-slate-600 hover:text-gray-400 dark:hover:text-slate-400 touch-none flex-shrink-0 text-base leading-none"
        tabIndex={-1}
        aria-label="גרור לסידור מחדש"
      >
        ⠿
      </button>

      {/* Colored badge + editable text */}
      <div
        className="flex-1 flex items-center gap-1.5 rounded-md px-2 py-1 min-w-0"
        style={{ backgroundColor: `${item.color}18`, borderRight: `3px solid ${item.color}` }}
      >
        <input
          type="text"
          value={item.text}
          onChange={e => onUpdate(item.id, { text: e.target.value })}
          placeholder="שם קטגוריה..."
          dir="rtl"
          className="flex-1 text-xs font-bold bg-transparent focus:outline-none min-w-0"
          style={{ color: item.color }}
        />
      </div>

      {/* Color swatch button */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowPicker(v => !v)}
          onBlur={() => setTimeout(() => setShowPicker(false), 150)}
          className="w-4 h-4 rounded-full border border-white/50 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0"
          style={{ backgroundColor: item.color }}
          aria-label="שנה צבע"
        />
        {showPicker && (
          <ColorPicker
            current={item.color}
            onChange={c => onUpdate(item.id, { color: c })}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 text-xs flex-shrink-0 leading-none transition-opacity"
        aria-label="מחק קטגוריה"
      >
        ✕
      </button>
    </div>
  );
}

// ── Sortable task row ──────────────────────────────────────────────────────────

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
    persist({
      ...data,
      generalTasks: data.generalTasks.map(t =>
        t.id === id && t.type === 'task' ? { ...t, done: !t.done } : t,
      ),
    });

  const deleteItem = (id: string) =>
    persist({ ...data, generalTasks: data.generalTasks.filter(t => t.id !== id) });

  const updateHeader = (id: string, patch: Partial<GeneralHeader>) =>
    persist({
      ...data,
      generalTasks: data.generalTasks.map(t =>
        t.id === id && t.type === 'header' ? { ...t, ...patch } : t,
      ),
    });

  const addTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    const task: GeneralTask = { id: `task-${Date.now()}`, type: 'task', text, done: false };
    persist({ ...data, generalTasks: [...data.generalTasks, task] });
    setNewTaskText('');
  };

  const addHeader = () => {
    const header: GeneralHeader = {
      id: `header-${Date.now()}`,
      type: 'header',
      text: '',
      color: HEADER_COLORS[0].value,
    };
    persist({ ...data, generalTasks: [...data.generalTasks, header] });
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
  const taskItems = data.generalTasks.filter(t => t.type === 'task') as GeneralTask[];
  const tasksDone = taskItems.filter(t => t.done).length;

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
          {taskItems.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {tasksDone}/{taskItems.length}
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
                  {data.generalTasks.map((item, idx) => {
                    if (item.type === 'header') {
                      const isFirst = idx === 0;
                      return (
                        <SortableHeader
                          key={item.id}
                          item={item}
                          isFirst={isFirst}
                          onUpdate={updateHeader}
                          onDelete={deleteItem}
                        />
                      );
                    }
                    return (
                      <SortableTask
                        key={item.id}
                        task={item}
                        onToggle={toggleTask}
                        onDelete={deleteItem}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Add task / category */}
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
              title="הוסף משימה"
            >
              +
            </button>
            <button
              onClick={addHeader}
              className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-500 dark:text-slate-300 text-xs font-bold transition-colors flex-shrink-0 border border-gray-200 dark:border-slate-600"
              title="הוסף קטגוריה"
            >
              ≡
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

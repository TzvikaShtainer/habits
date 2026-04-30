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

// ── Types ─────────────────────────────────────────────────────────────────────

type GoalTab = 'annual' | 'quarterly' | 'daily';

interface GoalItem {
  id: string;
  type: 'goal';
  text: string;
  color: string;
}

interface GoalHeader {
  id: string;
  type: 'header';
  text: string;
  color: string;
}

type GoalListItem = GoalItem | GoalHeader;

interface GoalNavigatorData {
  activeTab: GoalTab;
  annual: GoalListItem[];
  quarterly: GoalListItem[];
  daily: GoalListItem[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'goal-navigator';

const GOAL_COLORS = [
  { value: '#3B82F6', label: 'כחול' },
  { value: '#10B981', label: 'ירוק' },
  { value: '#8B5CF6', label: 'סגול' },
  { value: '#F59E0B', label: 'כתום' },
  { value: '#EC4899', label: 'ורוד' },
  { value: '#14B8A6', label: 'טורקיז' },
  { value: '#EF4444', label: 'אדום' },
  { value: '#64748B', label: 'אפור' },
];

const DEFAULT_GOAL_COLOR = '#64748B';

const TABS: { id: GoalTab; label: string; icon: string }[] = [
  { id: 'annual',    label: 'שנתי',    icon: '🌟' },
  { id: 'quarterly', label: 'רבעוני',  icon: '📅' },
  { id: 'daily',     label: 'יומי',    icon: '✅' },
];

// ── Persistence ───────────────────────────────────────────────────────────────

function loadData(): GoalNavigatorData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeTab: 'annual', annual: [], quarterly: [], daily: [] };
    return JSON.parse(raw);
  } catch {
    return { activeTab: 'annual', annual: [], quarterly: [], daily: [] };
  }
}

function saveData(data: GoalNavigatorData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Color picker popover ───────────────────────────────────────────────────────

interface ColorPickerProps {
  current: string;
  onChange: (color: string) => void;
  onClose: () => void;
}

function ColorPicker({ current, onChange, onClose }: ColorPickerProps) {
  return (
    <div
      className="absolute top-full mt-2 left-0 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl p-2.5 grid grid-cols-4 gap-1.5 w-max"
      dir="ltr"
      onMouseDown={e => e.stopPropagation()}
    >
      {GOAL_COLORS.map(c => (
        <button
          key={c.value}
          title={c.label}
          onClick={() => { onChange(c.value); onClose(); }}
          className="w-7 h-7 rounded-lg transition-all hover:scale-110 hover:shadow-md flex-shrink-0"
          style={{
            backgroundColor: c.value,
            border: current === c.value ? '2px solid white' : `2px solid ${c.value}44`,
            outline: current === c.value ? `2.5px solid ${c.value}` : 'none',
            outlineOffset: '1px',
          }}
        />
      ))}
    </div>
  );
}

// ── Sortable goal row ──────────────────────────────────────────────────────────

interface SortableGoalProps {
  item: GoalItem;
  onUpdate: (id: string, patch: Partial<GoalItem>) => void;
  onDelete: (id: string) => void;
}

function SortableGoal({ item, onUpdate, onDelete }: SortableGoalProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="group flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-slate-700/60 last:border-0"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-slate-600 hover:text-gray-400 touch-none flex-shrink-0 text-base leading-none"
        tabIndex={-1}
        aria-label="גרור לסידור מחדש"
      >
        ⠿
      </button>

      {/* Colored left accent + editable text */}
      <div
        className="flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 min-w-0 transition-colors"
        style={{ backgroundColor: `${item.color}14`, borderRight: `3px solid ${item.color}` }}
      >
        <input
          type="text"
          value={item.text}
          onChange={e => onUpdate(item.id, { text: e.target.value })}
          placeholder="כתוב מטרה..."
          dir="rtl"
          className="flex-1 text-sm bg-transparent focus:outline-none min-w-0 text-gray-800 dark:text-slate-100 placeholder:text-gray-300 dark:placeholder:text-slate-600"
        />
      </div>

      {/* Color swatch */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowPicker(v => !v)}
          onBlur={() => setTimeout(() => setShowPicker(false), 150)}
          className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-700 shadow opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
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
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-300 dark:text-slate-600 hover:text-red-400 text-xs flex-shrink-0 leading-none transition-opacity"
        aria-label="מחק מטרה"
      >
        ✕
      </button>
    </div>
  );
}

// ── Sortable header row ────────────────────────────────────────────────────────

interface SortableHeaderProps {
  item: GoalHeader;
  isFirst: boolean;
  onUpdate: (id: string, patch: Partial<GoalHeader>) => void;
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
      <div className="absolute inset-y-0 end-0 w-0.5 rounded-full" style={{ backgroundColor: item.color }} />

      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-slate-600 hover:text-gray-400 touch-none flex-shrink-0 text-base leading-none"
        tabIndex={-1}
        aria-label="גרור לסידור מחדש"
      >
        ⠿
      </button>

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

      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowPicker(v => !v)}
          onBlur={() => setTimeout(() => setShowPicker(false), 150)}
          className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-700 shadow opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
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
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-300 dark:text-slate-600 hover:text-red-400 text-xs flex-shrink-0 leading-none transition-opacity"
        aria-label="מחק קטגוריה"
      >
        ✕
      </button>
    </div>
  );
}

// ── Goal list (per tab) ───────────────────────────────────────────────────────

interface GoalListProps {
  items: GoalListItem[];
  onUpdate: (id: string, patch: Partial<GoalListItem>) => void;
  onDelete: (id: string) => void;
  onReorder: (items: GoalListItem[]) => void;
  onAddGoal: () => void;
  onAddHeader: () => void;
  newText: string;
  onNewTextChange: (v: string) => void;
}

function GoalList({ items, onUpdate, onDelete, onReorder, onAddGoal, onAddHeader, newText, onNewTextChange }: GoalListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(t => t.id === active.id);
    const newIndex = items.findIndex(t => t.id === over.id);
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <div className="flex flex-col gap-0">
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-slate-500 italic py-3 text-center">
          אין מטרות עדיין — הוסף למטה
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col">
              {items.map((item, idx) => {
                if (item.type === 'header') {
                  return (
                    <SortableHeader
                      key={item.id}
                      item={item}
                      isFirst={idx === 0}
                      onUpdate={(id, patch) => onUpdate(id, patch as Partial<GoalListItem>)}
                      onDelete={onDelete}
                    />
                  );
                }
                return (
                  <SortableGoal
                    key={item.id}
                    item={item}
                    onUpdate={(id, patch) => onUpdate(id, patch as Partial<GoalListItem>)}
                    onDelete={onDelete}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add controls */}
      <div className="flex gap-1.5 mt-3 pt-2 border-t border-gray-100 dark:border-slate-700">
        <input
          type="text"
          value={newText}
          onChange={e => onNewTextChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onAddGoal()}
          placeholder="הוסף מטרה..."
          dir="rtl"
          className="flex-1 text-xs bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-gray-800 dark:text-slate-100"
        />
        <button
          onClick={onAddGoal}
          disabled={!newText.trim()}
          className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors flex-shrink-0"
          title="הוסף מטרה"
        >
          +
        </button>
        <button
          onClick={onAddHeader}
          className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-500 dark:text-slate-300 text-xs font-bold transition-colors flex-shrink-0 border border-gray-200 dark:border-slate-600"
          title="הוסף קטגוריה"
        >
          ≡
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GoalNavigator() {
  const [data, setData] = useState<GoalNavigatorData>(loadData);
  const [newText, setNewText] = useState('');

  const persist = useCallback((next: GoalNavigatorData) => {
    setData(next);
    saveData(next);
  }, []);

  const activeList = data[data.activeTab];

  const updateItem = (id: string, patch: Partial<GoalListItem>) =>
    persist({
      ...data,
      [data.activeTab]: activeList.map(item =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });

  const deleteItem = (id: string) =>
    persist({ ...data, [data.activeTab]: activeList.filter(item => item.id !== id) });

  const reorderItems = (items: GoalListItem[]) =>
    persist({ ...data, [data.activeTab]: items });

  const addGoal = () => {
    const text = newText.trim();
    if (!text) return;
    const goal: GoalItem = {
      id: `goal-${Date.now()}`,
      type: 'goal',
      text,
      color: DEFAULT_GOAL_COLOR,
    };
    persist({ ...data, [data.activeTab]: [...activeList, goal] });
    setNewText('');
  };

  const addHeader = () => {
    const header: GoalHeader = {
      id: `header-${Date.now()}`,
      type: 'header',
      text: '',
      color: GOAL_COLORS[0].value,
    };
    persist({ ...data, [data.activeTab]: [...activeList, header] });
  };

  const setTab = (tab: GoalTab) => {
    setNewText('');
    persist({ ...data, activeTab: tab });
  };

  const goalCount = activeList.filter(i => i.type === 'goal').length;

  return (
    <div
      className="rounded-2xl border border-indigo-200 dark:border-indigo-800/40 bg-white dark:bg-slate-800 shadow-sm overflow-hidden mb-6"
      dir="rtl"
    >
      {/* Header bar */}
      <div className="bg-gradient-to-l from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/10 px-4 py-2.5 border-b border-indigo-200 dark:border-indigo-800/40 flex items-center justify-between">
        <h2 className="font-bold text-sm text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
          🧭 מטרות
        </h2>
        {goalCount > 0 && (
          <span className="text-xs text-indigo-400 dark:text-indigo-500 tabular-nums">
            {goalCount} מטרות
          </span>
        )}
      </div>

      {/* Tab strip */}
      <div className="flex border-b border-gray-100 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/60">
        {TABS.map(tab => {
          const active = data.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all border-b-2 ${
                active
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/40'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-4">
        <GoalList
          items={activeList}
          onUpdate={updateItem}
          onDelete={deleteItem}
          onReorder={reorderItems}
          onAddGoal={addGoal}
          onAddHeader={addHeader}
          newText={newText}
          onNewTextChange={setNewText}
        />
      </div>
    </div>
  );
}

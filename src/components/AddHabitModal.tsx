import { useState } from 'react';

interface Props {
  onAdd: (name: string, type: 'binary' | 'numeric', goal: number | null) => void;
  onClose: () => void;
}

export function AddHabitModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'binary' | 'numeric'>('binary');
  const [goalStr, setGoalStr] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const goal = goalStr.trim() ? Number(goalStr) : null;
    onAdd(name.trim(), type, goal && goal > 0 ? goal : null);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">הוסף הרגל חדש</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">שם ההרגל</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="לדוגמה: לשתות מים"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">סוג</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'binary' | 'numeric')}
              className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="binary">בינארי (כן/לא)</option>
              <option value="numeric">מספרי (כמות)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">יעד (אופציונלי)</label>
            <input
              type="number"
              min="1"
              value={goalStr}
              onChange={(e) => setGoalStr(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder={type === 'binary' ? 'מספר ימים' : 'ממוצע יעד'}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 text-sm font-medium"
            >
              הוסף
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

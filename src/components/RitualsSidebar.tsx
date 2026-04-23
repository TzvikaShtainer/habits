import { useState } from 'react';
import { useRituals } from '../hooks/useRituals';
import { DAYS_HE } from '../utils/weekUtils';

interface Props {
  weekId: string;
}

const COLOR_STYLES = {
  orange: {
    border: 'border-orange-500/40',
    title: 'text-orange-400 dark:text-orange-400',
  },
  purple: {
    border: 'border-purple-500/40',
    title: 'text-purple-400 dark:text-purple-400',
  },
  green: {
    border: 'border-green-500/40',
    title: 'text-green-400 dark:text-green-400',
  },
};

export function RitualsSidebar({ weekId }: Props) {
  const { sections, updateQuestion, setAnswer, getAnswer } = useRituals();
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [activeDay, setActiveDay] = useState(() => new Date().getDay());

  return (
    <div className="sticky top-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-slate-100 text-sm">📿 טקסים יומיים</h2>
        <button
          onClick={() => setEditingTemplate(v => !v)}
          className={`p-1.5 rounded-lg text-sm transition-colors ${
            editingTemplate
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
          title="ערוך תבנית שאלות"
        >
          ✏️
        </button>
      </div>

      {/* Day tabs */}
      <div className="flex flex-wrap gap-1">
        {DAYS_HE.map((day, i) => (
          <button
            key={i}
            onClick={() => setActiveDay(i)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              activeDay === i
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Sections */}
      {sections.map(section => {
        const styles = COLOR_STYLES[section.color];
        const hasFilledQuestions = section.questions.some(q => q.text.trim());

        return (
          <div
            key={section.id}
            className={`rounded-xl border-2 ${styles.border} bg-white dark:bg-slate-800 shadow-sm p-3`}
          >
            <h3 className={`font-semibold text-sm mb-2 ${styles.title}`}>{section.title}</h3>

            {!editingTemplate && !hasFilledQuestions ? (
              <p className="text-xs text-gray-400 dark:text-slate-500 italic">לחץ ✏️ להוספת שאלות</p>
            ) : (
              <div className="flex flex-col gap-3">
                {section.questions.map(q => {
                  const showQuestion = editingTemplate || q.text.trim();
                  if (!showQuestion) return null;
                  return (
                    <div key={q.id} className="flex flex-col gap-1">
                      {editingTemplate ? (
                        <input
                          type="text"
                          value={q.text}
                          onChange={e => updateQuestion(section.id, q.id, e.target.value)}
                          placeholder="הוסף שאלה..."
                          className="text-xs font-medium text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          style={{ direction: 'rtl' }}
                        />
                      ) : (
                        <label className="text-xs font-medium text-gray-600 dark:text-slate-400">
                          {q.text}
                        </label>
                      )}
                      <textarea
                        value={getAnswer(weekId, activeDay, q.id)}
                        onChange={e => setAnswer(weekId, activeDay, q.id, e.target.value)}
                        rows={2}
                        placeholder="..."
                        className="w-full text-xs text-gray-800 dark:text-slate-200 bg-transparent border border-gray-200 dark:border-slate-600 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 leading-5"
                        style={{ direction: 'rtl' }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {section.affirmation && (
              <p className="mt-3 text-xs italic text-gray-400 dark:text-slate-500 border-t border-gray-100 dark:border-slate-700 pt-2 leading-5">
                {section.affirmation}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

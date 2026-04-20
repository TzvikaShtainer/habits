import { useState, useEffect } from 'react';
import { DAYS_HE, formatDDMM, getWeekDayDates } from '../utils/weekUtils';

const TEMPLATE_KEY = 'habit-tracker-reflection-template';

const DEFAULT_TEMPLATE =
  'איך הגב והרגל מרגישים?\nהאם כאב היום? לכמה זמן ומה דרגת הכאב?\nמה הלך טוב היום? מה אתה גאה בו?';

function loadTemplate(): string {
  return localStorage.getItem(TEMPLATE_KEY) ?? DEFAULT_TEMPLATE;
}

interface Props {
  weekId: string;
  reflections: Record<string, string>;
  onSave: (weekId: string, dayIndex: number, text: string) => void;
}

export function DailyReflection({ weekId, reflections, onSave }: Props) {
  const [activeDay, setActiveDay] = useState(0);
  const [template, setTemplate] = useState(loadTemplate);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [draftTemplate, setDraftTemplate] = useState('');

  useEffect(() => {
    localStorage.setItem(TEMPLATE_KEY, template);
  }, [template]);

  function openTemplateEditor() {
    setDraftTemplate(template);
    setEditingTemplate(true);
  }

  function saveTemplate() {
    setTemplate(draftTemplate);
    setEditingTemplate(false);
  }

  const dayDates = getWeekDayDates(weekId);
  const key = `${weekId}-${activeDay}`;
  const text = reflections[key] ?? '';

  return (
    <>
      <div className="mt-6 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-semibold text-gray-800 dark:text-slate-100 text-base flex-1">
              📓 רפלקציה יומית
            </h2>
            <button
              onClick={openTemplateEditor}
              className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title="ערוך תבנית שאלות"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          </div>
          {/* Day tabs */}
          <div className="flex gap-1 flex-wrap">
            {DAYS_HE.map((day, i) => (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  activeDay === i
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {day} <span dir="ltr" className="text-xs opacity-75">({formatDDMM(dayDates[i])})</span>
                {reflections[`${weekId}-${i}`] && (
                  <span className="ms-1 inline-block w-1.5 h-1.5 rounded-full bg-green-400 align-middle" />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">
          <textarea
            value={text}
            onChange={(e) => onSave(weekId, activeDay, e.target.value)}
            placeholder={template}
            rows={5}
            className="w-full text-sm text-gray-800 dark:text-slate-200 bg-transparent placeholder-gray-400 dark:placeholder-slate-500 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 leading-6"
            style={{ direction: 'rtl' }}
          />
        </div>
      </div>

      {/* Template editor modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-base font-semibold text-gray-800 dark:text-slate-100 mb-1">
              עריכת תבנית שאלות
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
              התבנית תופיע כ-placeholder בכל יום חדש
            </p>
            <textarea
              autoFocus
              value={draftTemplate}
              onChange={(e) => setDraftTemplate(e.target.value)}
              rows={6}
              className="w-full text-sm text-gray-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 leading-6"
              style={{ direction: 'rtl' }}
            />
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setEditingTemplate(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium"
              >
                ביטול
              </button>
              <button
                onClick={saveTemplate}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 text-sm font-medium"
              >
                שמור תבנית
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

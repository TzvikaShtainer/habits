import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'habit-tracker-affirmations';

const DEFAULT_TEXT = '';

function load(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_TEXT;
}

export function Affirmations() {
  const [text, setText] = useState(load);
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, text);
  }, [text]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  function commit() {
    setEditing(false);
  }

  const lines = text.split('\n');
  const lastIndex = lines.length - 1;

  return (
    <div className="mb-8 text-center">
      {editing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Escape') commit(); }}
          rows={lines.length + 1}
          className="w-full max-w-2xl mx-auto block text-center text-lg leading-8 bg-transparent border border-dashed border-gray-300 dark:border-slate-600 rounded-xl px-4 py-3 outline-none resize-none focus:border-orange-300 dark:text-slate-200"
          style={{ direction: 'rtl' }}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="cursor-pointer group inline-block max-w-2xl w-full px-4 py-3 rounded-xl hover:bg-orange-50/50 dark:hover:bg-slate-800/50 transition-colors"
          title="לחץ לעריכה"
        >
          {lines.map((line, i) => (
            <p
              key={i}
              className={`leading-8 text-lg ${
                i === lastIndex ? 'font-bold text-xl' : 'text-gray-700 dark:text-slate-300'
              }`}
              style={i === lastIndex ? { color: '#ff8c61' } : undefined}
            >
              {line || '\u00A0'}
            </p>
          ))}
          <span className="text-xs text-gray-300 dark:text-slate-600 group-hover:text-gray-400 mt-1 block">
            לחץ לעריכה
          </span>
        </div>
      )}
    </div>
  );
}

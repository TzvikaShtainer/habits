import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface JournalEntry {
  text: string;
  mood: number;   // 0 = unset, 1–5
  energy: number;
  stress: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'journal-';

const HEB_DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

const HEB_DAYS_LONG = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const HEB_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

const PLACEHOLDERS = [
  'מה קרה היום?',
  'מה למדת היום?',
  'על מה אתה גאה היום?',
  'מה הרגשת היום?',
  'מה היה הרגע הטוב ביותר?',
  'מה תרצה לזכור מהיום?',
  'מה אתגר אותך היום?',
  'מה הצליח לך היום?',
  'מה תעשה אחרת מחר?',
];

const STATUS_CONFIG = [
  { key: 'mood'   as const, label: 'מצב רוח', icon: '😊', color: '#f59e0b' },
  { key: 'energy' as const, label: 'אנרגיה',  icon: '⚡',  color: '#3b82f6' },
  { key: 'stress' as const, label: 'לחץ',     icon: '🌊',  color: '#8b5cf6' },
] as const;

const EMPTY_ENTRY: JournalEntry = { text: '', mood: 0, energy: 0, stress: 0 };

// ── Date helpers ──────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday = 0
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function hebDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `יום ${HEB_DAYS_LONG[date.getDay()]}, ${d} ${HEB_MONTHS[m - 1]}`;
}

// ── Persistence ───────────────────────────────────────────────────────────────

function loadEntry(dateStr: string): JournalEntry {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + dateStr);
    if (!raw) return { ...EMPTY_ENTRY };
    return { ...EMPTY_ENTRY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_ENTRY };
  }
}

function saveEntry(dateStr: string, entry: JournalEntry) {
  if (entry.text.trim() || entry.mood || entry.energy || entry.stress) {
    localStorage.setItem(STORAGE_PREFIX + dateStr, JSON.stringify(entry));
  } else {
    localStorage.removeItem(STORAGE_PREFIX + dateStr);
  }
}

function dateHasEntry(dateStr: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + dateStr);
    if (!raw) return false;
    const e: JournalEntry = JSON.parse(raw);
    return !!(e.text?.trim() || e.mood || e.energy || e.stress);
  } catch {
    return false;
  }
}

// ── Status dots ───────────────────────────────────────────────────────────────

interface StatusDotsProps {
  value: number;
  color: string;
  onChange: (v: number) => void;
}

function StatusDots({ value, color, onChange }: StatusDotsProps) {
  return (
    <div className="flex gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(value === n ? 0 : n)}
          className="w-5 h-5 rounded-full border-2 transition-all hover:scale-110 active:scale-95 flex-shrink-0"
          style={{
            borderColor: color,
            backgroundColor: n <= value ? color : 'transparent',
          }}
          aria-label={`${n}`}
          title={`${n}`}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DailyJournal() {
  const today = formatDate(new Date());

  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [entry, setEntry] = useState<JournalEntry>(() => loadEntry(today));
  const [placeholder] = useState(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]
  );

  // Load entry when date changes
  useEffect(() => {
    setEntry(loadEntry(selectedDate));
  }, [selectedDate]);

  // Save to localStorage immediately inside the updater so we never race
  // between selectedDate and entry effects.
  const updateEntry = useCallback(
    (patch: Partial<JournalEntry>, dateStr = selectedDate) => {
      setEntry(prev => {
        const next = { ...prev, ...patch };
        saveEntry(dateStr, next);
        return next;
      });
    },
    [selectedDate],
  );

  const selectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const goToToday = () => {
    setSelectedDate(today);
    setWeekStart(getWeekStart(new Date()));
  };

  const navigate = (dir: -1 | 1) => {
    setWeekStart(prev => addDays(prev, dir * 7));
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // For the current selected date, use live in-memory state for the dot;
  // for other dates read localStorage directly.
  const entryDots = weekDays.map(day => {
    const dateStr = formatDate(day);
    if (dateStr === selectedDate) {
      return !!(entry.text.trim() || entry.mood || entry.energy || entry.stress);
    }
    return dateHasEntry(dateStr);
  });

  const isToday = selectedDate === today;

  return (
    <div
      className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-slate-800 shadow-sm overflow-hidden mb-6"
      dir="rtl"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-l from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 px-4 py-2.5 border-b border-amber-200 dark:border-amber-800/40 flex items-center justify-between">
        <h2 className="font-bold text-sm text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
          📔 יומן יומי
        </h2>
        {!isToday && (
          <button
            onClick={goToToday}
            className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 font-medium transition-colors px-2 py-0.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30"
          >
            חזור להיום
          </button>
        )}
      </div>

      {/* ── Date strip ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-0.5 px-1.5 py-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/60"
        dir="ltr"
      >
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 text-base leading-none"
          aria-label="שבוע קודם"
        >
          ‹
        </button>

        <div className="flex flex-1 gap-0.5">
          {weekDays.map((day, i) => {
            const dateStr = formatDate(day);
            const isSelected = dateStr === selectedDate;
            const isTod = dateStr === today;
            const hasDot = entryDots[i];

            return (
              <button
                key={dateStr}
                onClick={() => selectDate(dateStr)}
                className={`flex flex-col items-center py-1.5 px-0.5 rounded-lg transition-all flex-1 ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow'
                    : isTod
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <span
                  className={`text-[8px] leading-none mb-0.5 font-medium ${isSelected ? 'opacity-80' : 'opacity-50'}`}
                >
                  {HEB_DAYS_SHORT[day.getDay()]}
                </span>
                <span className="text-xs font-bold leading-none">{day.getDate()}</span>
                <span
                  className="h-1 w-1 rounded-full mt-0.5"
                  style={{
                    backgroundColor: hasDot
                      ? isSelected
                        ? 'rgba(255,255,255,0.75)'
                        : '#f59e0b'
                      : 'transparent',
                  }}
                />
              </button>
            );
          })}
        </div>

        <button
          onClick={() => navigate(1)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 text-base leading-none"
          aria-label="שבוע הבא"
        >
          ›
        </button>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="p-3 flex flex-col gap-3">

        {/* Selected date label */}
        <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
          {hebDateLabel(selectedDate)}
        </p>

        {/* Status rows */}
        <div className="flex flex-col gap-2">
          {STATUS_CONFIG.map(cfg => (
            <div key={cfg.key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 whitespace-nowrap">
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
              </span>
              <StatusDots
                value={entry[cfg.key]}
                color={cfg.color}
                onChange={v => updateEntry({ [cfg.key]: v })}
              />
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 dark:border-slate-700" />

        {/* Journal textarea */}
        <textarea
          value={entry.text}
          onChange={e => updateEntry({ text: e.target.value })}
          placeholder={placeholder}
          dir="rtl"
          rows={6}
          className="w-full text-sm bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-gray-300 dark:placeholder:text-slate-600 text-gray-800 dark:text-slate-100 resize-none leading-relaxed"
        />
      </div>
    </div>
  );
}

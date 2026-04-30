import React, { useCallback, useEffect, useRef } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { View, NavigateAction } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { he } from 'date-fns/locale';
import type { CalendarEvent } from '../hooks/useGoogleCalendar';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

const locales = { he };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,
});

const MESSAGES = {
  allDay: 'כל היום',
  previous: '‹',
  next: '›',
  today: 'היום',
  month: 'חודש',
  week: 'שבוע',
  day: 'יום',
  agenda: 'סדר יום',
  date: 'תאריך',
  time: 'שעה',
  event: 'אירוע',
  noEventsInRange: 'אין אירועים בטווח זה',
  showMore: (n: number) => `+ עוד ${n}`,
};

const FORMATS = {
  dayFormat: (date: Date) => format(date, 'EEEE d/M', { locale: he }),
  weekdayFormat: (date: Date) => format(date, 'EEEE', { locale: he }),
  monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy', { locale: he }),
  dayHeaderFormat: (date: Date) => format(date, 'EEEE, d בMMMM', { locale: he }),
  agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${format(start, 'd/M/yyyy', { locale: he })} – ${format(end, 'd/M/yyyy', { locale: he })}`,
  timeGutterFormat: (date: Date) => format(date, 'HH:mm', { locale: he }),
  eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
};

interface Props {
  view: 'week' | 'month';
  completionByDate?: Record<string, number>; // ISO date → 0-100
}

function GoogleSignIn({ onSignIn, error }: { onSignIn: () => void; error: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-16">
      <div className="text-6xl">📅</div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">
          התחבר ל-Google Calendar
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs">
          כדי לראות את האירועים שלך, התחבר עם חשבון Google.
        </p>
      </div>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300 max-w-sm text-center">
          {error}
        </div>
      )}
      <button
        onClick={onSignIn}
        className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl shadow-sm hover:shadow-md text-gray-700 dark:text-slate-200 font-medium transition-all hover:bg-gray-50 dark:hover:bg-slate-600"
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
          <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.1 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.5 6.3 14.7z"/>
          <path fill="#FBBC05" d="M24 46c5.5 0 10.5-1.8 14.4-5l-6.7-5.5C29.7 37 27 38 24 38c-6 0-11-4-12.7-9.5l-7 5.4C7.8 42 15.4 46 24 46z"/>
          <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.8-2.8 5.1-5.3 6.7l6.7 5.5C41.5 37.3 45 31.2 45 24c0-1.3-.2-2.7-.5-4z"/>
        </svg>
        כניסה עם Google
      </button>
    </div>
  );
}

interface ToolbarProps {
  label: string;
  onNavigate: (action: NavigateAction) => void;
  onViewChange: (view: View) => void;
  currentView: View;
  onSignOut: () => void;
}

function CustomToolbar({ label, onNavigate, onSignOut }: ToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onNavigate('PREV')}
          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm"
        >
          ›
        </button>
        <button
          onClick={() => onNavigate('TODAY')}
          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm"
        >
          היום
        </button>
        <button
          onClick={() => onNavigate('NEXT')}
          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm"
        >
          ‹
        </button>
      </div>
      <span className="font-semibold text-gray-800 dark:text-slate-100 text-base">{label}</span>
      <button
        onClick={onSignOut}
        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      >
        התנתק
      </button>
    </div>
  );
}

export function CalendarView({ view, completionByDate = {} }: Props) {
  const { token, events, loading, error, signIn, signOut, fetchEvents } = useGoogleCalendar();
  const dateRef = useRef(new Date());

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      if (Array.isArray(range)) {
        fetchEvents(range[0], range[range.length - 1]);
      } else {
        fetchEvents(range.start, range.end);
      }
    },
    [fetchEvents],
  );

  useEffect(() => {
    if (!token) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    fetchEvents(start, end);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const dayPropGetter = useCallback(
    (date: Date) => {
      const key = date.toISOString().split('T')[0];
      const pct = completionByDate[key];
      if (pct === undefined) return {};
      const opacity = Math.round((pct / 100) * 40);
      return {
        style: {
          background: `rgba(34, 197, 94, ${opacity / 100})`,
        },
      };
    },
    [completionByDate],
  );

  const eventStyleGetter = useCallback((_event: CalendarEvent) => ({
    style: {
      backgroundColor: '#3b82f6',
      border: 'none',
      borderRadius: '4px',
      color: 'white',
      fontSize: '12px',
    },
  }), []);

  if (!token) {
    return <GoogleSignIn onSignIn={signIn} error={error} />;
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {loading && (
        <div className="text-center text-sm text-gray-500 dark:text-slate-400 py-2">
          טוען אירועים...
        </div>
      )}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-700 dark:text-red-300 mb-2">
          {error}
        </div>
      )}
      <div className="flex-1 min-h-0 rbc-rtl-wrapper">
        <Calendar
          localizer={localizer}
          events={events}
          defaultDate={dateRef.current}
          view={view}
          onView={() => {}}
          culture="he"
          messages={MESSAGES}
          formats={FORMATS}
          dayPropGetter={dayPropGetter}
          eventPropGetter={eventStyleGetter}
          onRangeChange={handleRangeChange}
          style={{ height: '100%' }}
          components={{
            toolbar: (props) => (
              <CustomToolbar
                {...props}
                currentView={view}
                onViewChange={() => {}}
                onSignOut={signOut}
              />
            ),
          }}
        />
      </div>
    </div>
  );
}

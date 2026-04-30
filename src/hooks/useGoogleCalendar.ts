import { useState, useCallback, useEffect } from 'react';

const TOKEN_KEY = 'google-calendar-token';
const TOKEN_EXPIRY_KEY = 'google-calendar-token-expiry';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
}

interface GisTokenClient {
  requestAccessToken: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string; expires_in: string; error?: string }) => void;
          }) => GisTokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

function loadSavedToken(): string | null {
  try {
    const saved = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (saved && expiry && Date.now() < parseInt(expiry)) return saved;
  } catch {}
  return null;
}

export function useGoogleCalendar() {
  const [token, setToken] = useState<string | null>(loadSavedToken);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = useCallback(() => {
    const t = token;
    if (t && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(t);
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    setToken(null);
    setEvents([]);
    setError(null);
  }, [token]);

  const signIn = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      setError('Google Client ID לא מוגדר. הגדר VITE_GOOGLE_CLIENT_ID בקובץ .env');
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      setError('ספריית Google לא נטענה. בדוק את חיבור האינטרנט.');
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      callback: (response) => {
        if (response.error) {
          setError(`שגיאת כניסה: ${response.error}`);
          return;
        }
        const expiresMs = parseInt(response.expires_in) * 1000;
        localStorage.setItem(TOKEN_KEY, response.access_token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresMs));
        setToken(response.access_token);
        setError(null);
      },
    });
    client.requestAccessToken();
  }, []);

  const fetchEvents = useCallback(async (start: Date, end: Date) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '200',
      });
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        if (res.status === 401) {
          signOut();
          setError('פג תוקף הכניסה. אנא התחבר מחדש.');
          return;
        }
        throw new Error(`שגיאת Calendar API: ${res.status}`);
      }
      const data = await res.json() as { items?: Array<{
        id: string;
        summary?: string;
        start: { dateTime?: string; date?: string };
        end: { dateTime?: string; date?: string };
      }> };
      const mapped: CalendarEvent[] = (data.items ?? []).map((item) => {
        const allDay = !item.start.dateTime;
        // For all-day events Google uses date strings (YYYY-MM-DD); parse at noon to avoid TZ issues
        const startDate = item.start.dateTime
          ? new Date(item.start.dateTime)
          : new Date(item.start.date! + 'T12:00:00');
        const endDate = item.end.dateTime
          ? new Date(item.end.dateTime)
          : new Date(item.end.date! + 'T12:00:00');
        return { id: item.id, title: item.summary ?? '(ללא שם)', start: startDate, end: endDate, allDay };
      });
      setEvents(mapped);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [token, signOut]);

  // Auto-fetch when token first becomes available (current month range)
  useEffect(() => {
    if (!token) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    fetchEvents(start, end);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return { token, events, loading, error, signIn, signOut, fetchEvents };
}

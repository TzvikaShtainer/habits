import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { flush, hydrate, pull } from '../lib/cloudSync';

type Phase = 'checking' | 'signed-out' | 'loading-data' | 'ready' | 'error';

function Centered({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" className="h-screen h-[100dvh] flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 font-sans">
      {children}
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === 'Invalid login credentials' ? 'מייל או סיסמה שגויים' : error.message);
  }

  return (
    <Centered>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 flex flex-col gap-4"
      >
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 text-center">📋 מעקב הרגלים</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 text-center -mt-2">התחבר כדי לסנכרן בין המכשירים</p>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="מייל"
          dir="ltr"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="סיסמה"
          dir="ltr"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-400"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium py-2"
        >
          {busy ? 'מתחבר…' : 'התחברות'}
        </button>
      </form>
    </Centered>
  );
}

/**
 * Without Supabase configured, renders the app as-is (local-only).
 * Otherwise requires login, loads the user's data into localStorage before the
 * app mounts, and remounts the app when another device changed something.
 */
export function AuthGate({ children }: { children: (dataVersion: number) => ReactNode }) {
  // undefined = still checking for a saved session
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [failedUserId, setFailedUserId] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load data once per signed-in user (token refreshes don't re-run this).
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    hydrate(userId)
      .then(() => { if (!cancelled) { setDataVersion(v => v + 1); setLoadedUserId(userId); } })
      .catch(err => { console.error('[sync] initial load failed', err); if (!cancelled) setFailedUserId(userId); });
    return () => { cancelled = true; };
  }, [userId]);

  const phase: Phase =
    !supabase ? 'ready'
    : session === undefined ? 'checking'
    : !userId ? 'signed-out'
    : failedUserId === userId ? 'error'
    : loadedUserId === userId ? 'ready'
    : 'loading-data';

  // Push on leave / reconnect, pull when coming back to the app.
  useEffect(() => {
    if (!supabase || phase !== 'ready') return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void flush();
      } else {
        pull().then(changed => { if (changed) setDataVersion(v => v + 1); });
      }
    };
    const onOnline = () => { void flush(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  }, [phase]);

  if (phase === 'ready') return <>{children(dataVersion)}</>;
  if (phase === 'signed-out') return <LoginScreen />;
  if (phase === 'error') {
    return (
      <Centered>
        <div className="text-center flex flex-col gap-3">
          <p className="text-gray-700 dark:text-slate-200">לא הצלחנו לטעון את הנתונים מהשרת.</p>
          <button onClick={() => location.reload()} className="rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2">
            נסה שוב
          </button>
        </div>
      </Centered>
    );
  }
  return (
    <Centered>
      <p className="text-gray-500 dark:text-slate-400">טוען…</p>
    </Centered>
  );
}

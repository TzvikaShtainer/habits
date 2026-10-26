import { useState, useEffect } from 'react';

export function SavedToast() {
  const [visible, setVisible] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => {
      setVisible(true);
      if (timer) clearTimeout(timer);
      const t = setTimeout(() => setVisible(false), 1800);
      setTimer(t);
    };
    window.addEventListener('habit-saved', handler);
    return () => window.removeEventListener('habit-saved', handler);
  }, [timer]);

  return (
    <div
      className={`fixed top-16 lg:top-auto lg:bottom-4 start-4 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <div className="bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
        ✓ נשמר
      </div>
    </div>
  );
}

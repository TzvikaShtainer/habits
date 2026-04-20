import { useState } from 'react';

function applyDark(next: boolean) {
  document.documentElement.classList.toggle('dark', next);
  localStorage.setItem('dark-mode', String(next));
}

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('dark-mode') === 'true';
    applyDark(saved);
    return saved;
  });

  function toggle() {
    setDark((d) => {
      applyDark(!d);
      return !d;
    });
  }

  return { dark, toggle };
}

import { useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'doc-key-theme-dark-mode';

export default function useThemePreference() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    const savedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedValue === null) {
      return true;
    }

    return savedValue === 'true';
  });

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, String(darkMode));
  }, [darkMode]);

  return [darkMode, setDarkMode] as const;
}
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type ThemeName, type ThemeColors, themes } from '../tokens';
import { getConfigValue, setConfigValue } from '../db/queries';

interface ThemeContextValue {
  theme: ThemeName;
  colors: ThemeColors;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  colors: themes.dark,
  setTheme: () => {},
});

const VALID_THEMES: ThemeName[] = ['dark', 'light', 'monochrome'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dark');

  useEffect(() => {
    const saved = getConfigValue('theme');
    if (saved && VALID_THEMES.includes(saved as ThemeName)) {
      setThemeState(saved as ThemeName);
    }
  }, []);

  const setTheme = (name: ThemeName) => {
    setThemeState(name);
    setConfigValue('theme', name);
  };

  return (
    <ThemeContext.Provider value={{ theme, colors: themes[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

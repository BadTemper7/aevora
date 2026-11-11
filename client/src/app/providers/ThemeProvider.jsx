import { useLayoutEffect } from "react";

import { THEME_COLORS } from "../config/constants";
import { useThemeStore } from "../../stores/themeStore";

/** Applies the chosen theme to <html data-theme>, and follows the OS in "system" mode. */
export default function ThemeProvider({ children }) {
  const theme = useThemeStore((state) => state.theme);
  const setResolvedTheme = useThemeStore((state) => state.setResolvedTheme);

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", THEME_COLORS[resolved]);
      setResolvedTheme(resolved);
    };

    apply();

    if (theme !== "system") return undefined;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, setResolvedTheme]);

  return children;
}

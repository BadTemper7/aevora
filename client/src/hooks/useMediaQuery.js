import { useSyncExternalStore } from "react";

/** Subscribes to a CSS media query, e.g. useMediaQuery("(min-width: 1024px)"). */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const usePrefersReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)");

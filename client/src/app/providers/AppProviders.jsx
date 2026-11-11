import QueryProvider from "./QueryProvider";
import ThemeProvider from "./ThemeProvider";

export default function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  );
}

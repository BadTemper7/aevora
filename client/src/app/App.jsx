import { RouterProvider } from "react-router-dom";

import ErrorBoundary from "../components/feedback/ErrorBoundary";
import AppProviders from "./providers/AppProviders";
import { router } from "./router";

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  );
}

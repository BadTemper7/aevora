import { Component } from "react";

import Button from "../ui/Button";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Aevora crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        className="grid min-h-dvh place-items-center bg-[#080b14] px-6 text-center text-[#edf0fa]"
      >
        <div>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#98a2bd]">
            Aevora hit an unexpected error. Reload the page to try again.
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    );
  }
}

import { Component } from "react";

/** Show a recovery action inside the Community screen if a settings form fails. */
export default class CommunitySettingsBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Community settings failed to render:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="custom-scrollbar w-full overflow-y-auto p-4 sm:p-6">
        <div className="rounded-2xl border border-danger/30 bg-surface p-5">
          <h2 className="text-base font-bold text-ink">Community settings could not load</h2>
          <p className="mt-2 text-sm text-ink-soft">The settings panel encountered an error. Your community images have not been changed.</p>
          <button
            type="button"
            className="mt-4 min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-on-brand"
            onClick={() => this.setState({ failed: false })}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

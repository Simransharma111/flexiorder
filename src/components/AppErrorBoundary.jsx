import { Component } from "react";

export default class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Application route failed to load", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-6 text-ink">
        <div className="w-full max-w-md rounded-panel border border-hairline bg-white p-8 text-center shadow-card">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-card bg-brand text-lg font-extrabold text-white">
            F
          </span>
          <h1 className="mt-5 text-xl font-extrabold tracking-tight">FlexiOrder could not open this screen</h1>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Check your connection, then reload to use the latest version.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 min-h-11 rounded-card bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-strong"
          >
            Reload app
          </button>
        </div>
      </main>
    );
  }
}

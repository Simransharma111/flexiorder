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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-bold">FlexiOrder could not open this screen</h1>
          <p className="mt-2 text-sm text-slate-300">
            Check your connection, then reload to use the latest version.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
          >
            Reload app
          </button>
        </div>
      </main>
    );
  }
}

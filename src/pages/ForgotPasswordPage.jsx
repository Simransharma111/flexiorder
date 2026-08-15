import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiMail } from "react-icons/fi";
import api from "../api/axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post(
        "/auth/forgot-password",
        {
          email: email.trim().toLowerCase(),
        }
      );

      setMessage(
        res.data?.message ||
          "Password reset link has been sent."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to process request"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-ink">
      <div className="w-full max-w-md">

        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-ink-secondary transition hover:text-ink"
        >
          <FiArrowLeft aria-hidden="true" />
          Back to login
        </Link>

        <div className="rounded-panel border border-hairline bg-white p-6 shadow-card sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-card bg-brand-light text-brand">
            <FiMail size={22} aria-hidden="true" />
          </span>

          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
            Reset your password
          </h1>

          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Enter your account email and we'll send a reset link.
          </p>

          {message ? (
            <p
              role="status"
              className="mt-6 rounded-card border border-status-ready-line/40 bg-status-ready-surface px-3.5 py-3 text-sm font-semibold text-status-ready-ink"
            >
              {message}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              {error && (
                <p
                  role="alert"
                  className="rounded-card border border-status-delayed-line/40 bg-status-delayed-surface px-3.5 py-2.5 text-sm font-semibold text-status-delayed-ink"
                >
                  {error}
                </p>
              )}

              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="email"
                inputMode="email"
                disabled={loading}
                className="w-full rounded-card border border-hairline bg-white px-4 py-3.5 text-[15px] text-ink placeholder:text-ink-disabled focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={loading}
                className="min-h-12 w-full rounded-card bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

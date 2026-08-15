import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  FiLock,
  FiCheckCircle,
  FiArrowLeft,
} from "react-icons/fi";

import api from "../api/axios";

const inputClass =
  "w-full rounded-card border border-hairline bg-white px-4 py-3.5 text-[15px] text-ink placeholder:text-ink-disabled focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!token) {
      setError("Invalid password reset link");
      return;
    }

    if (!password || !confirmPassword) {
      setError(
        "Please enter your new password"
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters"
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      await api.post(
        `/auth/reset-password/${token}`,
        {
          password,
        }
      );

      setSuccess(true);

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset password"
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

          {success ? (
            <div className="py-4 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-status-ready-surface text-status-ready-line">
                <FiCheckCircle size={26} aria-hidden="true" />
              </span>

              <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
                Password updated
              </h1>

              <p className="mt-2 text-sm text-ink-secondary">
                Taking you to login…
              </p>
            </div>
          ) : (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-card bg-brand-light text-brand">
                <FiLock size={22} aria-hidden="true" />
              </span>

              <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
                Create new password
              </h1>

              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                Choose a new password for your FlexiOrder account.
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-6 space-y-4"
                noValidate
              >
                {error && (
                  <p
                    role="alert"
                    className="rounded-card border border-status-delayed-line/40 bg-status-delayed-surface px-3.5 py-2.5 text-sm font-semibold text-status-delayed-ink"
                  >
                    {error}
                  </p>
                )}

                <input
                  type="password"
                  placeholder="New Password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  disabled={loading}
                  className={inputClass}
                />

                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  autoComplete="new-password"
                  disabled={loading}
                  className={inputClass}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="min-h-12 w-full rounded-card bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Resetting..."
                    : "Reset Password"}
                </button>
              </form>
            </>
          )}

        </div>

      </div>
    </div>
  );
}

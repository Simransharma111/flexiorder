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
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-10 relative overflow-hidden">

      <div className="absolute top-0 left-0 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[150px]" />

      <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-cyan-500/20 blur-[150px]" />

      <div className="relative w-full max-w-md">

        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition"
        >
          <FiArrowLeft />
          Back to Login
        </Link>

        <div className="w-full rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">

          <div className="text-center">

            <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-2xl">
              <FiLock />
            </div>

            <h1 className="text-3xl font-bold mt-6">
              Create New Password
            </h1>

            <p className="mt-3 text-slate-400">
              Enter your new FlexiOrder password.
            </p>

          </div>

          {success ? (

            <div className="mt-8 text-center">

              <FiCheckCircle className="mx-auto text-green-400 text-5xl" />

              <h2 className="mt-4 text-xl font-bold">
                Password Reset Successfully
              </h2>

              <p className="mt-2 text-slate-400">
                Redirecting you to login...
              </p>

            </div>

          ) : (

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >

              <input
                type="password"
                placeholder="New Password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="new-password"
                className="w-full rounded-2xl bg-slate-900/70 border border-white/10 px-5 py-4 outline-none focus:border-blue-500 transition"
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
                className="w-full rounded-2xl bg-slate-900/70 border border-white/10 px-5 py-4 outline-none focus:border-blue-500 transition"
              />

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 p-4 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Resetting..."
                  : "Reset Password"}
              </button>

            </form>

          )}

        </div>

      </div>
    </div>
  );
}

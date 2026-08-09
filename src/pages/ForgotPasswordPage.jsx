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

        <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">

          <div className="text-center">

            <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-2xl">
              <FiMail />
            </div>

            <h1 className="text-3xl font-bold mt-6">
              Forgot Password?
            </h1>

            <p className="mt-3 text-slate-400">
              Enter your email and we'll send you a
              password reset link.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              autoComplete="email"
              className="w-full rounded-2xl bg-slate-900/70 border border-white/10 px-5 py-4 outline-none focus:border-blue-500 transition"
            />

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 p-4 text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 p-4 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Sending..."
                : "Send Reset Link"}
            </button>

          </form>

        </div>

      </div>
    </div>
  );
}

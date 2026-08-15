import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLock } from "react-icons/fi";

import api from "../api/axios";

const inputClass =
  "w-full rounded-card border border-hairline bg-white px-4 py-3.5 text-[15px] text-ink placeholder:text-ink-disabled focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60";

export default function ChangePassword() {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const handleChange = (e) => {
    if (error) setError("");

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      formData.newPassword !==
      formData.confirmPassword
    ) {
      setError("New passwords do not match");
      return;
    }

    try {
      setLoading(true);

      await api.post(
        "/auth/change-password",
        {
          oldPassword:
            formData.oldPassword,

          newPassword:
            formData.newPassword,
        }
      );

      // After password change go to hotel setup

      navigate(
        "/setup-hotel"
      );
    } catch (err) {
      console.log(err);

      setError(
        err.response?.data?.message ||
        "Password change failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-ink">
      <div className="w-full max-w-md rounded-panel border border-hairline bg-white p-6 shadow-card sm:p-8">

        <span className="grid h-12 w-12 place-items-center rounded-card bg-brand-light text-brand">
          <FiLock size={22} aria-hidden="true" />
        </span>

        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
          Change password
        </h1>

        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          Change your temporary password before continuing.
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
            name="oldPassword"
            placeholder="Temporary Password"
            value={formData.oldPassword}
            onChange={handleChange}
            autoComplete="current-password"
            disabled={loading}
            className={inputClass}
          />

          <input
            type="password"
            name="newPassword"
            placeholder="New Password"
            value={formData.newPassword}
            onChange={handleChange}
            autoComplete="new-password"
            disabled={loading}
            className={inputClass}
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            disabled={loading}
            className={inputClass}
          />

          <button
            disabled={loading}
            className="min-h-12 w-full rounded-card bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Changing..."
              : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

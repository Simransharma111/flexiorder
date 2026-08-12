import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiGrid,
  FiSmartphone,
  FiUsers,
} from "react-icons/fi";

import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { initFCM } from "../utils/fcmPush";
import { getPostLoginPath } from "../constants/roles";
import { normalizeRole } from "../utils/access";

export default function AuthPage({ mode = "login" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const isRegister = mode === "register";

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    document.title = isRegister
      ? "Create Account | FlexiOrder"
      : "Login | FlexiOrder";
  }, [isRegister]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const email = formData.email.trim();
    const password = formData.password;

    if (!email) {
      alert("Please enter your email address.");
      return;
    }

    if (!password) {
      alert("Please enter your password.");
      return;
    }

    if (isRegister) {
      if (!formData.name.trim()) {
        alert("Please enter your name.");
        return;
      }

      if (password !== formData.confirmPassword) {
        alert("Passwords do not match.");
        return;
      }
    }

    try {
      setLoading(true);

      const endpoint = isRegister
        ? "/auth/register"
        : "/auth/login";

      const payload = isRegister
        ? {
            name: formData.name.trim(),
            email,
            password,
          }
        : {
            email,
            password,
          };

      const res = await api.post(
        endpoint,
        payload,
        {
          skipAuth: true,
        }
      );

      const user = res.data?.user;
      const token = res.data?.token;

      if (!user || !token) {
        throw new Error(
          "Login response is missing the user session. Please try again."
        );
      }

      const sessionSaved = login(user, token);

      if (!sessionSaved) {
        throw new Error(
          "FlexiOrder could not keep you signed in on this device. Please free some storage and try again."
        );
      }

      /*
       * REGISTRATION
       *
       * New owners must complete hotel setup.
       */
      if (isRegister) {
        navigate("/setup-hotel", {
          replace: true,
        });

        return;
      }

      /*
       * PASSWORD CHANGE
       */
      if (res.data?.mustChangePassword) {
        navigate("/change-password", {
          replace: true,
        });

        return;
      }

      /*
       * OWNER HOTEL SETUP
       */
      if (
        normalizeRole(user.role) === "owner" &&
        !res.data?.hotelSetupCompleted
      ) {
        navigate("/setup-hotel", {
          replace: true,
        });

        return;
      }

      /*
       * IMPORTANT:
       *
       * Do NOT wait for FCM before navigating.
       *
       * Login should complete immediately on mobile.
       * FCM can initialize in the background.
       */
      initFCM(api).catch((err) => {
        console.warn(
          "FCM initialization failed after login:",
          err
        );
      });

      /*
       * NORMAL POST-LOGIN ROUTING
       */
      const postLoginPath = getPostLoginPath(
        user.role,
        location.state?.from
      );

      navigate(postLoginPath, {
        replace: true,
      });
    } catch (err) {
      console.error("Authentication error:", err);

      let message = "Something went wrong. Please try again.";

      if (err.response) {
        message =
          err.response.data?.message ||
          err.response.data?.error ||
          `Request failed with status ${err.response.status}.`;
      } else if (err.request) {
        message =
          "Unable to reach FlexiOrder. Please check your internet connection and try again.";
      } else if (err.message) {
        message = err.message;
      }

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 sm:px-6 py-8 sm:py-10 relative overflow-hidden">

      {/* Background */}
      <div className="absolute top-0 left-0 h-[350px] w-[350px] sm:h-[500px] sm:w-[500px] rounded-full bg-blue-600/20 blur-[120px] sm:blur-[150px]" />

      <div className="absolute bottom-0 right-0 h-[350px] w-[350px] sm:h-[500px] sm:w-[500px] rounded-full bg-cyan-500/20 blur-[120px] sm:blur-[150px]" />

      <div className="relative grid max-w-6xl w-full gap-8 lg:gap-10 lg:grid-cols-2 items-center">

        {/* LEFT BRAND AREA */}
        <div className="hidden lg:block">

          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-blue-300">
            <FiCheckCircle />
            Trusted by modern restaurants
          </div>

          <h1 className="mt-8 text-5xl xl:text-6xl font-black leading-tight">
            Run Your

            <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Restaurant Smarter
            </span>
          </h1>

          <p className="mt-6 text-lg text-slate-400 max-w-xl">
            FlexiOrder connects QR ordering,
            waiter ordering, kitchen display,
            staff management and analytics
            into one powerful platform.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">

            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <FiSmartphone className="text-blue-400 text-2xl" />

              <p className="mt-3 font-semibold">
                QR Orders
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <FiUsers className="text-cyan-400 text-2xl" />

              <p className="mt-3 font-semibold">
                Staff
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <FiGrid className="text-indigo-400 text-2xl" />

              <p className="mt-3 font-semibold">
                Kitchen
              </p>
            </div>

          </div>
        </div>

        {/* AUTH CARD */}
        <div className="w-full max-w-xl mx-auto rounded-[28px] sm:rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-5 sm:p-8 shadow-2xl">

          {/* LOGO */}
          <div className="flex justify-center">

            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl overflow-hidden bg-white shadow-xl">

              <img
                src="/logo.jpg"
                alt="FlexiOrder Logo"
                className="h-full w-full object-contain"
              />

            </div>

          </div>

          {/* TITLE */}
          <h2 className="mt-5 sm:mt-6 text-center text-2xl sm:text-3xl font-bold">
            FlexiOrder
          </h2>

          <p className="text-center mt-2 text-sm sm:text-base text-slate-400">
            {isRegister
              ? "Start your free trial today"
              : "Welcome back to your dashboard"}
          </p>

          {/* LOGIN / REGISTER SWITCH */}
          <div className="mt-6 sm:mt-8 flex rounded-2xl bg-black/20 p-1">

            <Link
              to="/login"
              className={`flex-1 rounded-xl py-3 text-center font-semibold transition ${
                !isRegister
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Login
            </Link>

            <Link
              to="/register"
              className={`flex-1 rounded-xl py-3 text-center font-semibold transition ${
                isRegister
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Register
            </Link>

          </div>

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="mt-6 sm:mt-8 space-y-4 sm:space-y-5"
          >

            {/* NAME */}
            {isRegister && (
              <input
                name="name"
                type="text"
                placeholder="Owner Name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                disabled={loading}
                className="w-full rounded-2xl bg-slate-900/70 border border-white/10 px-5 py-4 text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
              />
            )}

            {/* EMAIL */}
            <input
              name="email"
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              inputMode="email"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900/70 border border-white/10 px-5 py-4 text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />

            {/* PASSWORD */}
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              autoComplete={
                isRegister
                  ? "new-password"
                  : "current-password"
              }
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900/70 border border-white/10 px-5 py-4 text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />

            {/* CONFIRM PASSWORD */}
            {isRegister && (
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
                className="w-full rounded-2xl bg-slate-900/70 border border-white/10 px-5 py-4 text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
              />
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-base sm:text-lg hover:bg-blue-700 active:bg-blue-800 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Please wait...
                </>
              ) : isRegister ? (
                <>
                  Start Free Trial
                  <FiArrowRight />
                </>
              ) : (
                "Login"
              )}
            </button>

          </form>

        </div>
      </div>
    </div>
  );
}
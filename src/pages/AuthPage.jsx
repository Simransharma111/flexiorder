import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

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

export default function AuthPage({ mode = "login" }) {
  const navigate = useNavigate();
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      isRegister &&
      formData.password !== formData.confirmPassword
    ) {
      alert("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const endpoint = isRegister
        ? "/auth/register"
        : "/auth/login";

      const payload = isRegister
        ? {
            name: formData.name,
            email: formData.email,
            password: formData.password,
          }
        : {
            email: formData.email,
            password: formData.password,
          };

      const res = await api.post(endpoint, payload);

      login(res.data.user, res.data.token);

      // REGISTER
      if (isRegister) {
        navigate("/setup-hotel");
        return;
      }

      // FORCE PASSWORD CHANGE
      if (res.data.mustChangePassword) {
        navigate("/change-password");
        return;
      }

      // HOTEL SETUP
      if (
        res.data.user.role === "owner" &&
        !res.data.hotelSetupCompleted
      ) {
        navigate("/setup-hotel");
        return;
      }

      // FCM
      try {
        await initFCM(api);
      } catch (fcmError) {
        console.log("FCM initialization failed:", fcmError);
      }

      // ROLE REDIRECT
      switch (res.data.user.role) {
        case "superadmin":
          navigate("/superadmin");
          break;

        case "owner":
          navigate("/owner/dashboard");
          break;

        case "staff":
          navigate("/kitchen");
          break;

        default:
          navigate("/");
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-10 relative overflow-hidden">

      {/* BACKGROUND */}

      <div className="absolute top-0 left-0 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[150px]" />

      <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-cyan-500/20 blur-[150px]" />

      <div className="relative grid max-w-6xl w-full gap-10 lg:grid-cols-2 items-center">

        {/* LEFT BRAND AREA */}

        <div className="hidden lg:block">

          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-blue-300">
            <FiCheckCircle />
            Trusted by modern restaurants
          </div>

          <h1 className="mt-8 text-6xl font-black leading-tight">
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

        <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">

          <img
            src="/logo.jpg"
            alt="FlexiOrder Logo"
            className="h-24 w-full object-contain"
          />

          <h2 className="mt-6 text-center text-3xl font-bold">
            FlexiOrder
          </h2>

          <p className="text-center mt-2 text-slate-400">
            {isRegister
              ? "Start your free trial today"
              : "Welcome back to your dashboard"}
          </p>

          {/* LOGIN / REGISTER TABS */}

          <div className="mt-8 flex rounded-2xl bg-black/20 p-1">

            <Link
              to="/login"
              className={`flex-1 rounded-xl py-3 text-center font-semibold ${
                !isRegister
                  ? "bg-blue-600"
                  : "text-slate-400"
              }`}
            >
              Login
            </Link>

            <Link
              to="/register"
              className={`flex-1 rounded-xl py-3 text-center font-semibold ${
                isRegister
                  ? "bg-blue-600"
                  : "text-slate-400"
              }`}
            >
              Register
            </Link>

          </div>

          {/* FORM */}

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >

            {/* NAME */}

            {isRegister && (
              <input
                name="name"
                placeholder="Owner Name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-2xl bg-slate-900/70 border border-white/10 px-5 py-4 outline-none focus:border-blue-500"
              />
            )}

            {/* EMAIL */}

            <input
              name="email"
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-2xl bg-slate-900/70 border border-white/10 px-5 py-4 outline-none focus:border-blue-500"
            />

            {/* PASSWORD */}

            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full rounded-2xl bg-slate-900/70 border border-white/10 px-5 py-4 outline-none focus:border-blue-500"
            />

            {/* FORGOT PASSWORD */}

            {!isRegister && (
              <div className="flex justify-end -mt-2">
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-400 hover:text-blue-300 transition"
                >
                  Forgot Password?
                </Link>
              </div>
            )}

            {/* CONFIRM PASSWORD */}

            {isRegister && (
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full rounded-2xl bg-slate-900/70 border border-white/10 px-5 py-4 outline-none focus:border-blue-500"
              />
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                "Please wait..."
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
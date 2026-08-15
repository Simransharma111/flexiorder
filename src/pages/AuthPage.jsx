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
import { API_URL } from "../config/env";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../context/AuthContext";
import { getPostLoginPath } from "../constants/roles";
import { normalizeRole } from "../utils/access";

export default function AuthPage({ mode = "login" }) {
  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();

  const isRegister = mode === "register";

  const [loading, setLoading] = useState(false);

  const [formError, setFormError] = useState("");
  const [suggestLogin, setSuggestLogin] = useState(false);
  const [suggestReset, setSuggestReset] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // =====================================================
  // PAGE TITLE
  // =====================================================

  useEffect(() => {
    document.title = isRegister
      ? "Create Owner Account | FlexiOrder"
      : "Login | FlexiOrder";
  }, [isRegister]);

  // =====================================================
  // INPUT
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (formError) setFormError("");
    if (suggestLogin) setSuggestLogin(false);
    if (suggestReset) setSuggestReset(false);

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // AUTH REQUEST
  // =====================================================

  const makeAuthRequest = async (endpoint, payload) => {
    const nativeAuth =
      Capacitor.isNativePlatform() && API_URL;

    // ===================================================
    // NATIVE
    // ===================================================

    if (nativeAuth) {
      const response = await fetch(
        `${API_URL}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const body =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(
          body?.message ||
            `Request failed with status ${response.status}`
        );

        error.response = {
          status: response.status,
          data: body,
        };

        throw error;
      }

      return {
        data: body,
      };
    }

    // ===================================================
    // WEB
    // ===================================================

    try {
      return await api.post(
        endpoint,
        payload,
        {
          skipAuth: true,
        }
      );
    } catch (firstError) {
      /*
       * Do not retry actual HTTP errors.
       */

      if (
        !firstError?.request ||
        firstError?.response
      ) {
        throw firstError;
      }

      // Render cold start
      await new Promise((resolve) =>
        setTimeout(resolve, 1800)
      );

      try {
        return await api.post(
          endpoint,
          payload,
          {
            skipAuth: true,
          }
        );
      } catch (secondError) {
        if (
          !secondError?.request ||
          secondError?.response ||
          !API_URL
        ) {
          throw secondError;
        }

        // Final fetch fallback
        const response = await fetch(
          `${API_URL}${endpoint}`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const body =
          await response.json().catch(() => ({}));

        if (!response.ok) {
          const error = new Error(
            body?.message ||
              `Request failed with status ${response.status}`
          );

          error.response = {
            status: response.status,
            data: body,
          };

          throw error;
        }

        return {
          data: body,
        };
      }
    }
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const email =
      formData.email.trim().toLowerCase();

    const password =
      formData.password;

    // ===================================================
    // COMMON VALIDATION
    // ===================================================

    if (!email) {
      setFormError("Please enter your email address.");
      return;
    }

    if (!password) {
      setFormError("Please enter your password.");
      return;
    }

    // ===================================================
    // REGISTER VALIDATION
    // ===================================================

    if (isRegister) {
      const name =
        formData.name.trim();

      const phone =
        formData.phone.trim();

      if (!name) {
        setFormError("Please enter your name.");
        return;
      }

      if (
        !/^[+0-9()\-\s]{7,20}$/.test(
          phone
        )
      ) {
        setFormError("Please enter a valid phone number.");
        return;
      }

      if (password.length < 6) {
        setFormError("Password must be at least 6 characters.");
        return;
      }

      if (
        password !==
        formData.confirmPassword
      ) {
        setFormError("Passwords do not match.");
        return;
      }
    }

    // ===================================================
    // API
    // ===================================================

    try {
      setLoading(true);

      const endpoint = isRegister
        ? "/auth/register"
        : "/auth/login";

      const payload = isRegister
        ? {
            name:
              formData.name.trim(),

            email,

            phone:
              formData.phone.trim(),

            password,
          }
        : {
            email,
            password,
          };

      console.log(
        "AUTH REQUEST:",
        {
          endpoint,
          payload: {
            ...payload,
            password: "[HIDDEN]",
          },
        }
      );

      const res =
        await makeAuthRequest(
          endpoint,
          payload
        );

      // =================================================
      // RESPONSE
      // =================================================

      const user =
        res.data?.user;

      const token =
        res.data?.token;

      if (!user || !token) {
        throw new Error(
          "Authentication response is missing the user session."
        );
      }

      console.log(
        "AUTH USER:",
        user
      );

      console.log(
        "HOTEL SETUP:",
        res.data?.hotelSetupCompleted
      );

      // =================================================
      // SAVE SESSION
      // =================================================

      const sessionSaved =
        login(user, token);

      if (!sessionSaved) {
        throw new Error(
          "FlexiOrder could not keep you signed in on this device."
        );
      }

      const role =
        normalizeRole(user.role);

      // =================================================
      // REGISTERED OWNER
      // =================================================

      if (isRegister) {
        /*
         * VERY IMPORTANT:
         *
         * Registration creates the owner account.
         * It does NOT mean hotel setup is completed.
         *
         * Therefore every newly registered owner
         * goes to Hotel Setup first.
         */

        if (role === "owner") {
          navigate(
            "/setup-hotel",
            {
              replace: true,
              state: {
                fromRegistration: true,
              },
            }
          );

          return;
        }

        // Fallback for other roles
        navigate(
          getPostLoginPath(
            user.role
          ),
          {
            replace: true,
          }
        );

        return;
      }

      // =================================================
      // PASSWORD CHANGE
      // =================================================

      if (
        res.data?.mustChangePassword
      ) {
        navigate(
          "/change-password",
          {
            replace: true,
          }
        );

        return;
      }

      // =================================================
      // OWNER LOGIN
      // =================================================

      if (role === "owner") {
        /*
         * Owner has logged in.
         *
         * If hotel does not exist/setup is incomplete,
         * send them back to Hotel Setup.
         */

        if (
          res.data?.hotelSetupCompleted !==
          true
        ) {
          navigate(
            "/setup-hotel",
            {
              replace: true,
              state: {
                fromLogin: true,
              },
            }
          );

          return;
        }

        /*
         * Hotel exists and setup is complete.
         */

        navigate(
          "/owner/dashboard",
          {
            replace: true,
          }
        );

        return;
      }

      // =================================================
      // OTHER ROLES
      // =================================================

      const postLoginPath =
        getPostLoginPath(
          user.role,
          location.state?.from
        );

      navigate(
        postLoginPath,
        {
          replace: true,
        }
      );
    } catch (err) {
      console.error(
        "AUTHENTICATION ERROR:",
        err
      );

      let message =
        "Something went wrong. Please try again.";

      if (err.response) {
        message =
          err.response.data?.message ||
          err.response.data?.error ||
          `Request failed with status ${err.response.status}.`;
      } else if (err.request) {
        message =
          "The FlexiOrder server did not respond. Check your connection and try again.";
      } else if (err.message) {
        message =
          err.message;
      }

      setFormError(message);
      setSuggestLogin(
        isRegister &&
          (err.response?.status === 409 ||
            /already exists/i.test(String(message))),
      );
      setSuggestReset(
        !isRegister && /invalid credentials/i.test(String(message)),
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INPUT STYLE
  // =====================================================

  const inputClass =
    "w-full rounded-card border border-hairline bg-white px-4 py-3.5 text-[15px] text-ink placeholder:text-ink-disabled focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60";

  // =====================================================
  // JSX
  // =====================================================

  return (
    <div className="min-h-screen bg-canvas px-4 pb-10 pt-6 text-ink sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">

        {/* TOP BAR */}

        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" aria-label="FlexiOrder home">
            <span className="grid h-9 w-9 place-items-center rounded-card bg-brand text-lg font-extrabold text-white">
              F
            </span>
            <span className="text-lg font-extrabold tracking-tight text-ink">
              FlexiOrder
            </span>
          </Link>

          <Link
            to={isRegister ? "/login" : "/register"}
            className="text-sm font-bold text-brand hover:text-brand-strong"
          >
            {isRegister ? "Login instead" : "Create an account"}
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-2 lg:gap-14">

          {/* =================================================
              PRODUCT SUMMARY
          ================================================= */}

          <div className="hidden lg:block">
            <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight xl:text-5xl">
              One workspace for your whole restaurant.
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-ink-secondary">
              QR ordering, waiter ordering, kitchen display, menu control
              and reports — one login for every role.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { icon: <FiSmartphone aria-hidden="true" />, label: "QR orders" },
                { icon: <FiUsers aria-hidden="true" />, label: "Staff roles" },
                { icon: <FiGrid aria-hidden="true" />, label: "Kitchen board" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-sheet border border-hairline bg-white p-4 shadow-card"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-card bg-brand-light text-brand">
                    {item.icon}
                  </span>
                  <p className="mt-3 text-sm font-bold text-ink">{item.label}</p>
                </div>
              ))}
            </div>

            <p className="mt-8 flex items-center gap-2 text-sm font-semibold text-ink-secondary">
              <FiCheckCircle className="text-brand" aria-hidden="true" />
              Works offline. Syncs when the connection returns.
            </p>
          </div>

          {/* =================================================
              AUTH CARD
          ================================================= */}

          <div className="mx-auto w-full max-w-md rounded-panel border border-hairline bg-white p-6 shadow-card sm:p-8">

            <div className="mb-6 flex justify-center lg:hidden">
              <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-sheet bg-white">
                <img
                  src="/logo.jpg"
                  alt="FlexiOrder Logo"
                  className="h-full w-full object-contain"
                />
              </span>
            </div>

            <h2 className="text-center text-2xl font-extrabold tracking-tight">
              {isRegister ? "Create your owner account" : "Welcome back"}
            </h2>

            <p className="mt-1.5 text-center text-sm text-ink-secondary">
              {isRegister
                ? "Account first. Hotel details come next."
                : "Login to your restaurant workspace."}
            </p>

            {/* TABS */}

            <div className="mt-6 flex rounded-card bg-subtle p-1" role="tablist">
              <Link
                to="/login"
                role="tab"
                aria-selected={!isRegister}
                className={`flex-1 rounded-md py-2.5 text-center text-sm font-bold transition ${
                  !isRegister
                    ? "bg-white text-ink shadow-card"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                Login
              </Link>

              <Link
                to="/register"
                role="tab"
                aria-selected={isRegister}
                className={`flex-1 rounded-md py-2.5 text-center text-sm font-bold transition ${
                  isRegister
                    ? "bg-white text-ink shadow-card"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                Register
              </Link>
            </div>

            {/* FORM */}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>

              {formError && (
                <p
                  role="alert"
                  className="rounded-card border border-status-delayed-line/40 bg-status-delayed-surface px-3.5 py-2.5 text-sm font-semibold text-status-delayed-ink"
                >
                  {formError}
                  {suggestLogin && (
                    <>
                      {" "}
                      <Link to="/login" className="underline underline-offset-2">
                        Log in instead
                      </Link>
                    </>
                  )}
                  {suggestReset && (
                    <>
                      {" "}
                      <Link to="/forgot-password" className="underline underline-offset-2">
                        Forgot password?
                      </Link>
                    </>
                  )}
                </p>
              )}

              {/* OWNER DETAILS */}

              {isRegister && (
                <>
                  <input
                    name="name"
                    type="text"
                    placeholder="Owner Name"
                    value={formData.name}
                    onChange={handleChange}
                    autoComplete="name"
                    disabled={loading}
                    className={inputClass}
                  />

                  <input
                    name="phone"
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                    inputMode="tel"
                    disabled={loading}
                    className={inputClass}
                  />
                </>
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
                className={inputClass}
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
                className={inputClass}
              />

              {/* CONFIRM PASSWORD */}

              {isRegister && (
                <input
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                  value={
                    formData.confirmPassword
                  }
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                  className={inputClass}
                />
              )}

              {/* FORGOT PASSWORD */}

              {!isRegister && (
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-bold text-brand hover:text-brand-strong"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-card bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Please wait...
                  </>
                ) : isRegister ? (
                  <>
                    Create Account
                    <FiArrowRight aria-hidden="true" />
                  </>
                ) : (
                  "Login"
                )}
              </button>

            </form>

            {/* REGISTER INFO */}

            {isRegister && (
              <p className="mt-5 flex items-start gap-2.5 rounded-card bg-brand-light px-3.5 py-3 text-xs font-semibold leading-5 text-brand-strong">
                <FiCheckCircle className="mt-0.5 shrink-0" aria-hidden="true" />
                Create your account for free. You can finish hotel details
                right after registering.
              </p>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

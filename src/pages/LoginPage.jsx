import { useState } from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api/axios";

import {
  useAuth,
} from "../context/AuthContext";

export default function LoginPage() {

  // =========================
  // NAVIGATION
  // =========================

  const navigate =
    useNavigate();

  // =========================
  // AUTH CONTEXT
  // =========================

  const { login } =
    useAuth();

  // =========================
  // STATES
  // =========================

  const [formData, setFormData] =
    useState({
      email: "",
      password: "",
    });

  const [loading, setLoading] =
    useState(false);

  // =========================
  // HANDLE CHANGE
  // =========================

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });

  };

  // =========================
  // HANDLE LOGIN
  // =========================

  const handleSubmit = async (
    e
  ) => {

    e.preventDefault();

    try {

      setLoading(true);

      // LOGIN API

      const res =
        await api.post(
          "/auth/login",
          formData
        );

      console.log(
        "LOGIN RESPONSE:",
        res.data
      );

      // =====================
      // STORE AUTH
      // =====================

      login(
        res.data.user,
        res.data.token
      );

      // LOCAL STORAGE

      localStorage.setItem(
        "token",
        res.data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(
          res.data.user
        )
      );

      console.log(
        "USER STORED:",
        JSON.parse(
          localStorage.getItem(
            "user"
          )
        )
      );

      // =====================
      // ROLE BASED REDIRECT
      // =====================

      switch (
        res.data.user.role
      ) {

        case "superadmin":

          navigate(
            "/superadmin"
          );

          break;

        case "owner":

          navigate(
            "/owner/dashboard"
          );

          break;

        case "staff":

          navigate(
            "/kitchen"
          );

          break;

        default:

          navigate("/");
      }

    } catch (err) {

      console.error(err);

      alert(
        err.response?.data
          ?.message ||
          err.response?.data ||
          "Login failed"
      );

    } finally {

      setLoading(false);

    }
  };

  // =========================
  // UI
  // =========================

  return (

    <div className="min-h-screen bg-[#0F172A] text-white flex justify-center items-center px-4">

      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-lg">

        {/* HEADER */}

        <h1 className="text-4xl font-bold text-center">
          FlexiOrder
        </h1>

        <p className="text-gray-400 text-center mt-3">
          Login to continue
        </p>

        {/* FORM */}

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-8 space-y-5"
        >

          {/* EMAIL */}

          <div>

            <label className="block mb-2 text-sm">
              Email
            </label>

            <input
              type="email"
              name="email"
              value={
                formData.email
              }
              onChange={
                handleChange
              }
              required
              className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
            />

          </div>

          {/* PASSWORD */}

          <div>

            <label className="block mb-2 text-sm">
              Password
            </label>

            <input
              type="password"
              name="password"
              value={
                formData.password
              }
              onChange={
                handleChange
              }
              required
              className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
            />

          </div>

          {/* BUTTON */}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 transition rounded-2xl py-4 text-lg font-bold"
          >

            {loading
              ? "Logging In..."
              : "Login"}

          </button>

        </form>

      </div>

    </div>
  );
}
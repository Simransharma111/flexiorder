import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/axios";
import { HOTEL_THEME_CHOICES } from "../constants/hotelThemes";
import { useAuth } from "../context/AuthContext";

export const HOTEL_THEMES = HOTEL_THEME_CHOICES;

export default function HotelSetupPage() {
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    description: "",
    type: "hotel",
    address: "",
    phone: "",
    email: user?.email || "",
    website: "",
    instagram: "",
    whatsapp: "",
    themeId: "mint_glow",
  });

  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const selectedTheme =
    HOTEL_THEMES.find(
      (theme) => theme.id === formData.themeId
    ) || HOTEL_THEMES[0];

  const previewText =
    selectedTheme.text || "#FFFFFF";

  // =====================================================
  // INPUT
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // THEME
  // =====================================================

  const handleThemeChange = (themeId) => {
    setFormData((prev) => ({
      ...prev,
      themeId,
    }));
  };

  // =====================================================
  // BACK
  // =====================================================

  const handleBack = () => {
    /*
     * Do NOT send the owner to the dashboard.
     *
     * They have not completed hotel setup yet.
     *
     * We clear the current session and return
     * them to login.
     */

    logout();

    navigate("/login", {
      replace: true,
    });
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    // -----------------------------------------------------
    // VALIDATION
    // -----------------------------------------------------

    const hotelName = formData.name.trim();
    const address = formData.address.trim();
    const phone = formData.phone.trim();

    if (!hotelName) {
      alert("Please enter your hotel name.");
      return;
    }

    if (!address) {
      alert("Please enter your hotel address.");
      return;
    }

    if (!phone) {
      alert("Please enter your hotel phone number.");
      return;
    }

    // -----------------------------------------------------
    // SESSION
    // -----------------------------------------------------

    const token = localStorage.getItem("token");

    if (!token) {
      alert(
        "Your session has expired. Please login again."
      );

      navigate("/login", {
        replace: true,
      });

      return;
    }

    try {
      setLoading(true);

      // ---------------------------------------------------
      // THEME
      // ---------------------------------------------------

      const theme =
        HOTEL_THEMES.find(
          (item) => item.id === formData.themeId
        ) || HOTEL_THEMES[0];

      // ---------------------------------------------------
      // FORM DATA
      // ---------------------------------------------------

      const form = new FormData();

      form.append("name", hotelName);
      form.append(
        "tagline",
        formData.tagline.trim()
      );

      form.append(
        "description",
        formData.description.trim()
      );

      form.append("type", formData.type);

      form.append("address", address);
      form.append("phone", phone);

      form.append(
        "email",
        formData.email.trim()
      );

      form.append(
        "website",
        formData.website.trim()
      );

      form.append(
        "instagram",
        formData.instagram.trim()
      );

      form.append(
        "whatsapp",
        formData.whatsapp.trim()
      );

      // ---------------------------------------------------
      // THEME
      // ---------------------------------------------------

      form.append("themeId", theme.id);
      form.append(
        "themePrimary",
        theme.primary
      );

      form.append(
        "themeSecondary",
        theme.secondary
      );

      form.append(
        "themeAccent",
        theme.accent
      );

      form.append(
        "themeText",
        theme.text || "#FFFFFF"
      );

      form.append(
        "themeMode",
        theme.mode || "dark"
      );

      // ---------------------------------------------------
      // FILES
      // ---------------------------------------------------

      if (logoFile) {
        form.append("logo", logoFile);
      }

      if (coverFile) {
        form.append(
          "coverImage",
          coverFile
        );
      }

      console.log(
        "SUBMITTING HOTEL SETUP"
      );

      // ---------------------------------------------------
      // API
      // ---------------------------------------------------

      const response = await api.put(
        "/hotel/setup",
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "HOTEL SETUP RESPONSE:",
        response.data
      );

      const updatedUser =
        response.data?.user;

      if (!updatedUser?.hotelId) {
        throw new Error(
          "Hotel was created, but it could not be linked to your owner account."
        );
      }

      // ---------------------------------------------------
      // VERY IMPORTANT
      // UPDATE AUTH SESSION
      // ---------------------------------------------------

      /*
       * Before setup:
       *
       * hotelId: null
       *
       * After setup:
       *
       * hotelId: "..."
       *
       * We must update AuthContext/localStorage.
       */

      login(
        {
          ...(user || {}),
          ...updatedUser,
          hotelId: updatedUser.hotelId,
          accountStatus:
            updatedUser.accountStatus || "active",
        },
        token
      );

      // ---------------------------------------------------
      // SUCCESS
      // ---------------------------------------------------

      alert(
        "Hotel setup completed successfully!"
      );

      navigate(
        "/owner/dashboard",
        {
          replace: true,
        }
      );

    } catch (err) {
      console.error(
        "HOTEL SETUP ERROR:",
        err
      );

      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Hotel setup failed. Please try again.";

      alert(message);

    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INPUT CLASS
  // =====================================================

  const inputClass =
    "w-full p-3 rounded-xl outline-none text-black";

  // =====================================================
  // JSX
  // =====================================================

  return (
    <div
      className="min-h-screen px-4 py-8 md:px-8"
      style={{
        background:
          selectedTheme.secondary,
        color: previewText,
      }}
    >
      <div className="max-w-6xl mx-auto">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8">

          <button
            type="button"
            onClick={handleBack}
            disabled={loading}
            className="mb-6 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
          >
            ← Back to Login
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-sm">
            Step 2 of 2
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mt-4">
            Set Up Your Hotel
          </h1>

          <p className="mt-2 opacity-70">
            Your owner account is active. Complete
            your hotel information before entering
            your dashboard.
          </p>

          {user && (
            <div className="mt-4 text-sm opacity-60">
              Account: {user.email}
            </div>
          )}

        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* BASIC INFORMATION */}

          <section
            className="p-6 rounded-2xl border"
            style={{
              background:
                "rgba(255,255,255,0.06)",
              borderColor:
                "rgba(255,255,255,0.12)",
            }}
          >
            <h2 className="text-xl font-bold mb-5">
              Basic Information
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm mb-2">
                  Hotel / Restaurant Name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter hotel name"
                  required
                  disabled={loading}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  Business Type
                </label>

                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  disabled={loading}
                  className={inputClass}
                >
                  <option value="hotel">
                    Hotel
                  </option>

                  <option value="restaurant">
                    Restaurant
                  </option>

                  <option value="cafe">
                    Cafe
                  </option>

                  <option value="resort">
                    Resort
                  </option>

                  <option value="cloud-kitchen">
                    Cloud Kitchen
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">
                  Tagline
                </label>

                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleChange}
                  placeholder="Example: Taste the difference"
                  disabled={loading}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  Phone *
                </label>

                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone number"
                  required
                  disabled={loading}
                  className={inputClass}
                />
              </div>

            </div>

            <div className="mt-4">
              <label className="block text-sm mb-2">
                Description
              </label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Tell guests something about your hotel..."
                rows={4}
                disabled={loading}
                className={`${inputClass} resize-none`}
              />
            </div>
          </section>

          {/* CONTACT */}

          <section
            className="p-6 rounded-2xl border"
            style={{
              background:
                "rgba(255,255,255,0.06)",
              borderColor:
                "rgba(255,255,255,0.12)",
            }}
          >
            <h2 className="text-xl font-bold mb-5">
              Contact Information
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm mb-2">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  Address *
                </label>

                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Hotel address"
                  required
                  disabled={loading}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  Website
                </label>

                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  disabled={loading}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  Instagram
                </label>

                <input
                  type="text"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleChange}
                  placeholder="@yourhotel"
                  disabled={loading}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm mb-2">
                  WhatsApp
                </label>

                <input
                  type="text"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="WhatsApp number"
                  disabled={loading}
                  className={inputClass}
                />
              </div>

            </div>
          </section>

          {/* BRANDING */}

          <section
            className="p-6 rounded-2xl border"
            style={{
              background:
                "rgba(255,255,255,0.06)",
              borderColor:
                "rgba(255,255,255,0.12)",
            }}
          >
            <h2 className="text-xl font-bold mb-2">
              Branding
            </h2>

            <p className="text-sm opacity-70 mb-5">
              Upload your hotel logo and cover image.
            </p>

            <div className="grid md:grid-cols-2 gap-5">

              <div>
                <label className="block text-sm mb-2">
                  Hotel Logo
                </label>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={loading}
                  onChange={(e) =>
                    setLogoFile(
                      e.target.files?.[0] ||
                      null
                    )
                  }
                  className="w-full p-3 rounded-xl bg-white text-black"
                />

                {logoFile && (
                  <p className="text-sm mt-2 opacity-70">
                    Selected: {logoFile.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm mb-2">
                  Cover Image
                </label>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={loading}
                  onChange={(e) =>
                    setCoverFile(
                      e.target.files?.[0] ||
                      null
                    )
                  }
                  className="w-full p-3 rounded-xl bg-white text-black"
                />

                {coverFile && (
                  <p className="text-sm mt-2 opacity-70">
                    Selected: {coverFile.name}
                  </p>
                )}
              </div>

            </div>
          </section>

          {/* THEMES */}

          <section
            className="p-6 rounded-2xl border"
            style={{
              background:
                "rgba(255,255,255,0.06)",
              borderColor:
                "rgba(255,255,255,0.12)",
            }}
          >
            <h2 className="text-xl font-bold">
              Choose Your Theme
            </h2>

            <p className="text-sm opacity-70 mt-1 mb-5">
              This theme will be used for your
              hotel's guest-facing menu.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {HOTEL_THEMES.map((theme) => {
                const selected =
                  formData.themeId === theme.id;

                return (
                  <button
                    type="button"
                    key={theme.id}
                    onClick={() =>
                      handleThemeChange(theme.id)
                    }
                    disabled={loading}
                    className="text-left rounded-2xl p-4 border-2 transition hover:scale-[1.02] disabled:opacity-60"
                    style={{
                      background:
                        `linear-gradient(135deg, ${theme.secondary} 0%, ${theme.primary} 100%)`,
                      borderColor:
                        selected
                          ? theme.accent
                          : "rgba(255,255,255,0.16)",
                      color:
                        theme.text ||
                        "#FFFFFF",
                    }}
                  >
                    <div className="flex items-center justify-between">

                      <h3
                        className="font-bold"
                        style={{
                          color:
                            theme.accent,
                        }}
                      >
                        {theme.label}
                      </h3>

                      {selected && (
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            background:
                              theme.accent,
                            color:
                              "#000",
                          }}
                        >
                          Selected
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">

                      <span
                        className="w-8 h-8 rounded-full border border-white/20"
                        style={{
                          background:
                            theme.primary,
                        }}
                      />

                      <span
                        className="w-8 h-8 rounded-full border border-white/20"
                        style={{
                          background:
                            theme.secondary,
                        }}
                      />

                      <span
                        className="w-8 h-8 rounded-full border border-white/20"
                        style={{
                          background:
                            theme.accent,
                        }}
                      />

                    </div>
                  </button>
                );
              })}

            </div>
          </section>

          {/* PREVIEW */}

          <section
            className="rounded-2xl overflow-hidden border"
            style={{
              background:
                selectedTheme.secondary,
              borderColor:
                selectedTheme.accent,
            }}
          >
            <div
              className="p-6"
              style={{
                background:
                  selectedTheme.primary,
              }}
            >
              <p
                className="text-sm opacity-80"
                style={{
                  color: previewText,
                }}
              >
                LIVE PREVIEW
              </p>

              <h2
                className="text-2xl md:text-3xl font-bold mt-2"
                style={{
                  color: previewText,
                }}
              >
                {formData.name ||
                  "Your Hotel Name"}
              </h2>

              <p
                className="mt-1 opacity-80"
                style={{
                  color: previewText,
                }}
              >
                {formData.tagline ||
                  "Your hotel tagline will appear here"}
              </p>
            </div>

            <div className="p-6">

              <div className="grid md:grid-cols-3 gap-4">

                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm opacity-70">
                    Primary
                  </p>

                  <p
                    className="font-bold mt-1"
                    style={{
                      color:
                        selectedTheme.primary,
                    }}
                  >
                    {selectedTheme.primary}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm opacity-70">
                    Secondary
                  </p>

                  <p
                    className="font-bold mt-1"
                    style={{
                      color:
                        selectedTheme.accent,
                    }}
                  >
                    {selectedTheme.secondary}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm opacity-70">
                    Accent
                  </p>

                  <p
                    className="font-bold mt-1"
                    style={{
                      color:
                        selectedTheme.accent,
                    }}
                  >
                    {selectedTheme.accent}
                  </p>
                </div>

              </div>

              <button
                type="button"
                className="mt-5 px-6 py-3 rounded-xl font-bold"
                style={{
                  background:
                    selectedTheme.accent,
                  color:
                    selectedTheme.secondary,
                }}
              >
                Example Button
              </button>

            </div>
          </section>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="flex flex-col sm:flex-row gap-4">

            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="sm:w-1/3 py-4 rounded-2xl font-bold text-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
            >
              ← Back to Login
            </button>

            <button
              type="submit"
              disabled={loading}
              className="sm:flex-1 py-4 rounded-2xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  selectedTheme.primary,
                color: "#FFFFFF",
              }}
            >
              {loading
                ? "Saving Hotel..."
                : "Complete Hotel Setup & Continue →"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

/* =========================================================
   HOTEL THEMES
========================================================= */

export const HOTEL_THEMES = [
  {
    id: "velvet_sunset",
    name: "Velvet Sunset",
    primary: "#F97316",
    secondary: "#1F0A0A",
    accent: "#FDBA74",
    text: "#FFF7ED",
  },
  {
    id: "emerald_luxe",
    name: "Emerald Luxe",
    primary: "#0F766E",
    secondary: "#79c19d",
    accent: "#1b8a61",
    text:"#042F2E",
  },
  {
    id: "ocean_breeze",
    name: "Ocean Breeze",
    primary: "#2563EB",
    secondary: "#0F172A",
    accent: "#7DD3FC",
    text: "#EFF6FF",
  },
  {
    id: "royal_plum",
    name: "Royal Plum",
    primary: "#7C3AED",
    secondary: "#1F123A",
    accent: "#C4B5FD",
    text: "#F5F3FF",
  },
  {
    id: "citrus_glow",
    name: "Citrus Glow",
    primary: "#D97706",
    secondary: "#3B1300",
    accent: "#FDE68A",
    text: "#FFFBEB",
  },
  {
    id: "sage_ritual",
    name: "Sage Ritual",
    primary: "#edefea",
    secondary: "#d7dd7b",
    accent: "#A3E635",
    text: "#060801",
  },
  {
    id: "midnight_noir",
    name: "Midnight Noir",
    primary: "#111827",
    secondary: "#030712",
    accent: "#64748B",
    text: "#F8FAFC",
  },
  {
    id: "pearl_mist",
    name: "Pearl Mist",
    primary: "#F8FAFC",
    secondary: "#E2E8F0",
    accent: "#475569",
    text: "#0F172A",
  },
  {
    id: "instagram_inspo",
    name: "Instagram Inspo",
    primary: "#FF4D67",
    secondary: "#FFF5F7",
    accent: "#1DA1F2",
    text: "#1F2937",
  },
];

/* =========================================================
   COMPONENT
========================================================= */

export default function HotelSetupPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  /* =======================================================
     FORM DATA
  ======================================================= */

  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    description: "",
    type: "hotel",
    address: "",
    phone: "",
    email: "",
    website: "",
    instagram: "",
    whatsapp: "",
    themeId: "stormy_morning",
  });

  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  /* =======================================================
     SELECTED THEME
  ======================================================= */

  const selectedTheme =
    HOTEL_THEMES.find(
      (theme) => theme.id === formData.themeId
    ) || HOTEL_THEMES[0];

  const previewText = selectedTheme.text || "#FFFFFF";

  /* =======================================================
     INPUT CHANGE
  ======================================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =======================================================
     THEME CHANGE
  ======================================================= */

  const handleThemeChange = (themeId) => {
    setFormData((prev) => ({
      ...prev,
      themeId,
    }));
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter your hotel name.");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        alert("Your session has expired. Please login again.");
        navigate("/login");
        return;
      }

      /* ---------------------------------------------------
         FIND SELECTED THEME
      --------------------------------------------------- */

      const theme =
        HOTEL_THEMES.find(
          (item) => item.id === formData.themeId
        ) || HOTEL_THEMES[0];

      /* ---------------------------------------------------
         CREATE FORM DATA
      --------------------------------------------------- */

      const form = new FormData();

      /* BASIC INFORMATION */

      form.append("name", formData.name.trim());
      form.append("tagline", formData.tagline);
      form.append("description", formData.description);
      form.append("type", formData.type);

      /* CONTACT INFORMATION */

      form.append("address", formData.address);
      form.append("phone", formData.phone);
      form.append("email", formData.email);
      form.append("website", formData.website);
      form.append("instagram", formData.instagram);
      form.append("whatsapp", formData.whatsapp);

      /* ---------------------------------------------------
         THEME

         We send BOTH the ID and actual colors.

         This matches your Hotel schema:

         theme: {
           id,
           primary,
           secondary,
           accent
         }
      --------------------------------------------------- */

      form.append("themeId", theme.id);
      form.append("themePrimary", theme.primary);
      form.append("themeSecondary", theme.secondary);
      form.append("themeAccent", theme.accent);

      /* ---------------------------------------------------
         FILES
      --------------------------------------------------- */

      if (logoFile) {
        form.append("logo", logoFile);
      }

      if (coverFile) {
        form.append("coverImage", coverFile);
      }

      /* ---------------------------------------------------
         API REQUEST
      --------------------------------------------------- */

      await api.put("/hotel/setup", form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Hotel setup completed successfully!");

      navigate("/owner/dashboard");
    } catch (err) {
      console.error("HOTEL SETUP ERROR:", err);

      alert(
        err?.response?.data?.message ||
          "Hotel setup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     JSX
  ======================================================= */

  return (
    <div
      className="min-h-screen px-4 py-8 md:px-8"
      style={{
        background: selectedTheme.secondary,
        color: previewText,
      }}
    >
      <div className="max-w-6xl mx-auto">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8">

          <h1 className="text-3xl md:text-4xl font-bold">
            Setup Your Hotel
          </h1>

          <p className="mt-2 opacity-70">
            Add your hotel information, branding and theme.
          </p>

        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <section
            className="p-6 rounded-2xl border"
            style={{
              background: "rgba(255,255,255,0.06)",
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >

            <h2 className="text-xl font-bold mb-5">
              Basic Information
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              {/* HOTEL NAME */}

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
                  className="w-full p-3 rounded-xl outline-none text-black"
                />
              </div>

              {/* TYPE */}

              <div>
                <label className="block text-sm mb-2">
                  Business Type
                </label>

                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl outline-none text-black"
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

              {/* TAGLINE */}

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
                  className="w-full p-3 rounded-xl outline-none text-black"
                />
              </div>

              {/* PHONE */}

              <div>
                <label className="block text-sm mb-2">
                  Phone
                </label>

                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone number"
                  className="w-full p-3 rounded-xl outline-none text-black"
                />
              </div>

            </div>

            {/* DESCRIPTION */}

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
                className="w-full p-3 rounded-xl outline-none text-black resize-none"
              />

            </div>

          </section>

          {/* =================================================
              CONTACT
          ================================================= */}

          <section
            className="p-6 rounded-2xl border"
            style={{
              background: "rgba(255,255,255,0.06)",
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >

            <h2 className="text-xl font-bold mb-5">
              Contact Information
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              {/* EMAIL */}

              <div>

                <label className="block text-sm mb-2">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="hotel@example.com"
                  className="w-full p-3 rounded-xl outline-none text-black"
                />

              </div>

              {/* ADDRESS */}

              <div>

                <label className="block text-sm mb-2">
                  Address
                </label>

                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Hotel address"
                  className="w-full p-3 rounded-xl outline-none text-black"
                />

              </div>

              {/* WEBSITE */}

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
                  className="w-full p-3 rounded-xl outline-none text-black"
                />

              </div>

              {/* INSTAGRAM */}

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
                  className="w-full p-3 rounded-xl outline-none text-black"
                />

              </div>

              {/* WHATSAPP */}

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
                  className="w-full p-3 rounded-xl outline-none text-black"
                />

              </div>

            </div>

          </section>

          {/* =================================================
              BRANDING
          ================================================= */}

          <section
            className="p-6 rounded-2xl border"
            style={{
              background: "rgba(255,255,255,0.06)",
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >

            <h2 className="text-xl font-bold mb-2">
              Branding
            </h2>

            <p className="text-sm opacity-70 mb-5">
              Upload your hotel logo and cover image.
            </p>

            <div className="grid md:grid-cols-2 gap-5">

              {/* LOGO */}

              <div>

                <label className="block text-sm mb-2">
                  Hotel Logo
                </label>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) =>
                    setLogoFile(
                      e.target.files?.[0] || null
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

              {/* COVER */}

              <div>

                <label className="block text-sm mb-2">
                  Cover Image
                </label>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) =>
                    setCoverFile(
                      e.target.files?.[0] || null
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

          {/* =================================================
              THEMES
          ================================================= */}

          <section
            className="p-6 rounded-2xl border"
            style={{
              background: "rgba(255,255,255,0.06)",
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >

            <div className="mb-5">

              <h2 className="text-xl font-bold">
                Choose Your Theme
              </h2>

              <p className="text-sm opacity-70 mt-1">
                This theme will be used for your hotel's
                guest-facing menu and branding.
              </p>

            </div>

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
                    className="text-left rounded-2xl p-4 border-2 transition hover:scale-[1.02]"
                    style={{
                      background: `linear-gradient(135deg, ${theme.secondary} 0%, ${theme.primary} 100%)`,
                      borderColor: selected
                        ? theme.accent
                        : "rgba(255,255,255,0.16)",
                      color: theme.text || "#FFFFFF",
                    }}
                  >

                    <div className="flex items-center justify-between">

                      <h3
                        className="font-bold"
                        style={{
                          color: theme.accent,
                        }}
                      >
                        {theme.name}
                      </h3>

                      {selected && (
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            background: theme.accent,
                            color: "#000",
                          }}
                        >
                          Selected
                        </span>
                      )}

                    </div>

                    {/* COLOR PREVIEW */}

                    <div className="flex gap-2 mt-4">

                      <span
                        className="w-8 h-8 rounded-full border border-white/20"
                        style={{
                          background: theme.primary,
                        }}
                      />

                      <span
                        className="w-8 h-8 rounded-full border border-white/20"
                        style={{
                          background: theme.secondary,
                        }}
                      />

                      <span
                        className="w-8 h-8 rounded-full border border-white/20"
                        style={{
                          background: theme.accent,
                        }}
                      />

                    </div>

                  </button>
                );
              })}

            </div>

          </section>

          {/* =================================================
              LIVE PREVIEW
          ================================================= */}

          <section
            className="rounded-2xl overflow-hidden border"
            style={{
              background: selectedTheme.secondary,
              borderColor: selectedTheme.accent,
            }}
          >

            <div
              className="p-6"
              style={{
                background: selectedTheme.primary,
              }}
            >

              <p className="text-sm opacity-80" style={{ color: previewText }}>
                LIVE PREVIEW
              </p>

              <h2 className="text-2xl md:text-3xl font-bold mt-2" style={{ color: previewText }}>
                {formData.name || "Your Hotel Name"}
              </h2>

              <p className="mt-1 opacity-80" style={{ color: previewText }}>
                {formData.tagline ||
                  "Your hotel tagline will appear here"}
              </p>

            </div>

            <div className="p-6">

              <div className="grid md:grid-cols-3 gap-4">

                <div
                  className="p-4 rounded-xl"
                  style={{
                    background:
                      "rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-sm opacity-70">
                    Primary
                  </p>

                  <p
                    className="font-bold mt-1"
                    style={{
                      color: selectedTheme.primary,
                    }}
                  >
                    {selectedTheme.primary}
                  </p>
                </div>

                <div
                  className="p-4 rounded-xl"
                  style={{
                    background:
                      "rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-sm opacity-70">
                    Secondary
                  </p>

                  <p
                    className="font-bold mt-1"
                    style={{
                      color: selectedTheme.accent,
                    }}
                  >
                    {selectedTheme.secondary}
                  </p>
                </div>

                <div
                  className="p-4 rounded-xl"
                  style={{
                    background:
                      "rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-sm opacity-70">
                    Accent
                  </p>

                  <p
                    className="font-bold mt-1"
                    style={{
                      color: selectedTheme.accent,
                    }}
                  >
                    {selectedTheme.accent}
                  </p>
                </div>

              </div>

              {/* PREVIEW BUTTON */}

              <button
                type="button"
                className="mt-5 px-6 py-3 rounded-xl font-bold"
                style={{
                  background: selectedTheme.accent,
                  color: selectedTheme.secondary,
                }}
              >
                Example Button
              </button>

            </div>

          </section>

          {/* =================================================
              SUBMIT
          ================================================= */}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: selectedTheme.primary,
              color: "#FFFFFF",
            }}
          >
            {loading
              ? "Saving Hotel..."
              : "Complete Hotel Setup"}
          </button>

        </form>

      </div>
    </div>
  );
}
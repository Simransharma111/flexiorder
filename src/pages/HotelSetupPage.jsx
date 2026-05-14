import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

/* =========================
   HOTEL THEMES (FIXED)
========================= */
export const HOTEL_THEMES = [
  {
    id: "stormy_morning",
    name: "Stormy Morning",
    primary: "#64748B",
    secondary: "#0F172A",
    accent: "#94A3B8",
  },
  {
    id: "mossy_hollow",
    name: "Mossy Hollow",
    primary: "#4D7C0F",
    secondary: "#1A2E05",
    accent: "#84CC16",
  },
  {
    id: "blue_eclipse",
    name: "Blue Eclipse",
    primary: "#1E293B",
    secondary: "#020617",
    accent: "#3B82F6",
  },
  {
    id: "lush_forest",
    name: "Lush Forest",
    primary: "#14532D",
    secondary: "#052E16",
    accent: "#22C55E",
  },
  {
    id: "green_juice",
    name: "Green Juice",
    primary: "#16A34A",
    secondary: "#052E16",
    accent: "#86EFAC",
  },
  {
    id: "chili_spice",
    name: "Chili Spice",
    primary: "#DC2626",
    secondary: "#1F0A0A",
    accent: "#F97316",
  },
  {
    id: "chocolate_truffle",
    name: "Chocolate Truffle",
    primary: "#7C2D12",
    secondary: "#1C0A00",
    accent: "#D97706",
  },
  {
    id: "ink_wash",
    name: "Ink Wash",
    primary: "#111827",
    secondary: "#F8FAFC",
    accent: "#64748B",
  },
];

export default function HotelSetupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    description: "",
    type: "hotel",
    address: "",
    phone: "",
    email: "",
    themeId: "stormy_morning",
  });

  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const form = new FormData();

      Object.keys(formData).forEach((key) => {
        form.append(key, formData[key]);
      });

      if (logoFile) form.append("logo", logoFile);
      if (coverFile) form.append("coverImage", coverFile);

      await api.put("/hotel/setup", form, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });

      navigate("/owner/dashboard");
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     SAFE THEME FALLBACK
  ========================= */
  const selectedTheme =
    HOTEL_THEMES.find((t) => t.id === formData.themeId) ||
    HOTEL_THEMES[0];

  return (
    <div className="min-h-screen text-white px-6 py-10" style={{ background: "#0F172A" }}>
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <h1 className="text-4xl font-bold">Setup Your Hotel</h1>
        <p className="text-gray-400 mt-2">
          Create your hotel identity and branding
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-8">

          {/* BASIC INFO */}
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
            <h2 className="text-xl font-bold mb-4">Basic Info</h2>

            <div className="grid md:grid-cols-2 gap-4">

              <input
                name="name"
                placeholder="Hotel Name"
                onChange={handleChange}
                className="bg-white/10 p-3 rounded-xl"
                required
              />

              <select
                name="type"
                onChange={handleChange}
                className="bg-white/10 p-3 rounded-xl"
              >
                <option value="hotel">Hotel</option>
                <option value="restaurant">Restaurant</option>
                <option value="cafe">Cafe</option>
                <option value="resort">Resort</option>
              </select>

              <input
                name="tagline"
                placeholder="Tagline"
                onChange={handleChange}
                className="bg-white/10 p-3 rounded-xl"
              />

              <input
                name="phone"
                placeholder="Phone"
                onChange={handleChange}
                className="bg-white/10 p-3 rounded-xl"
              />
            </div>

            <textarea
              name="description"
              placeholder="Description"
              onChange={handleChange}
              className="w-full mt-4 bg-white/10 p-3 rounded-xl"
              rows={4}
            />
          </div>

          {/* CONTACT */}
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
            <h2 className="text-xl font-bold mb-4">Contact</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <input
                name="email"
                placeholder="Email"
                onChange={handleChange}
                className="bg-white/10 p-3 rounded-xl"
              />

              <input
                name="address"
                placeholder="Address"
                onChange={handleChange}
                className="bg-white/10 p-3 rounded-xl"
              />
            </div>
          </div>

          {/* FILE UPLOAD */}
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
            <h2 className="text-xl font-bold mb-4">Branding</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm mb-2">Logo</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files[0])}
                  className="bg-white/10 p-2 rounded-xl w-full"
                />
              </div>

              <div>
                <p className="text-sm mb-2">Cover Image</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files[0])}
                  className="bg-white/10 p-2 rounded-xl w-full"
                />
              </div>
            </div>
          </div>

          {/* THEMES */}
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
            <h2 className="text-xl font-bold mb-4">Choose Theme</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {HOTEL_THEMES.map((theme) => (
                <div
                  key={theme.id}
                  onClick={() =>
                    setFormData({ ...formData, themeId: theme.id })
                  }
                  className={`p-4 rounded-2xl cursor-pointer border transition ${
                    formData.themeId === theme.id
                      ? "border-white"
                      : "border-white/10"
                  }`}
                  style={{ background: theme.secondary }}
                >
                  <h3 className="font-bold">{theme.name}</h3>

                  <div className="flex gap-2 mt-3">
                    <div className="w-6 h-6 rounded-full" style={{ background: theme.primary }} />
                    <div className="w-6 h-6 rounded-full" style={{ background: theme.accent }} />
                    <div className="w-6 h-6 rounded-full" style={{ background: theme.secondary }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PREVIEW (FIXED) */}
          <div
            className="p-6 rounded-3xl border border-white/10"
            style={{ background: selectedTheme.secondary }}
          >
            <h2 className="text-xl font-bold">Theme Preview</h2>
            <p className="text-gray-400 mt-2">
              This is how your hotel will look
            </p>

            <div
              className="mt-4 p-4 rounded-xl font-bold"
              style={{ background: selectedTheme.primary, color: "#000" }}
            >
              {formData.name || "Your Hotel Name"}
            </div>
          </div>

          {/* SUBMIT */}
          <button
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 py-4 rounded-2xl font-bold text-lg"
          >
            {loading ? "Saving..." : "Complete Setup"}
          </button>

        </form>
      </div>
    </div>
  );
}
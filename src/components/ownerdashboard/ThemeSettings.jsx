import { useState } from "react";
import { FiCheck } from "react-icons/fi";
import api from "../../api/axios";
import { HOTEL_THEME_CHOICES } from "../../constants/hotelThemes";

export default function ThemeSettings({ hotel, onHotelChange }) {
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const activeThemeId = hotel?.theme?.id;

  const selectTheme = (choice) => {
    if (choice.id === activeThemeId) return;
    setDirty(true);
    onHotelChange({
      ...hotel,
      theme: {
        id: choice.id,
        primary: choice.primary,
        secondary: choice.secondary,
        accent: choice.accent,
        brand: choice.brand,
        text: choice.text || "#FFFFFF",
        mode: choice.mode || "dark",
      },
    });
  };

  const saveTheme = async () => {
    if (!hotel?.theme || saving) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append("themeId", hotel.theme.id);
      form.append("themePrimary", hotel.theme.primary);
      form.append("themeSecondary", hotel.theme.secondary);
      form.append("themeAccent", hotel.theme.accent);
      form.append("themeText", hotel.theme.text || "#111827");
      form.append("themeMode", hotel.theme.mode || "light");
      // Branding is a PATCH endpoint — using POST returns an error and the
      // theme never saves.
      const res = await api.patch("/hotel/branding", form);
      if (res.data?.hotel) {
        onHotelChange(res.data.hotel);
      }
      setDirty(false);
      window.alert("Theme saved");
    } catch {
      window.alert("Unable to save the theme right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="owner-themes">
      <div className="owner-themes__header">
        <div>
          <h2>Choose a theme</h2>
          <p>Pick the accent and surface colors used across your dashboards.</p>
        </div>
        {dirty && <span className="owner-themes__dirty">Unsaved changes</span>}
      </div>
      <div className="owner-themes__grid">
        {HOTEL_THEME_CHOICES.map((theme) => {
          const isActive = activeThemeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => selectTheme(theme)}
              className={`owner-theme-card${isActive ? " is-active" : ""}`}
              style={{ background: theme.secondary, borderColor: isActive ? theme.accent : "transparent" }}
              aria-pressed={isActive}
            >
              <span className="owner-theme-card__label" style={{ color: theme.accent }}>{theme.label}</span>
              <span className="owner-theme-card__swatches">
                <span style={{ background: theme.primary }} />
                <span style={{ background: theme.secondary, border: "1px solid rgba(0,0,0,.15)" }} />
                <span style={{ background: theme.accent }} />
              </span>
              {isActive && (
                <span className="owner-theme-card__check" style={{ background: theme.accent, color: theme.mode === "dark" ? "#0b0d2a" : "#ffffff" }}>
                  <FiCheck />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={saveTheme}
        disabled={saving || !dirty}
        className="owner-accent-bg owner-themes__save"
      >
        {saving ? "Saving..." : "Save Theme"}
      </button>
    </section>
  );
}

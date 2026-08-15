import { useEffect, useState } from "react";
import { FiCheck, FiImage, FiUpload } from "react-icons/fi";
import api from "../../api/axios";
import { HOTEL_THEME_CHOICES } from "../../constants/hotelThemes";

export default function ThemeSettings({ hotel, onHotelChange }) {
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(hotel?.logo || "");
  const [coverPreview, setCoverPreview] = useState(hotel?.coverImage || "");
  const activeThemeId = hotel?.theme?.id;

  useEffect(() => {
    setLogoPreview(hotel?.logo || "");
    setCoverPreview(hotel?.coverImage || "");
    setLogoFile(null);
    setCoverFile(null);
  }, [hotel?.logo, hotel?.coverImage]);

  const pickFile = (setter, previewSetter) => (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setter(file);
    previewSetter(URL.createObjectURL(file));
    setDirty(true);
  };

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
      if (logoFile) form.append("logo", logoFile);
      if (coverFile) form.append("coverImage", coverFile);
      // Branding is a PATCH endpoint — using POST returns an error and the
      // theme never saves.
      const res = await api.patch("/hotel/branding", form);
      if (res.data?.hotel) {
        onHotelChange(res.data.hotel);
      }
      setLogoFile(null);
      setCoverFile(null);
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
      <div className="owner-themes__brand">
        <div className="owner-themes__header">
          <div>
            <h2>Brand identity</h2>
            <p>Logo and banner shown across your menus and dashboards.</p>
          </div>
        </div>
        <div className="owner-themes__brand-grid">
          <div className="owner-themes__brand-item">
            <span className="owner-themes__brand-label">Banner</span>
            <div className="owner-themes__brand-cover">
              {coverPreview ? (
                <img src={coverPreview} alt="Restaurant banner" />
              ) : (
                <span className="owner-themes__brand-empty">
                  <FiImage aria-hidden="true" /> No banner yet
                </span>
              )}
              <label className="owner-themes__brand-edit" title="Change banner" aria-label="Change banner">
                <FiUpload aria-hidden="true" />
                <input type="file" hidden accept="image/*" onChange={pickFile(setCoverFile, setCoverPreview)} />
              </label>
            </div>
          </div>
          <div className="owner-themes__brand-item">
            <span className="owner-themes__brand-label">Logo</span>
            <div className="owner-themes__brand-logo">
              {logoPreview ? (
                <img src={logoPreview} alt="Restaurant logo" />
              ) : (
                <span className="owner-themes__brand-empty">
                  <FiImage aria-hidden="true" /> No logo yet
                </span>
              )}
              <label className="owner-themes__brand-edit" title="Change logo" aria-label="Change logo">
                <FiUpload aria-hidden="true" />
                <input type="file" hidden accept="image/*" onChange={pickFile(setLogoFile, setLogoPreview)} />
              </label>
            </div>
          </div>
        </div>
      </div>

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

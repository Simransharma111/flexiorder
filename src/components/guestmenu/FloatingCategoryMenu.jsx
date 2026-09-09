import { useEffect, useId, useRef, useState } from "react";
import { FiCheck, FiChevronRight, FiList, FiX } from "react-icons/fi";

export default function FloatingCategoryMenu({ options = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!Array.isArray(options) || options.length <= 1) return null;

  const choose = (option) => {
    onChange(option);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div ref={rootRef} className="guest-floating-category">
      {open && (
        <div id={menuId} className="guest-floating-category__panel" role="menu" aria-label="Menu categories">
          <div className="guest-floating-category__head">
            <span>Browse categories</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close categories"><FiX /></button>
          </div>
          <div className="guest-floating-category__options">
            {options.map((option) => (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={value === option}
                key={option}
                className={value === option ? "is-active" : ""}
                onClick={() => choose(option)}
              >
                <span>{option}</span>
                {value === option ? <FiCheck aria-hidden="true" /> : <FiChevronRight aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        className="guest-floating-category__trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Browse menu categories"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <FiX aria-hidden="true" /> : <FiList aria-hidden="true" />}
        <span>{value === "All" ? "Categories" : value}</span>
      </button>
    </div>
  );
}

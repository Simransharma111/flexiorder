import { useEffect, useId, useRef, useState } from "react";
import { FiCheck, FiMenu } from "react-icons/fi";

export default function SubcategoryChooser({ options, value, onChange, label = "Subcategory" }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const rootRef = useRef(null);
  const optionRefs = useRef([]);
  const requestedFocusIndex = useRef(null);
  const chooserId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside, true);
    window.requestAnimationFrame(() => {
      const activeIndex = Math.max(0, options.indexOf(value));
      const focusIndex = requestedFocusIndex.current ?? activeIndex;
      requestedFocusIndex.current = null;
      optionRefs.current[focusIndex]?.focus();
    });
    return () => document.removeEventListener("pointerdown", closeOutside, true);
  }, [open, options, value]);

  if (!Array.isArray(options) || options.length <= 1) return null;

  const choose = (option) => {
    onChange(option);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div
      ref={rootRef}
      className="menu-subcategory-chooser"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="menu-subcategory-trigger"
        aria-expanded={open}
        aria-controls={chooserId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          const lastIndex = options.length - 1;
          const targetIndex = event.key === "ArrowDown" || event.key === "Home"
            ? 0
            : event.key === "ArrowUp" || event.key === "End" ? lastIndex : null;
          if (targetIndex !== null) {
            event.preventDefault();
            requestedFocusIndex.current = targetIndex;
            if (!open) setOpen(true);
            else window.requestAnimationFrame(() => {
              optionRefs.current[targetIndex]?.focus();
              requestedFocusIndex.current = null;
            });
          }
        }}
      >
        <FiMenu aria-hidden="true" />
        <span>{label}</span>
        <strong>{value}</strong>
      </button>
      {open && (
        <div id={chooserId} className="menu-subcategory-options" role="group" aria-label={label}>
          {options.map((option, index) => (
            <button
              ref={(node) => { optionRefs.current[index] = node; }}
              type="button"
              key={option}
              className={value === option ? "is-active" : ""}
              aria-pressed={value === option}
              onClick={() => choose(option)}
              onKeyDown={(event) => {
                const lastIndex = options.length - 1;
                const targetIndex = event.key === "ArrowDown"
                  ? (index + 1) % options.length
                  : event.key === "ArrowUp"
                    ? (index - 1 + options.length) % options.length
                    : event.key === "Home" ? 0
                      : event.key === "End" ? lastIndex : null;
                if (targetIndex !== null) {
                  event.preventDefault();
                  optionRefs.current[targetIndex]?.focus();
                }
              }}
            >
              <span>{option}</span>
              {value === option && <FiCheck aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

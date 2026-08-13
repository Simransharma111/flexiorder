import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { FiPause, FiPlay } from "react-icons/fi";
import DishCard from "./DishCard";

const SPECIAL_FLAGS = [
  ["featured", "Featured"],
  ["todaySpecial", "Today’s special"],
  ["isRecommended", "Recommended"],
  ["isBestseller", "Best seller"],
  ["isPopular", "Most popular"],
  ["isNewArrival", "New arrival"],
  ["chefChoice", "Chef’s choice"],
];

export const getSpecialLabels = (dish) =>
  SPECIAL_FLAGS
    .filter(([flag]) => dish?.[flag] === true)
    .map(([, label]) => label);

export default function FeaturedSection({
  dishes,
  getQuantity,
  onAdd,
  onDecrease,
  onIncrease,
  orderingEnabled = true,
}) {
  const viewportRef = useRef(null);
  const frameRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [explicitlyPaused, setExplicitlyPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pointerHeld, setPointerHeld] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [pageHidden, setPageHidden] = useState(
    typeof document !== "undefined" ? document.hidden : false
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  const scrollToIndex = useCallback((index, behavior = "smooth") => {
    const viewport = viewportRef.current;
    const slide = viewport?.children?.[index];
    if (!viewport || !slide) return;

    viewport.scrollTo({
      left:
        slide.offsetLeft -
        viewport.offsetLeft -
        (viewport.clientWidth - slide.clientWidth) / 2,
      behavior,
    });
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    setActiveIndex((current) =>
      Math.min(current, Math.max((dishes?.length || 1) - 1, 0))
    );
  }, [dishes?.length]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return undefined;

    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const update = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => () => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
  }, []);

  const autoplayPaused =
    explicitlyPaused || hovered || pointerHeld || focusWithin || pageHidden || reducedMotion;

  useEffect(() => {
    if (autoplayPaused || !dishes || dishes.length < 2) return undefined;

    const timer = window.setTimeout(() => {
      scrollToIndex((activeIndex + 1) % dishes.length);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [activeIndex, autoplayPaused, dishes, scrollToIndex]);

  const handleScroll = () => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      const slides = [...(viewport?.children || [])];
      if (!viewport || !slides.length) return;

      const closest = slides.reduce(
        (best, slide, index) => {
          const viewportCenter =
            viewport.scrollLeft + viewport.clientWidth / 2;
          const slideCenter =
            slide.offsetLeft - viewport.offsetLeft + slide.clientWidth / 2;
          const distance = Math.abs(
            slideCenter - viewportCenter
          );
          return distance < best.distance ? { index, distance } : best;
        },
        { index: 0, distance: Number.POSITIVE_INFINITY }
      );
      setActiveIndex(closest.index);
    });
  };

  if (!dishes || dishes.length === 0) return null;

  return (
    <section
      className="guest-specials"
      aria-roledescription="carousel"
      aria-label="Special picks"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={(event) => {
        setPointerHeld(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerUp={(event) => {
        setPointerHeld(false);
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => setPointerHeld(false)}
      onLostPointerCapture={() => setPointerHeld(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusWithin(false);
        }
      }}
    >
      <div className="guest-specials__header">
        <div>
          <span className="guest-specials__eyebrow">Worth discovering</span>
          <h2>Special picks</h2>
          <p>Swipe through what makes today’s menu stand out.</p>
        </div>

        {dishes.length > 1 && !reducedMotion && (
          <button
            type="button"
            className="guest-specials__pause"
            aria-pressed={explicitlyPaused}
            onClick={() => setExplicitlyPaused((current) => !current)}
          >
            {explicitlyPaused ? <FiPlay /> : <FiPause />}
            {explicitlyPaused ? "Play" : "Pause"}
          </button>
        )}
      </div>

      <div
        ref={viewportRef}
        className="guest-specials__viewport"
        onScroll={handleScroll}
        aria-live="off"
      >
        {dishes.map((dish, index) => {
          const labels = getSpecialLabels(dish);

          return (
            <article
              key={dish._id}
              className="guest-specials__slide"
              aria-label={`${dish.name}, slide ${index + 1} of ${dishes.length}`}
            >
              <div className="guest-specials__badges" aria-label="Special labels">
                {labels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <DishCard
                dish={dish}
                quantity={getQuantity(dish._id)}
                onAdd={onAdd}
                onDecrease={onDecrease}
                onIncrease={onIncrease}
                orderingEnabled={orderingEnabled}
              />
            </article>
          );
        })}
      </div>

      {dishes.length > 1 && (
        <div className="guest-specials__controls" aria-label="Choose a special pick">
          <span aria-live="polite">
            {activeIndex + 1} / {dishes.length}
          </span>
          <div>
            {dishes.map((dish, index) => (
              <button
                type="button"
                key={dish._id}
                className={index === activeIndex ? "is-active" : ""}
                aria-label={`Show ${dish.name}, slide ${index + 1} of ${dishes.length}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => scrollToIndex(index)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

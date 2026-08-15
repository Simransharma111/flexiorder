import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiWifiOff,
  FiSmartphone,
  FiZap,
} from "react-icons/fi";

const FACTS = [
  { icon: FiSmartphone, text: "Guests order without an app" },
  { icon: FiWifiOff, text: "Staff keep working offline" },
  { icon: FiZap, text: "One tap advances every order" },
];

const fadeUp = (reduce, delay = 0) => ({
  initial: reduce ? false : { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: "easeOut" },
});

function BoardCard({ edge, status, statusClass, location, time, children, note }) {
  return (
    <div className={`rounded-card border border-hairline border-l-4 bg-white p-3 shadow-card ${edge}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-extrabold text-ink">{location}</p>
        <span className={`text-[11px] font-bold ${statusClass}`}>{status}</span>
      </div>
      <p className="mt-1 text-xs text-ink-secondary">{children}</p>
      {note ? (
        <p className="mt-2 rounded-sm bg-note-surface px-2 py-1 text-[11px] font-semibold text-note-ink">
          {note}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] font-medium text-ink-disabled">{time}</p>
    </div>
  );
}

function ProductPreview() {
  return (
    <div
      className="w-full max-w-md rounded-panel border border-hairline bg-white p-4 shadow-lift"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-xs font-extrabold text-white">
            F
          </span>
          <p className="text-sm font-extrabold text-ink">Kitchen board</p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-ink-secondary">
          <span className="h-2 w-2 rounded-full bg-brand" />
          Online
        </span>
      </div>

      <div className="mt-3 flex gap-2 text-[11px] font-bold">
        <span className="rounded-full bg-status-new-surface px-2.5 py-1 text-status-new-ink">New · 1</span>
        <span className="rounded-full bg-status-preparing-surface px-2.5 py-1 text-status-preparing-ink">Preparing · 1</span>
        <span className="rounded-full bg-status-ready-surface px-2.5 py-1 text-status-ready-ink">Ready · 1</span>
      </div>

      <div className="mt-3 grid gap-2.5">
        <BoardCard
          edge="border-l-status-new-line"
          status="New"
          statusClass="text-status-new-line"
          location="Table 8"
          time="Waiting 2 min"
          note="Less spicy, allergy: peanuts"
        >
          2× Paneer Tikka · 1× Masala Dosa
        </BoardCard>
        <div className="grid grid-cols-2 gap-2.5">
          <BoardCard
            edge="border-l-status-preparing-line"
            status="Preparing"
            statusClass="text-status-preparing-line"
            location="Table 3"
            time="Started 12 min ago"
          >
            1× Veg Biryani · 2× Butter Naan
          </BoardCard>
          <BoardCard
            edge="border-l-status-ready-line"
            status="Ready"
            statusClass="text-status-ready-line"
            location="Takeaway"
            time="Ready for pickup"
          >
            2× Cold Coffee
          </BoardCard>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-canvas pb-16 pt-28 sm:pb-24 sm:pt-36">
      <div
        className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-brand-light blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-content items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <motion.div {...fadeUp(reduce)}>
          <p className="inline-flex items-center rounded-full border border-hairline bg-white px-3 py-1.5 text-xs font-bold text-brand">
            QR-first restaurant ordering
          </p>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            Ordering that keeps up with a busy kitchen.
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-ink-secondary sm:text-lg">
            Guests scan a QR and order from their table. Waiters, kitchen
            and owner stay in sync — even when the internet drops.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex min-h-12 items-center gap-2 rounded-card bg-brand px-6 text-sm font-bold text-white transition hover:bg-brand-strong"
            >
              Register your restaurant
              <FiArrowRight aria-hidden="true" />
            </Link>
            <a
              href="#workflow"
              className="inline-flex min-h-12 items-center rounded-card border border-hairline bg-white px-6 text-sm font-bold text-ink transition hover:border-edge"
            >
              See how it works
            </a>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-3">
            {FACTS.map((fact) => (
              <li key={fact.text} className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-card bg-brand-light text-brand">
                  <fact.icon size={16} aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold leading-4 text-ink-secondary">
                  {fact.text}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div {...fadeUp(reduce, 0.15)} className="flex justify-center lg:justify-end">
          <ProductPreview />
        </motion.div>
      </div>
    </section>
  );
}

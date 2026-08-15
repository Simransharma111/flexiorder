import { motion, useReducedMotion } from "framer-motion";
import {
  FiSmartphone,
  FiUsers,
  FiGrid,
  FiWifiOff,
  FiSliders,
  FiBarChart2,
} from "react-icons/fi";

const FEATURES = [
  {
    icon: FiSmartphone,
    title: "QR menu",
    description: "Guests scan, browse and order. Nothing to install.",
  },
  {
    icon: FiGrid,
    title: "Kitchen display",
    description: "Dense order board with New, Preparing and Ready at a glance.",
  },
  {
    icon: FiUsers,
    title: "Waiter workspace",
    description: "Take orders by table, room or takeaway in a few taps.",
  },
  {
    icon: FiWifiOff,
    title: "Offline-first",
    description: "Orders save locally and sync when the connection returns.",
  },
  {
    icon: FiSliders,
    title: "Menu control",
    description: "One-tap availability, bulk edits, discounts and GST.",
  },
  {
    icon: FiBarChart2,
    title: "Reports",
    description: "Revenue, orders and item history by day, week or month.",
  },
];

export default function Features() {
  const reduce = useReducedMotion();

  return (
    <section id="features" className="bg-canvas py-16 sm:py-24">
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="max-w-xl"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Everything a busy restaurant uses daily
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
              className="rounded-sheet border border-hairline bg-white p-5 shadow-card"
            >
              <span className="grid h-11 w-11 place-items-center rounded-card bg-brand-light text-brand">
                <feature.icon size={20} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-extrabold text-ink">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

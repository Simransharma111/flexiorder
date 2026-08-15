import { motion, useReducedMotion } from "framer-motion";
import {
  FiSmartphone,
  FiBookOpen,
  FiGrid,
  FiCheckCircle,
} from "react-icons/fi";

const STEPS = [
  {
    icon: FiSmartphone,
    title: "Scan the QR",
    description: "Guests open the menu from their table. No app, no account.",
  },
  {
    icon: FiBookOpen,
    title: "Order from the menu",
    description: "Live prices, veg and non-veg marks, GST included.",
  },
  {
    icon: FiGrid,
    title: "Kitchen prepares",
    description: "New orders appear on the board instantly. One tap advances.",
  },
  {
    icon: FiCheckCircle,
    title: "Serve and track",
    description: "Ready orders reach the waiter. History stays in reports.",
  },
];

export default function Workflow() {
  const reduce = useReducedMotion();

  return (
    <section id="workflow" className="border-y border-hairline bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="max-w-xl"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            From QR scan to served plate
          </h2>
          <p className="mt-3 text-base leading-7 text-ink-secondary">
            Four steps. No training needed.
          </p>
        </motion.div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
              className="rounded-sheet border border-hairline bg-canvas p-5"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-card bg-brand-light text-brand">
                  <step.icon size={20} aria-hidden="true" />
                </span>
                <span className="text-sm font-extrabold text-ink-disabled">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-4 text-base font-extrabold text-ink">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
                {step.description}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

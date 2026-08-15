import { motion, useReducedMotion } from "framer-motion";
import { CONTACTS } from "../../constants/contacts";

const LANDING_CONTACTS = CONTACTS.filter((contact) =>
  ["Email", "Call", "WhatsApp"].includes(contact.label)
);

export default function Contact() {
  const reduce = useReducedMotion();

  return (
    <section id="contact" className="border-t border-hairline bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="max-w-xl"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            Contact
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Set up FlexiOrder at your restaurant
          </h2>
          <p className="mt-3 text-base leading-7 text-ink-secondary">
            Questions about onboarding or pricing? Reach out directly.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {LANDING_CONTACTS.map((contact, index) => (
            <motion.a
              key={contact.label}
              href={contact.href}
              target={contact.href.startsWith("http") ? "_blank" : undefined}
              rel={contact.href.startsWith("http") ? "noreferrer" : undefined}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
              className="group rounded-sheet border border-hairline bg-canvas p-5 transition hover:border-edge hover:bg-white"
            >
              <span className="grid h-11 w-11 place-items-center rounded-card bg-brand-light text-brand">
                <contact.icon size={20} aria-hidden="true" />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-ink-disabled">
                {contact.label}
              </p>
              <p className="mt-1 text-sm font-bold text-ink group-hover:text-brand">
                {contact.value}
              </p>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

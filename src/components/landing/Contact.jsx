import { motion } from "framer-motion";
import { FiMail, FiPhone, FiMessageCircle } from "react-icons/fi";
import { Link } from "react-router-dom";

const CONTACTS = [
  {
    icon: FiMail,
    label: "Email us",
    value: "ishwrknt@gmail.com",
    href: "mailto:ishwrknt@gmail.com",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: FiPhone,
    label: "Call us",
    value: "+91 78761 29329",
    href: "tel:+917876129329",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: FiPhone,
    label: "WhatsApp",
    value: "+91 86792 50661",
    href: "https://wa.me/918679250661",
    color: "from-green-500 to-emerald-600",
  },
];

export default function Contact() {
  return (
    <section id="contact" className="bg-slate-950 py-28 text-white border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
            GET IN TOUCH
          </span>

          <h2 className="mt-6 text-5xl font-black">
            Contact the{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Flexi Team
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Have questions about setting up FlexiOrder for your restaurant? We're here to help — reach out any time.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {CONTACTS.map((contact, index) => {
            const Icon = contact.icon;
            return (
              <motion.a
                key={contact.value}
                href={contact.href}
                target={contact.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl text-left transition-colors hover:border-white/20"
              >
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${contact.color}`}>
                  <Icon size={24} />
                </div>

                <p className="text-sm text-slate-400 mb-1">{contact.label}</p>
                <p className="text-lg font-bold break-all">{contact.value}</p>

                <div className={`absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-gradient-to-br ${contact.color} opacity-10 blur-3xl transition-all duration-500 group-hover:scale-150`} />
              </motion.a>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-20 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 to-cyan-600/10 p-12 text-center"
        >
          <FiMessageCircle size={40} className="mx-auto mb-4 text-blue-400" />
          <h3 className="text-3xl font-black mb-3">Ready to transform your restaurant?</h3>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Sign up in minutes — no hardware needed. Just your phone or tablet.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 font-semibold transition hover:bg-blue-700"
            >
              Start Free Trial
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-8 py-4 font-semibold transition hover:bg-white/10"
            >
              Login
            </Link>
          </div>
        </motion.div>

      </div>

      {/* Footer strip */}
      <div className="mt-20 border-t border-white/10 pt-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} FlexiOrder · Built for restaurants that move fast
      </div>
    </section>
  );
}

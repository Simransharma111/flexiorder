import { motion } from "framer-motion";
import {
  FiSmartphone,
  FiUsers,
  FiGrid,
  FiBarChart2,
  FiShield,
  FiCpu,
} from "react-icons/fi";

const features = [
  {
    icon: FiSmartphone,
    title: "QR Ordering",
    desc: "Customers scan a QR code, browse the menu, and place orders without downloading an app.",
    color: "from-sky-500 to-cyan-500",
  },
  {
    icon: FiUsers,
    title: "Staff Ordering",
    desc: "Waiters can instantly create orders using a beautiful POS interface.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: FiGrid,
    title: "Kitchen Display",
    desc: "Incoming orders automatically appear on the kitchen dashboard in real time.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: FiBarChart2,
    title: "Analytics",
    desc: "Track sales, popular dishes, revenue and peak hours with live reports.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: FiShield,
    title: "Role Management",
    desc: "Separate permissions for owners, managers, cashiers, waiters and kitchen staff.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: FiCpu,
    title: "Smart Automation",
    desc: "Real-time updates, notifications and business insights powered by automation.",
    color: "from-purple-500 to-fuchsia-500",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="bg-slate-950 py-28 text-white"
    >
      <div className="mx-auto max-w-7xl px-6">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .6 }}
          className="text-center"
        >
          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
            EVERYTHING YOU NEED
          </span>

          <h2 className="mt-6 text-5xl font-black">
            Powerful Features
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-400">
            Built to simplify restaurant operations from the first order
            to the final payment.
          </p>
        </motion.div>

        <div className="mt-20 grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: .5,
                  delay: index * .08,
                }}
                whileHover={{
                  y: -10,
                  scale: 1.03,
                }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
              >

                <div
                  className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color}`}
                >
                  <Icon size={28} />
                </div>

                <h3 className="text-2xl font-bold">
                  {feature.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-400">
                  {feature.desc}
                </p>

                <div
                  className={`absolute -right-12 -bottom-12 h-36 w-36 rounded-full bg-gradient-to-br ${feature.color} opacity-10 blur-3xl transition-all duration-500 group-hover:scale-150`}
                />

              </motion.div>
            );
          })}

        </div>

      </div>
    </section>
  );
}
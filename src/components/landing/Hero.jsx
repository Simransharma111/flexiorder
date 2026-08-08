import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiPlay,
  FiShoppingBag,
  FiUsers,
  FiTrendingUp,
  FiCheckCircle,
} from "react-icons/fi";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 pt-40 pb-24 text-white">

      {/* Background Glow */}

      <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[150px]" />

      <div className="absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[150px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">

        {/* Left */}

        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .8 }}
        >

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
            Built for busy restaurant teams
          </div>

          <h1 className="text-5xl font-black leading-tight lg:text-7xl">

            Run Your

            <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Restaurant
            </span>

            Smarter.
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-8 text-slate-300">

            Everything your restaurant needs in one place.

            QR Ordering.

            Waiter Ordering.

            Kitchen Display.

            Staff Management.

            Analytics.

          </p>

          <div className="mt-10 flex flex-wrap gap-4">

            <Link
              to="/register"
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-7 py-4 font-semibold transition hover:bg-blue-700"
            >

              Start Free Trial

              <FiArrowRight />

            </Link>

            <a
              href="#workflow"
              className="flex items-center gap-2 rounded-2xl border border-white/10 px-7 py-4 transition hover:bg-white/10"
            >

              <FiPlay />

              See How It Works

            </a>

          </div>

          <div className="mt-12 flex flex-wrap gap-8">

            <div>

              <h2 className="text-2xl font-bold">QR-first</h2>

              <p className="text-slate-400">
                No customer app
              </p>

            </div>

            <div>

              <h2 className="text-2xl font-bold">Offline-aware</h2>

              <p className="text-slate-400">
                Staff queues
              </p>

            </div>

            <div>

              <h2 className="text-2xl font-bold">Live workflow</h2>

              <p className="text-slate-400">
                Waiter and kitchen
              </p>

            </div>

          </div>

        </motion.div>

        {/* Right */}

        <motion.div
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative"
        >

          {/* Main Dashboard */}

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">

            <div className="grid grid-cols-2 gap-5">

              <Stat
                icon={<FiTrendingUp />}
                title="Revenue"
                value="₹18,240"
              />

              <Stat
                icon={<FiShoppingBag />}
                title="Orders"
                value="128"
              />

              <Stat
                icon={<FiUsers />}
                title="Staff"
                value="15"
              />

              <Stat
                icon={<FiCheckCircle />}
                title="Completed"
                value="97%"
              />

            </div>

            <div className="mt-8 rounded-2xl bg-slate-900/70 p-5">

              <div className="mb-4 flex justify-between">

                <span className="font-semibold">

                  Incoming Orders

                </span>

                <span className="text-emerald-400">

                  LIVE

                </span>

              </div>

              <Order table="Table 8" item="2 Burgers" />

              <Order table="Table 5" item="Pizza + Coke" />

              <Order table="Table 2" item="Pasta" />

            </div>

          </div>

          {/* Floating Card */}

          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{
              duration: 5,
              repeat: Infinity,
            }}
            className="absolute -left-10 top-10 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl"
          >

            <p className="text-sm text-slate-400">

              Kitchen Status

            </p>

            <h3 className="mt-2 text-2xl font-bold text-emerald-400">

              12 Active

            </h3>

          </motion.div>

        </motion.div>

      </div>

    </section>
  );
}

function Stat({ icon, title, value }) {
  return (
    <div className="rounded-2xl bg-slate-900/70 p-5">
      <div className="text-blue-400 text-xl">
        {icon}
      </div>

      <p className="mt-3 text-sm text-slate-400">
        {title}
      </p>

      <h2 className="mt-1 text-2xl font-bold">
        {value}
      </h2>
    </div>
  );
}

function Order({ table, item }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-xl bg-white/5 p-3">
      <div>
        <p className="font-medium">
          {table}
        </p>

        <p className="text-sm text-slate-400">
          {item}
        </p>
      </div>

      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
        New
      </span>
    </div>
  );
}

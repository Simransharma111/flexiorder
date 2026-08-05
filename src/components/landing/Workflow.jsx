import { motion } from "framer-motion";
import {
  FiSmartphone,
  FiBookOpen,
  FiShoppingCart,
  FiCoffee,
  FiCheckCircle,
} from "react-icons/fi";

const steps = [
  {
    icon: FiSmartphone,
    title: "Scan QR Code",
    description:
      "Guests simply scan the QR code on their table. No app installation required.",
    color: "from-sky-500 to-blue-600",
  },
  {
    icon: FiBookOpen,
    title: "Browse Digital Menu",
    description:
      "View categories, photos, prices and customize orders in seconds.",
    color: "from-indigo-500 to-violet-600",
  },
  {
    icon: FiShoppingCart,
    title: "Place Order",
    description:
      "Orders instantly reach the kitchen and owner dashboard in real time.",
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: FiCoffee,
    title: "Kitchen Prepares",
    description:
      "Kitchen staff receives live updates and tracks cooking progress.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: FiCheckCircle,
    title: "Serve & Complete",
    description:
      "Waiters receive ready notifications and serve guests quickly.",
    color: "from-pink-500 to-rose-500",
  },
];

export default function Workflow() {
  return (
    <section
      id="workflow"
      className="relative overflow-hidden bg-white py-28"
    >
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .6 }}
          className="text-center"
        >
          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            HOW IT WORKS
          </span>

          <h2 className="mt-6 text-5xl font-black text-slate-900">
            From QR Scan to
            <span className="block text-blue-600">
              Delicious Food
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-500">
            FlexiOrder simplifies every step of restaurant operations—
            from customer ordering to kitchen preparation and final service.
          </p>
        </motion.div>

        <div className="relative mt-24">

          <div className="absolute left-0 right-0 top-16 hidden h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 lg:block rounded-full" />

          <div className="grid gap-10 lg:grid-cols-5">

            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: .5,
                    delay: index * .15,
                  }}
                  className="relative"
                >
                  <div
                    className={`mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${step.color} text-white shadow-2xl`}
                  >
                    <Icon size={34} />
                  </div>

                  <div className="mt-8 text-center">

                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-bold">
                      {index + 1}
                    </span>

                    <h3 className="mt-5 text-xl font-bold text-slate-900">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-500">
                      {step.description}
                    </p>

                  </div>
                </motion.div>
              );
            })}

          </div>

        </div>
      </div>
    </section>
  );
}

import {
  FiShoppingBag,
  FiClock,
  FiActivity,
  FiBarChart2
} from "react-icons/fi";

import StatCard from "./StatCard";


export default function StatGrid({
  orderStats = {},
  theme = {}
}) {


  const {
    total = 0,
    active = 0,
    pending = 0,
    preparing = 0,
    revenue = 0
  } = orderStats;


  return (

    <div
      className="
      grid
      grid-cols-2
      gap-3
      lg:grid-cols-4
      "
    >


      <StatCard

        icon={FiShoppingBag}

        title="Total Orders"

        value={total}

        subtitle="All orders"

        {...theme}

      />



      <StatCard

        icon={FiClock}

        title="Active Orders"

        value={active}

        subtitle={`${pending} new`}

        {...theme}

      />



      <StatCard

        icon={FiActivity}

        title="Preparing"

        value={preparing}

        subtitle="Kitchen queue"

        {...theme}

      />



      <StatCard

        icon={FiBarChart2}

        title="Revenue"

        value={`₹${Number(revenue).toFixed(2)}`}

        subtitle="Current"

        {...theme}

      />


    </div>

  );

}

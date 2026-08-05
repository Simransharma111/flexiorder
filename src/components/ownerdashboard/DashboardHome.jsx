import React from "react";

import DashboardHero from "./DashboardHero";
import StatGrid from "./StatGrid";
import QuickActions from "./QuickActions";
import RecentOrders from "./RecentOrders";


export default function DashboardHome({

hotel,
orders,
orderStats,

onChangeTab,
onViewAll,

renderOrderCard,

theme

}) {


return (

<div className="space-y-6">


<DashboardHero

hotel={hotel}

onChangeTab={onChangeTab}

theme={theme}

/>



<StatGrid

orderStats={orderStats}

theme={theme}

/>



<QuickActions

onChangeTab={onChangeTab}

theme={theme}

/>



<RecentOrders

orders={orders}

renderOrderCard={renderOrderCard}

onViewAll={onViewAll}

theme={theme}

/>


</div>


)

}
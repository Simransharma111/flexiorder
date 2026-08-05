import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiActivity,
  FiBarChart2,
  FiBox,
  FiCheckCircle,
  FiClock,
  FiGrid,
  FiPackage,
  FiSettings,
  FiShoppingBag,
  FiTable,
  FiUsers,
} from "react-icons/fi";


import { useNavigate } from "react-router-dom";


// API
import api from "../api/axios";


// Socket
import socket from "../socket";


// Dashboard Components
import Header from "../components/ownerdashboard/Header";
import Sidebar from "../components/ownerdashboard/Sidebar";
import OrderCard from "../components/ownerdashboard/OrderCard";
import Overview from "../components/ownerdashboard/Overview";
import StatCard from "../components/ownerdashboard/StatCard";


// Managers
import OwnerMenuManager from "../components/OwnerMenuManager";
import TableQRManager from "../components/TableQRManager";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import StaffManager from "../components/StaffManager";


// Pages
import QRInventory from "./QRInventoryPage";
import OwnerHotelSettings from "./OwnerHotelSettings";


// Themes
import HOTEL_THEMES from "../constants/hotelThemes";


import Orders from "../components/ownerdashboard/Orders";


/*
=========================================================
NAVIGATION ITEMS
=========================================================
*/

const NAV_ITEMS = [

{
  key:"overview",
  label:"Overview",
  icon:FiGrid
},


{
  key:"kitchen",
  label:"Kitchen",
  icon:FiActivity
},


{
  key:"orders",
  label:"Orders",
  icon:FiShoppingBag
},


{
  key:"menu",
  label:"Menu",
  icon:FiPackage
},


{
  key:"staff",
  label:"Staff",
  icon:FiUsers
},


{
  key:"tables",
  label:"QR Tables",
  icon:FiTable
},


{
  key:"analytics",
  label:"Analytics",
  icon:FiBarChart2
},


{
  key:"inventory",
  label:"Inventory",
  icon:FiBox
},


{
  key:"settings",
  label:"Settings",
  icon:FiSettings
}

];







/*
=========================================================
ORDER STATUS CONFIG
=========================================================
*/


const STATUS_CONFIG = {

pending:{
  label:"New",
  icon:FiClock
},


accepted:{
  label:"Accepted",
  icon:FiActivity
},


preparing:{
  label:"Preparing",
  icon:FiActivity
},


ready:{
  label:"Ready",
  icon:FiCheckCircle
},


delivered:{
  label:"Completed",
  icon:FiCheckCircle
},


cancelled:{
  label:"Cancelled",
  icon:FiActivity
}

};







export default function OwnerDashboard(){


const navigate = useNavigate();



/*
=========================================================
STATES
=========================================================
*/


const [activeTab,setActiveTab] = useState(
"overview"
);



const [hotel,setHotel] = useState(null);



const [orders,setOrders] = useState([]);

const [newOrderCount,setNewOrderCount]=useState(0);

const [loadingOrders,setLoadingOrders] = useState(false);



const [sidebarOpen,setSidebarOpen] = useState(false);



const [refreshKey,setRefreshKey] = useState(0);



/*
FILTER FOR ORDERS PAGE
*/

const [orderFilter,setOrderFilter] = useState(
"all"
);






/*
=========================================================
THEME SYSTEM
=========================================================
*/


const defaultTheme = HOTEL_THEMES.midnight_moss;


const currentTheme =
hotel?.theme?.id &&
HOTEL_THEMES[hotel.theme.id]
?
HOTEL_THEMES[hotel.theme.id]
:
defaultTheme;





const primaryColor =
hotel?.theme?.primary ||
hotel?.theme?.primaryColor ||
currentTheme.primary;



const secondaryColor =
hotel?.theme?.secondary ||
hotel?.theme?.secondaryColor ||
currentTheme.secondary;




const accentColor =
hotel?.theme?.accent ||
hotel?.theme?.accentColor ||
currentTheme.accent;




const themeText =
hotel?.theme?.text ||
currentTheme.text ||
"#FFFFFF";






/*
=========================================================
HEX TO RGBA HELPER
=========================================================
*/


const hexToRgba = (
hex,
alpha=1
)=>{


if(!hex)
return `rgba(255,255,255,${alpha})`;



let h =
hex.replace("#","");



if(h.length===3){

h =
h
.split("")
.map(
c=>c+c
)
.join("");

}



const num =
parseInt(h,16);



const r =
(num>>16)&255;


const g =
(num>>8)&255;


const b =
num&255;



return `
rgba(
${r},
${g},
${b},
${alpha}
)
`;

};







/*
=========================================================
THEME VALUES
=========================================================
*/


const themeStyles = {


surfaceBg:
hexToRgba(
themeText,
0.05
),



itemBg:
hexToRgba(
themeText,
0.08
),



mutedText:
hexToRgba(
themeText,
0.65
),



borderColor:
hexToRgba(
themeText,
0.12
),



headerBg:
hexToRgba(
secondaryColor,
0.85
)


};





const isDark =
currentTheme.mode==="dark";


 /*
=========================================================
FETCH HOTEL
=========================================================
*/


const fetchHotel = async()=>{

try{


const res = await api.get(
"/hotel/me"
);


setHotel(
res.data.hotel
);


}
catch(error){

console.log(
"Hotel fetch error",
error
);

}

};







/*
=========================================================
FETCH ORDERS
=========================================================
*/


const fetchOrders = async()=>{


try{


setLoadingOrders(true);



const res = await api.get(
"/orders"
);



setOrders(
res.data.orders || []
);



}
catch(error){

console.log(
"Orders fetch error",
error
);


}
finally{


setLoadingOrders(false);


}


};







/*
=========================================================
INITIAL LOAD
=========================================================
*/


useEffect(()=>{


fetchHotel();

fetchOrders();


},[]);








/*
=========================================================
SOCKET REALTIME ORDERS
=========================================================
*/


useEffect(()=>{


if(!hotel?._id)
return;



socket.emit(
"joinHotel",
hotel._id
);



const handleNewOrder=(newOrder)=>{


console.log(
"New order received:",
newOrder
);



setOrders(prev=>[
newOrder,
...prev
]);



setNewOrderCount(
prev=>prev+1
);


};



socket.on(
"newOrder",
handleNewOrder
);



return ()=>{


socket.off(
"newOrder",
handleNewOrder
);


};


},[
hotel
]);




/*
=========================================================
LOGOUT
=========================================================
*/


const handleLogout = ()=>{


localStorage.removeItem(
"token"
);


localStorage.removeItem(
"user"
);


localStorage.removeItem(
"role"
);



navigate(
"/login"
);


};









/*
=========================================================
ORDER STATISTICS
=========================================================
*/


const orderStats = useMemo(()=>{


const active =
orders.filter(
(order)=>
![
"delivered",
"cancelled"
]
.includes(
order.status
)
);



const pending =
orders.filter(
order=>
order.status==="pending"
);



const preparing =
orders.filter(
order=>
[
"accepted",
"preparing"
]
.includes(
order.status
)
);



const ready =
orders.filter(
order=>
order.status==="ready"
);



const completed =
orders.filter(
order=>
order.status==="delivered"
);



const revenue =
orders
.filter(
order=>
order.status!=="cancelled"
)
.reduce(
(total,order)=>
total+
Number(
order.totalAmount || 0
),
0
);



return {


total:
orders.length,


active:
active.length,


pending:
pending.length,


preparing:
preparing.length,


ready:
ready.length,


completed:
completed.length,


revenue


};


},[
orders
]);









/*
=========================================================
FILTER ORDERS
=========================================================
*/


const filteredOrders =
useMemo(()=>{


if(
orderFilter==="all"
)
return orders;



if(
orderFilter==="active"
){


return orders.filter(
order=>
![
"delivered",
"cancelled"
]
.includes(
order.status
)
);


}



return orders.filter(
order=>
order.status===orderFilter
);


},[
orders,
orderFilter
]);









/*
=========================================================
TAB CHANGE
=========================================================
*/


const changeTab=(tab)=>{


setActiveTab(tab);


setSidebarOpen(false);



if(tab==="orders" || tab==="kitchen"){

setNewOrderCount(0);

fetchOrders();

}






if(
tab==="orders" ||
tab==="kitchen"
){

fetchOrders();

}


};









/*
=========================================================
FORMAT TIME
=========================================================
*/


const formatTime = (
date
)=>{


if(!date)
return "";



return new Date(
date
)
.toLocaleTimeString(
[],
{
hour:"2-digit",
minute:"2-digit"
}
);


};









/*
=========================================================
LOCATION LABEL
=========================================================
*/


const getLocationLabel = (
order
)=>{


if(
order.locationType==="room"
){


return `Room ${
order.locationNumber ||
order.roomNumber ||
"-"
}`;


}



return `Table ${
order.locationNumber ||
order.roomNumber ||
"-"
}`;



};









/*
=========================================================
ORDER CARD WRAPPER
=========================================================
*/


const renderOrderCard = (
order
)=>(


<OrderCard

key={
order._id
}


order={
order
}


statusConfig={
STATUS_CONFIG
}



formatTime={
formatTime
}



getLocationLabel={
getLocationLabel
}



onManage={()=>
changeTab(
"kitchen"
)
}



primaryColor={
primaryColor
}



accentColor={
accentColor
}



mutedText={
themeStyles.mutedText
}



themeText={
themeText
}



surfaceBg={
themeStyles.surfaceBg
}



borderColor={
themeStyles.borderColor
}



itemBg={
themeStyles.itemBg
}



isDark={
isDark
}


/>


);









/*
=========================================================
REFRESH
=========================================================
*/


const handleRefresh = ()=>{


setRefreshKey(
prev=>prev+1
);



fetchHotel();


fetchOrders();


};
return (

<div
className="min-h-screen"
style={{
background: secondaryColor,
color: themeText
}}
>


{/* =====================================================
    MOBILE SIDEBAR
===================================================== */}


{
sidebarOpen && (

<div

className="
fixed
inset-0
z-50
bg-black/60
backdrop-blur-sm
md:hidden
"

onClick={()=>
setSidebarOpen(false)
}

>


<aside

className="
h-full
w-[280px]
border-r
"

style={{

background:secondaryColor,

borderColor:
themeStyles.borderColor

}}


onClick={(e)=>
e.stopPropagation()
}

>


<Sidebar


hotel={
hotel
}



activeTab={
activeTab
}



navItems={
NAV_ITEMS
}



onNavigate={
changeTab
}



onLogout={
handleLogout
}



orderStats={
orderStats
}



primaryColor={
primaryColor
}



secondaryColor={
secondaryColor
}



themeText={
themeText
}



mutedText={
themeStyles.mutedText
}



surfaceBg={
themeStyles.surfaceBg
}



borderColor={
themeStyles.borderColor
}


/>


</aside>


</div>


)

}









{/* =====================================================
    MAIN FLEX WRAPPER
===================================================== */}



<div
className="
flex
min-h-screen
"

>









{/* =====================================================
    DESKTOP SIDEBAR
===================================================== */}


<aside

className="
fixed
hidden
md:block
h-screen
w-[250px]
border-r
"


style={{

background:
secondaryColor,


borderColor:
themeStyles.borderColor

}}


>


<Sidebar


hotel={
hotel
}



activeTab={
activeTab
}



navItems={
NAV_ITEMS
}



onNavigate={
changeTab
}



onLogout={
handleLogout
}



orderStats={
orderStats
}



primaryColor={
primaryColor
}



secondaryColor={
secondaryColor
}



themeText={
themeText
}



mutedText={
themeStyles.mutedText
}



surfaceBg={
themeStyles.surfaceBg
}



borderColor={
themeStyles.borderColor
}


/>


</aside>









{/* =====================================================
    RIGHT CONTENT AREA
===================================================== */}


<div

className="
w-full
md:ml-[250px]
"

>



<Header


hotel={
hotel
}



activeTab={
activeTab
}



navItems={
NAV_ITEMS
}


newOrderCount={newOrderCount}

onMenuToggle={()=>
setSidebarOpen(true)
}



onRefresh={
handleRefresh
}



loadingOrders={
loadingOrders
}



orderStats={
orderStats
}



primaryColor={
primaryColor
}



accentColor={
accentColor
}



themeText={
themeText
}



mutedText={
themeStyles.mutedText
}



borderColor={
themeStyles.borderColor
}



headerBg={
themeStyles.headerBg
}


/>








<main

className="
mx-auto
max-w-[1600px]
p-4
md:p-6
lg:p-8
"

>
  {/* =====================================================
    OVERVIEW
===================================================== */}


{
activeTab==="overview" && (

<Overview


hotel={
hotel
}



orders={
orders
}



orderStats={
orderStats
}



onChangeTab={
changeTab
}



renderOrderCard={
renderOrderCard
}



primaryColor={
primaryColor
}



secondaryColor={
secondaryColor
}



accentColor={
accentColor
}



themeText={
themeText
}



themeStyles={
themeStyles
}



isDark={
isDark
}



onViewAll={()=>{

setOrderFilter("all");

changeTab(
"orders"
);

}}


/>


)

}








{
activeTab==="orders" && (

<Orders

orders={orders}

orderStats={orderStats}

renderOrderCard={renderOrderCard}

themeStyles={themeStyles}

themeText={themeText}

accentColor={accentColor}

/>

)
}

{/* =====================================================
    KITCHEN DASHBOARD
===================================================== */}



{
activeTab==="kitchen" && (


<div

className="
space-y-5
"

>


<div>


<h1
className="
text-2xl
font-bold
"
>

Kitchen Dashboard

</h1>



<p

className="
text-sm
"

style={{

color:
themeStyles.mutedText

}}

>

Manage cooking queue

</p>


</div>



{/* KITCHEN STATS */}


<div

className="
grid
grid-cols-2
md:grid-cols-4
gap-3
"

>



<StatCard


icon={
FiClock
}


title="New"


value={
orderStats.pending
}


subtitle="Waiting"


primaryColor={
primaryColor
}


accentColor={
accentColor
}


mutedText={
themeStyles.mutedText
}


surfaceBg={
themeStyles.surfaceBg
}


borderColor={
themeStyles.borderColor
}


themeText={
themeText
}


/>

<StatCard


icon={
FiActivity
}


title="Preparing"


value={
orderStats.preparing
}


subtitle="Kitchen"


primaryColor={
primaryColor
}


accentColor={
accentColor
}


mutedText={
themeStyles.mutedText
}


surfaceBg={
themeStyles.surfaceBg
}


borderColor={
themeStyles.borderColor
}


themeText={
themeText
}


/>

<StatCard


icon={
FiCheckCircle
}


title="Ready"


value={
orderStats.ready
}


subtitle="Serve"


primaryColor={
primaryColor
}


accentColor={
accentColor
}


mutedText={
themeStyles.mutedText
}


surfaceBg={
themeStyles.surfaceBg
}


borderColor={
themeStyles.borderColor
}


themeText={
themeText
}


/>

<StatCard


icon={
FiShoppingBag
}


title="Active"


value={
orderStats.active
}


subtitle="Orders"


primaryColor={
primaryColor
}


accentColor={
accentColor
}


mutedText={
themeStyles.mutedText
}


surfaceBg={
themeStyles.surfaceBg
}


borderColor={
themeStyles.borderColor
}


themeText={
themeText
}


/>



</div>



{/* KITCHEN ORDER QUEUE */}



<div

className="
space-y-3
"

>


{

orders

.filter(
order=>

!

[
"delivered",
"cancelled"
]

.includes(
order.status
)

)

.map(
(order)=>

renderOrderCard(order)

)


}



</div>




</div>


)

}
{/* =====================================================
    MENU MANAGEMENT
===================================================== */}


{
activeTab==="menu" && (

<OwnerMenuManager

refreshKey={
refreshKey
}

setRefreshKey={
setRefreshKey
}

/>

)

}





{/* =====================================================
    STAFF MANAGEMENT
===================================================== */}


{
activeTab==="staff" && (

<StaffManager />

)

}



{/* =====================================================
    QR TABLE MANAGEMENT
===================================================== */}


{
activeTab==="tables" && (

<TableQRManager


refreshKey={
refreshKey
}


setRefreshKey={
setRefreshKey
}


/>

)

}



{/* =====================================================
    ANALYTICS
===================================================== */}


{
activeTab==="analytics" && (

<AnalyticsDashboard />

)

}


{/* =====================================================
    INVENTORY / QR INVENTORY
===================================================== */}


{
activeTab==="inventory" && (

<QRInventory


refreshKey={
refreshKey
}


setRefreshKey={
setRefreshKey
}


/>

)

}


{/* =====================================================
    HOTEL SETTINGS
===================================================== */}


{
activeTab==="settings" && (

<OwnerHotelSettings />

)

}



</main>


</div>


</div>


</div>


);

}
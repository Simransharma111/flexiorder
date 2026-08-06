import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiBarChart2,
  FiBox,
  FiPackage,
  FiSettings,
  FiShoppingBag,
  FiTable,
  FiUsers,
} from "react-icons/fi";

import { useNavigate } from "react-router-dom";

import api from "../api/axios";
import socket from "../socket";

import Header from "../components/ownerdashboard/Header";
import Sidebar from "../components/ownerdashboard/Sidebar";

import DashboardHome from "../components/ownerdashboard/DashboardHome";
import Orders from "../components/ownerdashboard/Orders";

import OwnerMenuManager from "../components/OwnerMenuManager";
import TableQRManager from "../components/TableQRManager";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import StaffManager from "../components/StaffManager";
import StaffOrder from "./StaffOrder";

import QRInventory from "./QRInventoryPage";
import OwnerHotelSettings from "./OwnerHotelSettings";

import HOTEL_THEMES from "../constants/hotelThemes";



const NAV_ITEMS = [

{
key:"home",
label:"Dashboard",
icon:FiBarChart2
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
key:"staffOrder",
label:"Staff Order",
icon:FiShoppingBag
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



export default function OwnerDashboard(){

const navigate = useNavigate();



const [hotel,setHotel]=useState(null);

const [orders,setOrders]=useState([]);

const [activeTab,setActiveTab]=useState("home");

const [sidebarOpen,setSidebarOpen]=useState(false);

const [loadingOrders,setLoadingOrders]=useState(false);

const [newOrderCount,setNewOrderCount]=useState(0);

const [refreshKey,setRefreshKey]=useState(0);





/*
====================================
FETCH HOTEL
====================================
*/

const fetchHotel=async()=>{

try{

const res=await api.get(
"/hotel/me"
);

setHotel(
res.data.hotel
);


}
catch(error){

console.log(
"Hotel error",
error
);

}

};





/*
====================================
FETCH ORDERS
====================================
*/

const fetchOrders=async()=>{

try{

setLoadingOrders(true);


const res = await api.get("/kitchen/orders?type=kitchen");


setOrders(
res.data.orders || []
);


}
catch(error){

console.log(
"Orders error",
error
);

}
finally{

setLoadingOrders(false);

}

};






useEffect(()=>{

fetchHotel();
fetchOrders();

},[]);







/*
====================================
SOCKET
====================================
*/


useEffect(()=>{

if(!hotel?._id)
return;


socket.emit(
"joinHotel",
hotel._id
);



const newOrderHandler=(order)=>{


setOrders(prev=>[
order,
...prev
]);


setNewOrderCount(
prev=>prev+1
);


};



socket.on(
"newOrder",
newOrderHandler
);



return ()=>{

socket.off(
"newOrder",
newOrderHandler
);

};


},[
hotel
]);







/*
====================================
LOGOUT
====================================
*/

const logout=()=>{


localStorage.removeItem(
"token"
);

localStorage.removeItem(
"user"
);


navigate(
"/login"
);


};








/*
====================================
THEME
====================================
*/


const theme =
hotel?.theme?.id &&
HOTEL_THEMES[hotel.theme.id]

?

HOTEL_THEMES[hotel.theme.id]

:

HOTEL_THEMES.midnight_moss;



const primaryColor =
hotel?.theme?.primary ||
theme.primary;



const secondaryColor =
hotel?.theme?.secondary ||
theme.secondary;



const accentColor =
hotel?.theme?.accent ||
theme.accent;



const themeText =
theme.text || "#fff";







const stats=useMemo(()=>{


const revenue =
orders
.filter(
o=>o.status!=="cancelled"
)
.reduce(
(sum,o)=>
sum+
Number(o.totalAmount||0),
0
);



return {


orders:
orders.length,


pending:
orders.filter(
o=>o.status==="pending"
).length,


preparing:
orders.filter(
o=>
[
"accepted",
"preparing"
]
.includes(o.status)
).length,


ready:
orders.filter(
o=>o.status==="ready"
).length,


revenue


};


},[
orders
]);









const changeTab=(tab)=>{


setActiveTab(tab);

setSidebarOpen(false);


if(
tab==="orders"
){

setNewOrderCount(0);

}


};






const refresh=()=>{

setRefreshKey(
v=>v+1
);

fetchHotel();

fetchOrders();

};








return (

<div

className="min-h-screen"

style={{
background:secondaryColor,
color:themeText
}}

>


{/* MOBILE SIDEBAR */}

{
sidebarOpen &&

<div

className="
fixed inset-0
z-50
bg-black/50
md:hidden
"

onClick={()=>
setSidebarOpen(false)
}

>

<div

className="
w-[270px]
h-full
"

style={{
background:secondaryColor
}}

onClick={
e=>e.stopPropagation()
}

>

<Sidebar

hotel={hotel}

activeTab={activeTab}

navItems={NAV_ITEMS}

onNavigate={changeTab}

onLogout={logout}

stats={stats}

/>

</div>

</div>

}







<div className="flex">



{/* DESKTOP SIDEBAR */}

<aside

className="
hidden md:block
fixed
h-screen
w-[250px]
"

>

<Sidebar

hotel={hotel}

activeTab={activeTab}

navItems={NAV_ITEMS}

onNavigate={changeTab}

onLogout={logout}

stats={stats}

/>

</aside>







{/* CONTENT */}

<div

className="
w-full
md:ml-[250px]
"

>


<Header

hotel={hotel}

activeTab={activeTab}

newOrderCount={newOrderCount}

onMenuToggle={()=>
setSidebarOpen(true)
}

onRefresh={refresh}

loading={loadingOrders}

/>






<main

className="
p-4
md:p-6
"

>



{
activeTab==="home" &&

<DashboardHome

stats={stats}

primaryColor={primaryColor}

accentColor={accentColor}

/>

}






{
activeTab==="orders" &&

<Orders

orders={orders}

refresh={fetchOrders}

loading={loadingOrders}

primaryColor={primaryColor}

/>

}







{
activeTab==="menu" &&

<OwnerMenuManager

refreshKey={refreshKey}

setRefreshKey={setRefreshKey}

/>

}







{
activeTab==="staff" &&

<StaffManager/>

}

{
activeTab==="staffOrder" && hotel &&

<StaffOrder
hotel={hotel}
/>

}




{
activeTab==="tables" &&

<TableQRManager

refreshKey={refreshKey}

setRefreshKey={setRefreshKey}

/>

}







{
activeTab==="analytics" &&

<AnalyticsDashboard/>

}







{
activeTab==="inventory" &&

<QRInventory

refreshKey={refreshKey}

setRefreshKey={setRefreshKey}

/>

}







{
activeTab==="settings" &&

<OwnerHotelSettings/>

}





</main>



</div>


</div>


</div>

);


}
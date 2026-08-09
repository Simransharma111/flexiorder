import {
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
import { mergeOrders, reconcileAuthoritativeOrders } from "../utils/orderModel";
import { getPendingKitchenUpdates } from "../utils/offlineKitchenUpdates";
import { clearAuthSession } from "../utils/session";
import { getHotelThemeStyle } from "../utils/hotelTheme";



const NAV_ITEMS = [

{
key:"home",
label:"Today",
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
key:"settings",
label:"Settings",
icon:FiSettings
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
key:"staffOrder",
label:"Take Order",
icon:FiShoppingBag
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
res.data?.hotel || res.data
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


setOrders((previous) =>
reconcileAuthoritativeOrders(previous, res.data?.orders || res.data || [], getPendingKitchenUpdates())
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


setOrders((previous) => mergeOrders(previous, [order]));


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
if (!window.confirm("Sign out of FlexiOrder on this device?")) return;
clearAuthSession();
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



const accentColor =
hotel?.theme?.accent ||
theme.accent;







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

<div className="owner-shell" style={getHotelThemeStyle(hotel)}>


{/* MOBILE SIDEBAR */}

{
sidebarOpen &&

<div

className="owner-mobile-drawer"

onClick={()=>
setSidebarOpen(false)
}

>

<div

className="owner-mobile-drawer__panel"

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

className="owner-desktop-rail"

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

className="owner-main"

>


<Header

hotel={hotel}

activeTab={activeTab}

navItems={NAV_ITEMS}

newOrderCount={newOrderCount}

onMenuToggle={()=>
setSidebarOpen(true)
}

onRefresh={refresh}

loading={loadingOrders}

/>






<main

className="owner-content"

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

onOrdersChange={setOrders}

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

<OwnerHotelSettings onHotelChange={setHotel}/>

}





</main>



</div>


</div>


</div>

);


}

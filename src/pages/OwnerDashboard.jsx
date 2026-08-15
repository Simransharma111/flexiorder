import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiBarChart2,
  FiBox,
  FiPackage,
  FiDroplet,
  FiSettings,
  FiShoppingBag,
  FiTable,
  FiUsers,
} from "react-icons/fi";

import { useNavigate } from "react-router-dom";

import api from "../api/axios";
import socket from "../socket";
import { triggerLocalOrderNotification } from "../utils/fcmPush";

import Header from "../components/ownerdashboard/Header";
import Sidebar from "../components/ownerdashboard/Sidebar";

import DashboardHome from "../components/ownerdashboard/DashboardHome";
import Orders from "../components/ownerdashboard/Orders";
import ThemeSettings from "../components/ownerdashboard/ThemeSettings";
import AboutPanel from "../components/ownerdashboard/AboutPanel";

import OwnerMenuManager from "../components/OwnerMenuManager";
import TableQRManager from "../components/TableQRManager";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import StaffManager from "../components/StaffManager";
import OwnerHotelSettings from "./OwnerHotelSettings";
import QRInventoryPage from "./QRInventoryPage";

import HOTEL_THEMES from "../constants/hotelThemes";
import { mergeOrders, orderBelongsToHotel, reconcileAuthoritativeOrders } from "../utils/orderModel";
import { getPendingKitchenUpdates } from "../utils/offlineKitchenUpdates";
import { clearAuthSession, getStoredAuthToken } from "../utils/session";
import { getHotelThemeStyle } from "../utils/hotelTheme";
import { applyHotelSettingsUpdate, featureEnabled, getFeatureSettings, hydrateHotelFeatures } from "../utils/featureSettings";
import { getScopedStorageKey, rememberRestaurantId } from "../utils/storageScope";
import { useConnectivity } from "../context/ConnectivityContext";

const HOTEL_CACHE_KEY = "flexiorder_owner_hotel";
const ORDERS_CACHE_KEY = "flexiorder_owner_orders";


const NAV_ITEMS = [

{
key:"home",
label:"Today",
icon:FiBarChart2,
feature:"today"
},

{
key:"menu",
label:"Menu",
icon:FiPackage,
feature:"menu"
},

{
key:"themes",
label:"Themes",
icon:FiDroplet,
feature:"settings"
},

{
key:"orders",
label:"History",
icon:FiShoppingBag,
feature:"orderHistory"
},

{
key:"settings",
label:"Settings",
icon:FiSettings,
feature:"settings"
},
{
key:"staff",
label:"Staff",
icon:FiUsers,
feature:"staffManagement",
startsMore:true
},

{
key:"tables",
label:"QR Tables",
icon:FiTable,
feature:"qrTables"
},

{
key:"analytics",
label:"Analytics",
icon:FiBarChart2,
feature:"analytics"
},

{
key:"inventory",
label:"QR Inventory",
icon:FiBox,
feature:"qrInventory"
}

];



export default function OwnerDashboard(){

const navigate = useNavigate();
const { status: connectionStatus, label: connectionLabel } = useConnectivity();



const [hotel,setHotel]=useState(()=>{
try{return JSON.parse(localStorage.getItem(getScopedStorageKey(HOTEL_CACHE_KEY))||"null");}catch{return null;}
});

const [orders,setOrders]=useState(()=>{
try{const cached=JSON.parse(localStorage.getItem(getScopedStorageKey(ORDERS_CACHE_KEY))||"[]");return Array.isArray(cached)?cached:[];}catch{return [];}
});

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

const nextHotel=hydrateHotelFeatures(res.data?.hotel || res.data);
rememberRestaurantId(nextHotel);
setHotel(nextHotel);
localStorage.setItem(getScopedStorageKey(HOTEL_CACHE_KEY),JSON.stringify(nextHotel));


}
catch(error){

console.log(
"Hotel error",
error
);

try{
const cached=localStorage.getItem(getScopedStorageKey(HOTEL_CACHE_KEY));
if(cached)setHotel(JSON.parse(cached));
}catch(cacheError){console.warn("Owner hotel cache error",cacheError);}

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


const res = await api.get("/kitchen/orders");


setOrders((previous) =>{
const next=reconcileAuthoritativeOrders(previous, res.data?.orders || res.data || [], getPendingKitchenUpdates());
localStorage.setItem(getScopedStorageKey(ORDERS_CACHE_KEY),JSON.stringify(next));
return next;
});


}
catch(error){

console.log(
"Orders error",
error
);

try{
const cached=JSON.parse(localStorage.getItem(getScopedStorageKey(ORDERS_CACHE_KEY))||"[]");
if(Array.isArray(cached))setOrders((previous)=>mergeOrders(previous,cached));
}catch(cacheError){console.warn("Owner orders cache error",cacheError);}

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

const ownerHotelId = hotel?._id || hotel?.id;

useEffect(()=>{

if(!ownerHotelId)
return undefined;

const roomHotelId = String(ownerHotelId);
const joinHotel = () => socket.emit("joinHotel", roomHotelId, getStoredAuthToken());
joinHotel();
socket.on("connect", joinHotel);



const newOrderHandler=(order)=>{

if (!orderBelongsToHotel(order, roomHotelId)) return;


setOrders((previous) => {
const next=mergeOrders(previous,[order]);
localStorage.setItem(getScopedStorageKey(ORDERS_CACHE_KEY),JSON.stringify(next));
return next;
});


setNewOrderCount(
prev=>prev+1
);

triggerLocalOrderNotification(order);

};



socket.on(
"newOrder",
newOrderHandler
);



return ()=>{

socket.emit("leaveHotel", roomHotelId);
socket.off("connect", joinHotel);
socket.off(
"newOrder",
newOrderHandler
);

};


},[
ownerHotelId
]);

useEffect(() => {
  if (!ownerHotelId) return undefined;

  const joinSettings = () => socket.emit("joinHotelSettings", String(ownerHotelId));
  const handleSettingsUpdate = (payload) => {
    setHotel((current) => applyHotelSettingsUpdate(current, payload));
  };

  joinSettings();
  socket.on("connect", joinSettings);
  socket.on("hotelSettingsUpdated", handleSettingsUpdate);

  return () => {
    socket.emit("leaveHotelSettings", String(ownerHotelId));
    socket.off("connect", joinSettings);
    socket.off("hotelSettingsUpdated", handleSettingsUpdate);
  };
}, [ownerHotelId]);

useEffect(() => {
  if (!hotel || !ownerHotelId) return;
  rememberRestaurantId(hotel);
  localStorage.setItem(
    getScopedStorageKey(HOTEL_CACHE_KEY),
    JSON.stringify(hotel)
  );
}, [hotel, ownerHotelId]);

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

const featureSettings = getFeatureSettings(hotel);
const navItems = NAV_ITEMS.filter((item) =>
  featureEnabled(featureSettings.appLevel, item.feature)
);






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

navItems={navItems}

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

navItems={navItems}

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

navItems={[...navItems, { key: "about", label: "About Us" }]}

newOrderCount={newOrderCount}

onMenuToggle={()=>
setSidebarOpen(true)
}

onRefresh={refresh}

loading={loadingOrders}
connectionStatus={connectionStatus}
connectionLabel={connectionLabel}

/>






<main

className="owner-content"

>



{
activeTab==="home" &&

<DashboardHome

stats={stats}

hotel={hotel}

setActiveTab={setActiveTab}

primaryColor={primaryColor}

accentColor={accentColor}

/>

}






{
activeTab==="orders" &&

<Orders

orders={orders}

refresh={fetchOrders}

onOrdersChange={(next)=>{
setOrders(next);
localStorage.setItem(getScopedStorageKey(ORDERS_CACHE_KEY),JSON.stringify(next));
}}

loading={loadingOrders}

godModeEnabled={getFeatureSettings(hotel).godModeEnabled}

hotel={hotel}

primaryColor={primaryColor}

/>

}







{
activeTab==="menu" &&

<OwnerMenuManager

refreshKey={refreshKey}

setRefreshKey={setRefreshKey}

advancedEnabled={featureEnabled(featureSettings.appLevel, "menuImport")}
restaurant={hotel}

/>

}







{
activeTab==="staff" &&

<StaffManager/>

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

<AnalyticsDashboard hotel={hotel} orders={orders} advancedEnabled={featureEnabled(featureSettings.appLevel, "analyticsExport")}/>

}










{
activeTab==="themes" &&

<ThemeSettings hotel={hotel} onHotelChange={setHotel}/>

}

{
activeTab==="about" &&

<AboutPanel/>

}

{
activeTab==="settings" &&

<OwnerHotelSettings onHotelChange={setHotel}/>

}

{
activeTab==="inventory" &&

<QRInventoryPage />

}





</main>



</div>


</div>


</div>

);


}

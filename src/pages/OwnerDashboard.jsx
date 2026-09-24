import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FiBarChart2,
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
import OwnerBottomNav from "../components/ownerdashboard/OwnerBottomNav";
import NotificationStatusNotice from "../components/NotificationStatusNotice";

import DashboardHome from "../components/ownerdashboard/DashboardHome";
import Orders from "../components/ownerdashboard/Orders";
import ThemeSettings from "../components/ownerdashboard/ThemeSettings";
import AboutPanel from "../components/ownerdashboard/AboutPanel";

import OwnerMenuManager from "../components/OwnerMenuManager";
import TableQRManager from "../components/TableQRManager";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import StaffManager from "../components/StaffManager";
import OwnerHotelSettings from "./OwnerHotelSettings";

import HOTEL_THEMES from "../constants/hotelThemes";
import { matchesOrderId, mergeOrders, orderBelongsToHotel, reconcileAuthoritativeOrders } from "../utils/orderModel";
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
label:"Home",
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
label:"Orders",
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
label:"Tables & Rooms",
icon:FiTable,
feature:"qrTables"
},

{
key:"analytics",
label:"Analytics",
icon:FiBarChart2,
feature:"analytics"
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

const [ordersView,setOrdersView]=useState("active");
const [historyOrders,setHistoryOrders]=useState([]);
const [historyLoading,setHistoryLoading]=useState(false);
const [historyError,setHistoryError]=useState("");
const [settingsSection,setSettingsSection]=useState(null);
const [orderingBusy,setOrderingBusy]=useState(false);
const [orderingReady,setOrderingReady]=useState(false);
const [orderingError,setOrderingError]=useState("");
const orderingInFlight=useRef(false);
const hotelRevision=useRef(0);
const lastOrderingEvent=useRef(null);
const hotelRead=useRef(0);
const historyRead=useRef(0);
const latestHotelTime=useRef(0);
const alive=useRef(true);
useEffect(() => { alive.current=true; return () => { alive.current=false; }; }, []);
const [sidebarOpen,setSidebarOpen]=useState(false);
const drawerRef = useRef(null);

useEffect(() => {
  if (!sidebarOpen) return undefined;
  const drawer = drawerRef.current;
  const opener = document.activeElement;
  const previousOverflow = document.body.style.overflow;
  drawer.showModal();
  document.body.style.overflow = "hidden";
  const closeDrawer = () => setSidebarOpen(false);
  const handleBack = (event) => {
    event.preventDefault();
    closeDrawer();
  };
  const desktop = window.matchMedia("(min-width: 768px)");
  const handleResize = () => { if (desktop.matches) closeDrawer(); };
  window.addEventListener("flexiorder:owner-menu-back", handleBack);
  desktop.addEventListener("change", handleResize);
  return () => {
    drawer.close();
    if (opener?.isConnected) opener.focus();
    document.body.style.overflow = previousOverflow;
    window.removeEventListener("flexiorder:owner-menu-back", handleBack);
    desktop.removeEventListener("change", handleResize);
  };
}, [sidebarOpen]);

const [loadingOrders,setLoadingOrders]=useState(false);

const [newOrderCount,setNewOrderCount]=useState(0);

const [refreshKey,setRefreshKey]=useState(0);





/*
====================================
FETCH HOTEL
====================================
*/

const fetchHotel=async()=>{
const token=getStoredAuthToken();
const revision=hotelRevision.current;
const read=++hotelRead.current;
try{

const res=await api.get(
"/hotel/me"
);

if (!alive.current || token !== getStoredAuthToken() || revision !== hotelRevision.current || read !== hotelRead.current || orderingInFlight.current) return;
const nextHotel=hydrateHotelFeatures(res.data?.hotel || res.data);
setOrderingReady(typeof nextHotel?.orderingEnabled === "boolean");
rememberRestaurantId(nextHotel);
const timestamp=Date.parse(nextHotel?.updatedAt) || 0;
if (timestamp && timestamp < latestHotelTime.current) return;
latestHotelTime.current=Math.max(latestHotelTime.current, timestamp);
setHotel(nextHotel);
localStorage.setItem(getScopedStorageKey(HOTEL_CACHE_KEY),JSON.stringify(nextHotel));


}
catch(error){

if (!alive.current || token !== getStoredAuthToken() || revision !== hotelRevision.current || orderingInFlight.current) return;
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
useRefreshOnResume(() => Promise.all([fetchHotel(), fetchOrders()]), OPERATIONAL_FALLBACK_POLL_MS);







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
const orderUpdateHandler = order => {
  if (!orderBelongsToHotel(order, roomHotelId)) return;
  setOrders(previous => {
    const next = mergeOrders(previous, [order]);
    localStorage.setItem(getScopedStorageKey(ORDERS_CACHE_KEY), JSON.stringify(next));
    return next;
  });
};
socket.on('kitchenOrderUpdated', orderUpdateHandler);



socket.on(
"newOrder",
newOrderHandler
);



return ()=>{
socket.off('kitchenOrderUpdated', orderUpdateHandler);

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
    if (String(payload?.hotelId || payload?.hotel?._id || payload?.hotel?.id || payload?._id || payload?.id || "") !== String(ownerHotelId)) return;
    const timestamp=Date.parse(payload?.updatedAt || payload?.hotel?.updatedAt) || 0;
    if (timestamp && timestamp < latestHotelTime.current) return;
    latestHotelTime.current=Math.max(latestHotelTime.current, timestamp);
    hotelRevision.current++;
    const ordering = payload?.orderingEnabled ?? payload?.hotel?.orderingEnabled;
    if (typeof ordering === "boolean") lastOrderingEvent.current = { revision: hotelRevision.current, value: ordering };
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









const fetchHistory=async()=>{
  const read=++historyRead.current;
  const token=getStoredAuthToken();
  setHistoryLoading(true); setHistoryError("");
  try {
    const res=await api.get("/orders", { timeout: 20000 });
    if (!alive.current || token !== getStoredAuthToken() || read !== historyRead.current) return;
    const rows=res.data?.orders || res.data;
    if (!Array.isArray(rows)) throw new Error("Could not read order history.");
    setHistoryOrders(rows);
  } catch (error) {
    if (alive.current && token === getStoredAuthToken() && read === historyRead.current) setHistoryError(error.response?.data?.message || "Could not load complete history. Check your connection and retry.");
  } finally { if (alive.current && token === getStoredAuthToken() && read === historyRead.current) setHistoryLoading(false); }
};
const changeTab=(tab)=>{
  setActiveTab(tab); setSidebarOpen(false);
  if(tab === "orders") { setOrdersView("active"); setNewOrderCount(0); }
  if(tab === "settings") setSettingsSection(null);
};
const openHistory=()=>{
  setOrdersView("history"); setActiveTab("orders"); setSidebarOpen(false);
  void fetchHistory();
};
const toggleOrdering=async()=>{
  if (!orderingReady || orderingInFlight.current || !navigator.onLine) {
    if (!navigator.onLine) setOrderingError("Connect to the internet to change customer ordering.");
    return;
  }
  const token=getStoredAuthToken();
  const hotelId=String(hotel?._id || hotel?.id);
  const value=hotel.orderingEnabled === false;
  orderingInFlight.current=true; hotelRevision.current++;
  setOrderingBusy(true); setOrderingError("");
  const valid=()=>alive.current && token === getStoredAuthToken();
  try {
    await api.patch("/hotel/profile", { orderingEnabled:value }, { timeout: 15000 });
    if (!valid()) return;
    const revision=hotelRevision.current;
    const result=await api.get("/hotel/me", { timeout: 15000 });
    if (!valid()) return;
    const confirmed=result.data?.hotel || result.data;
    if (lastOrderingEvent.current?.revision > revision && lastOrderingEvent.current.value !== confirmed?.orderingEnabled) throw new Error("Ordering changed on another device. Refresh to check its current status.");
    if (String(confirmed?._id || confirmed?.id) !== hotelId || typeof confirmed.orderingEnabled !== "boolean") throw new Error("The server did not confirm ordering status. Refresh before trying again.");
    const timestamp=Date.parse(confirmed.updatedAt) || 0;
    if (timestamp && timestamp < latestHotelTime.current) throw new Error("A newer ordering status was received. Refresh to confirm it.");
    latestHotelTime.current=Math.max(latestHotelTime.current, timestamp);
    setHotel(current => ({ ...current, orderingEnabled:confirmed.orderingEnabled, updatedAt:confirmed.updatedAt || current?.updatedAt }));
    if (confirmed.orderingEnabled !== value) throw new Error("The server kept a different ordering status. Please review and retry.");
  } catch(error) {
    if (valid()) setOrderingError(error.response?.data?.message || error.message || "Could not change ordering. Please retry.");
  } finally {
    orderingInFlight.current=false;
    if (valid()) setOrderingBusy(false);
  }
};

const featureSettings = getFeatureSettings(hotel);
const navItems = NAV_ITEMS.filter((item) =>
  item.key === "analytics" || featureEnabled(featureSettings.appLevel, item.feature)
);






const refresh=()=>{
if (activeTab === "orders" && ordersView === "history") void fetchHistory();

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

<dialog

className="owner-mobile-drawer"
id="owner-more-menu"
ref={drawerRef}
aria-label="Owner menu"
onCancel={() => setSidebarOpen(false)}
onKeyDown={(event) => {
  if (event.key !== "Tab") return;
  const buttons = [...event.currentTarget.querySelectorAll("button:not(:disabled)")]
    .filter(button => button.getClientRects().length > 0);
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}}

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

<button type="button" className="owner-mobile-drawer__close" onClick={() => setSidebarOpen(false)}>Close menu</button>

<Sidebar

hotel={hotel}

activeTab={activeTab}

navItems={navItems}

onNavigate={changeTab}

onLogout={logout}

stats={stats}

/>

</div>

</dialog>

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

onRefresh={refresh}

loading={loadingOrders}
connectionStatus={connectionStatus}
connectionLabel={connectionLabel}

/>

<NotificationStatusNotice />






<main

className="owner-content"

>



{
activeTab==="home" &&

<DashboardHome
onOrderingToggle={toggleOrdering} orderingBusy={orderingBusy} orderingReady={orderingReady} orderingError={orderingError}
onEditBranding={() => { setSettingsSection("branding"); setActiveTab("settings"); }}
onHistory={openHistory}
allowedTabs={navItems.map(item => item.key)}

stats={stats}

hotel={hotel}

setActiveTab={changeTab}

primaryColor={primaryColor}

accentColor={accentColor}

/>

}






{
activeTab==="orders" &&

<>
{ordersView === "history" && historyLoading && <p role="status">Loading complete order history…</p>}
{ordersView === "history" && historyError && <div role="alert">{historyError} <button type="button" onClick={fetchHistory}>Retry history</button></div>}
<Orders
key={ordersView}
initialView={ordersView}
preserveView
onViewChange={view => { setOrdersView(view); if (view === "history") void fetchHistory(); }}
orders={ordersView === "history" ? mergeOrders(historyOrders, orders) : orders}

refresh={ordersView === "history" ? fetchHistory : fetchOrders}

onOrdersChange={(next)=>{
// Keep complete historical snapshots separate from the dashboard's working set.
// Corrections to known orders and newly reopened work still reach the active board.
if (ordersView === "history") setHistoryOrders(next);
const working = ordersView === "history" ? mergeOrders(orders, next.filter(order =>
  !["delivered", "cancelled"].includes(order.status) || orders.some(current =>
    matchesOrderId(current, order._id) || matchesOrderId(current, order.clientOrderId)
  )
)) : next;
setOrders(working);
try { localStorage.setItem(getScopedStorageKey(ORDERS_CACHE_KEY), JSON.stringify(working)); }
catch { /* Keep accepted updates visible when device storage is full. */ }
}}

loading={loadingOrders}

godModeEnabled={getFeatureSettings(hotel).godModeEnabled}

hotel={hotel}

primaryColor={primaryColor}

/>
</>
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

<OwnerHotelSettings initialSection={settingsSection} onHotelChange={setHotel}/>

}







</main>



</div>


</div>


<OwnerBottomNav activeTab={activeTab} navItems={navItems} onNavigate={changeTab} onMore={() => setSidebarOpen(true)} moreOpen={sidebarOpen} />

</div>

);


}
import useRefreshOnResume from '../hooks/useRefreshOnResume';
import { OPERATIONAL_FALLBACK_POLL_MS } from '../utils/refreshOnResume';

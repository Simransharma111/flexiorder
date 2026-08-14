import { 
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../api/axios";
import socket from "../socket";

import GuestHeader from "../components/guestmenu/GuestHeader";
import HeroBanner from "../components/guestmenu/HeroBanner";
import MenuSection from "../components/guestmenu/MenuSection";
import SimpleMenuSection from "../components/guestmenu/SimpleMenuSection";
import FeaturedSection from "../components/guestmenu/FeaturedSection";
import ActiveOrder from "../components/guestmenu/ActiveOrder";
import ScheduleModal from "../components/guestmenu/ScheduleModal";
import { sortDishesForDisplay } from "../utils/menuOrdering";
import { getHotelThemeStyle } from "../utils/hotelTheme";
import { buildCategoryList, categoryKey, dishCategoryName } from "../utils/menuCategories";
import { normalizeMenuResponse } from "../utils/menuData";
import { useConnectivity } from "../context/ConnectivityContext";
import { useCart } from "../context/CartContext";
import {
  mergeGuestActiveOrders,
  readGuestActiveOrders,
  sameGuestOrder,
  writeGuestActiveOrders,
} from "../utils/guestOrderState";
import { applyHotelSettingsUpdate } from "../utils/featureSettings";

import {
  FiSearch,
  FiShoppingBag,
  FiCalendar,
  FiChevronRight,
} from "react-icons/fi";

const enabledFlag = (value) => value === true || value === 1 ||
  String(value || "").toLowerCase() === "true";

export default function GuestMenuPage(){

const {
  qrId
}=useParams();


const navigate = useNavigate();
const location = useLocation();
const { isOnline } = useConnectivity();


// =====================================================
// HOTEL DATA
// =====================================================

const [hotel,setHotel]=useState(null);
const [orderingConfirmed,setOrderingConfirmed]=useState(false);
const menuRequestRevision=useRef(0);

const hotelId = hotel?._id || hotel?.id;
const hostOrderingEnabled = Boolean(
  orderingConfirmed &&
  hotel &&
  typeof hotel === "object" &&
  hotelId &&
  hotel.orderingEnabled !== false
);
const orderingEnabled = hostOrderingEnabled && isOnline;
const simpleMenu =
  hotel?.menuMode === "simple" ||
  hotel?.menuDisplayMode === "simple" ||
  hotel?.simpleMenu === true;

const [table,setTable]=useState(null);

const [dishes,setDishes]=useState([]);

const [loading,setLoading]=useState(true);

const [error,setError]=useState("");

// =====================================================
// FILTERS
// =====================================================

const [search,setSearch]=useState("");

const [foodFilter,setFoodFilter]=useState("all");

const [hideEggDishes,setHideEggDishes]=useState(false);

const [activeCategory,setActiveCategory]=useState("All");


// =====================================================
// CART
// =====================================================

const {
  cartItems: cart,
  cartCount,
  totalPrice: cartTotal,
  addToCart: addDishToCart,
  decreaseQty,
  increaseQty,
  setCartSession,
} = useCart();


// =====================================================
// ORDERS
// =====================================================

const [
 activeOrders,
 setActiveOrders
]=useState(() => readGuestActiveOrders(qrId));
const activeOrderRequestRef = useRef(0);


const [
 orderLoading,
 setOrderLoading
]=useState(false);


useEffect(() => {
  if (!qrId) return;
  activeOrderRequestRef.current += 1;
  setTable(null);
  setCartSession(qrId);
  const cached = readGuestActiveOrders(qrId);
  const receivedOrder = location.state?.receivedOrder;
  const initial = receivedOrder
    ? [receivedOrder, ...cached.filter((order) => !sameGuestOrder(order, receivedOrder))]
    : cached;
  setActiveOrders(initial);
  writeGuestActiveOrders(qrId, initial);
}, [location.state, qrId, setCartSession]);


// =====================================================
// MODAL
// =====================================================

const [
 showScheduleInfo,
 setShowScheduleInfo
]=useState(false);


// =====================================================
// FETCH MENU
// =====================================================


const fetchMenu=useCallback(async({ silent = false } = {})=>{

const cacheKey = `guestMenu_${qrId}`;
const requestRevision = ++menuRequestRevision.current;

try{

if (!silent) setLoading(true);

setError("");


const res=await api.get(
`/qr/menu/${qrId}`,
{skipAuth:true}
);


if (requestRevision === menuRequestRevision.current) {
const freshHotel = res.data?.hotel || null;
const freshDishes = normalizeMenuResponse(res.data?.dishes || []) || [];
setHotel(freshHotel);
setOrderingConfirmed(Boolean(
  freshHotel &&
  typeof freshHotel === "object" &&
  (freshHotel._id || freshHotel.id)
));
setTable(res.data?.table || null);
setDishes(freshDishes);
localStorage.setItem(
cacheKey,
JSON.stringify({
hotel: res.data?.hotel || null,
table: res.data?.table || null,
dishes: freshDishes,
})
);
}


}
catch(err){


console.log(
"MENU ERROR",
err
);

if (requestRevision !== menuRequestRevision.current) return;

try {
const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");

if (cached?.dishes) {
if (requestRevision === menuRequestRevision.current) {
setHotel(cached.hotel || null);
setOrderingConfirmed(false);
setTable(cached.table || null);
setDishes(normalizeMenuResponse(cached.dishes) || []);
setError("");
}
return;
}
} catch (cacheError) {
console.warn("CACHED MENU ERROR", cacheError);
}

setError(
err?.response?.data?.message ||
"Unable to load menu"
);


}
finally{

if (!silent && requestRevision === menuRequestRevision.current) setLoading(false);

}

},[qrId]);

useEffect(() => {
  setOrderingConfirmed(false);
  menuRequestRevision.current += 1;
  setHotel(null);
  setTable(null);
  setDishes([]);
}, [qrId]);

useEffect(()=>{
if(!qrId){
setError("QR information missing");
setLoading(false);
return;
}

fetchMenu();
const refreshInterval = window.setInterval(
  () => fetchMenu({ silent: true }),
  30000
);
return () => window.clearInterval(refreshInterval);
},[fetchMenu,qrId]);

useEffect(() => {
  if (!hotelId) return undefined;

  const joinHotel = () => socket.emit(
    "joinHotelSettings",
    String(hotelId),
    (result) => {
      if (result?.joined) fetchMenu({ silent: true });
    }
  );
  joinHotel();
  const handleSettingsUpdate = (payload) => {
    setHotel((current) => {
      const next = applyHotelSettingsUpdate(current, payload);
      if (next === current) return current;
      menuRequestRevision.current += 1;
      setOrderingConfirmed(true);
      return next;
    });
  };

  socket.on("connect", joinHotel);
  socket.on("hotelSettingsUpdated", handleSettingsUpdate);
  return () => {
    socket.emit("leaveHotelSettings", String(hotelId));
    socket.off("connect", joinHotel);
    socket.off("hotelSettingsUpdated", handleSettingsUpdate);
  };
}, [fetchMenu, hotelId]);



// =====================================================
// FETCH ACTIVE ORDERS
// =====================================================


const fetchActiveOrders=useCallback(async()=>{


if(
!table?._id ||
!qrId
)return;



const requestId = ++activeOrderRequestRef.current;

try{


setOrderLoading(true);



const res=await api.get(
`/orders/table/${table._id}`,
{skipAuth:true}
);



const orders=
res.data?.orders ||
res.data ||
[];



if (requestId !== activeOrderRequestRef.current) return;



setActiveOrders((current) => {
  const merged = mergeGuestActiveOrders(orders, current);
  const visible = merged.filter((order) =>
    order.status !== "delivered" && order.status !== "cancelled");
  writeGuestActiveOrders(qrId, visible);
  return visible;
});



}
catch(err){

if (requestId !== activeOrderRequestRef.current) return;

console.log(
"ORDER FETCH ERROR",
err
);


setActiveOrders(readGuestActiveOrders(qrId));

}
finally{

if (requestId === activeOrderRequestRef.current) setOrderLoading(false);

}


},[qrId,table]);



// =====================================================
// AUTO REFRESH ORDERS
// =====================================================


useEffect(()=>{


if(!table?._id)
return;


fetchActiveOrders();


const interval=setInterval(
fetchActiveOrders,
5000
);


return()=>clearInterval(interval);



},[fetchActiveOrders,table?._id]);



// =====================================================
// FILTER DISHES
// =====================================================

const filteredDishes = useMemo(()=>{


const text =
search.trim().toLowerCase();



return sortDishesForDisplay(dishes
.filter((dish)=>dish.isAvailable !== false)
.filter((dish)=>{


const category = dishCategoryName(dish);



const categoryMatch =
activeCategory==="All" ||
categoryKey(category)===categoryKey(activeCategory);



const foodMatch =
foodFilter==="all" ||
dish.foodType===foodFilter;

const eggMatch =
foodFilter !== "veg" ||
!hideEggDishes ||
!dish.containsEgg;



const searchMatch =
!text ||

dish.name
?.toLowerCase()
.includes(text)

||

dish.description
?.toLowerCase()
.includes(text)

||

dish.tags?.some(
(tag)=>
String(tag)
.toLowerCase()
.includes(text)
);



return (
categoryMatch &&
foodMatch &&
eggMatch &&
searchMatch
);



}));


},[
dishes,
search,
foodFilter,
hideEggDishes,
activeCategory
]);



// =====================================================
// CATEGORIES
// =====================================================


const categories = useMemo(
  () => buildCategoryList(dishes.filter((dish) => dish.isAvailable !== false)),
  [dishes]
);

useEffect(() => {
  if (!categories.some((category) => categoryKey(category) === categoryKey(activeCategory))) {
    setActiveCategory("All");
  }
}, [activeCategory, categories]);




// =====================================================
// SPECIAL PICKS
// =====================================================

const specialDishes = filteredDishes.filter((dish) =>
  [
    dish.featured,
    dish.todaySpecial,
    dish.isRecommended,
    dish.isBestseller,
    dish.isPopular,
    dish.isNewArrival,
    dish.chefChoice,
  ].some((flag) => flag === true)
);



// =====================================================
// CART HELPERS
// =====================================================

const getCartQuantity = (dishId) =>
  cart.find((item) => item._id === dishId)?.quantity || 0;

const addToCart = (dish) => {
  if (!orderingEnabled || dish.isAvailable === false) return;
  addDishToCart(dish);
};

const decreaseQuantity = (dishId) => decreaseQty(dishId);
const increaseQuantity = (dishId) => increaseQty(dishId);

const rawGstRate = Number(hotel?.gstPercentage ?? hotel?.gstRate ?? hotel?.gst?.percentage ?? 0);
const gstRate = Number.isFinite(rawGstRate) && rawGstRate > 0 ? rawGstRate : 0;
const gstEnabled = enabledFlag(hotel?.gstEnabled ?? hotel?.enableGST ?? hotel?.gst?.enabled) && gstRate > 0;
const cartFinalTotal = cartTotal + (gstEnabled ? cartTotal * gstRate / 100 : 0);
const vegOnly = Boolean(hotel?.vegOnly || hotel?.restaurantType === "veg" || hotel?.foodType === "veg");




// =====================================================
// OPEN CART
// =====================================================


const openCart=()=>{


if(!qrId)
return;


navigate(
`/cart/${qrId}`
);


};




// =====================================================
// SCHEDULE
// =====================================================


const openSchedule=()=>{


if(cartCount===0){


alert(
"Please add items to cart first."
);


return;


}


setShowScheduleInfo(true);


};
// =====================================================
// LOADING
// =====================================================

if(loading){

return(

<div className="min-h-screen bg-gray-50 flex items-center justify-center">

<div className="text-center">

<div className="
w-10 h-10 
border-4 
border-gray-200 
border-t-orange-500 
rounded-full 
animate-spin 
mx-auto
"/>


<p className="
text-gray-500 
mt-4 
text-sm
">
Loading menu...
</p>


</div>

</div>

);

}



// =====================================================
// ERROR
// =====================================================

if(error){

return(

<div className="
min-h-screen 
bg-gray-50 
flex 
items-center 
justify-center 
p-6
">


<div className="
bg-white 
rounded-2xl 
shadow-sm 
border 
p-8 
text-center 
max-w-md 
w-full
">


<h2 className="
text-xl 
font-bold 
text-gray-900
">

Menu unavailable

</h2>


<p className="
text-gray-500 
text-sm 
mt-2
">

{error}

</p>



<button

onClick={fetchMenu}

className="
mt-5 
bg-orange-500 
text-white 
px-5 
py-2.5 
rounded-xl 
font-semibold
"

>

Try Again

</button>



</div>


</div>

);


}



// =====================================================
// MAIN UI
// =====================================================


return (

<div className="guest-menu-page min-h-screen pb-32" style={getHotelThemeStyle(hotel)}>



{/* HEADER */}

<GuestHeader

hotel={hotel}

table={table}

cartCount={cartCount}

onCart={openCart}

orderingEnabled={orderingEnabled}

/>





{/* ACTIVE ORDERS */}

<ActiveOrder

orders={activeOrders}

loading={orderLoading}

table={table}

/>

{!orderingEnabled && (
  <div className="mx-auto mt-4 max-w-6xl px-4">
    <p className="rounded-xl bg-gray-100 px-4 py-3 text-center text-sm text-gray-500">
      {!isOnline
        ? "You are offline. The saved menu is available to view; ordering will return when connected."
        : !orderingConfirmed
          ? "Confirming whether ordering is available. You can still view the menu."
        : "Ordering is currently unavailable. You can still view the menu."}
    </p>
  </div>
)}

{gstEnabled && gstRate > 0 && (
  <div className="mx-auto mt-3 max-w-6xl px-4">
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-700">
      All prices are exclusive of {gstRate}% GST · Tax will be added at checkout
    </p>
  </div>
)}





{/* HERO */}

{!simpleMenu && (
  <HeroBanner
    hotel={hotel}
    table={table}
  />
)}





{/* QUICK ACTIONS */}


{orderingEnabled && (
  <div className="guest-secondary-actions">
    <button type="button" onClick={openSchedule}><FiCalendar /> Schedule order</button>
  </div>
)}





{/* SEARCH */}


<section className="
max-w-6xl 
mx-auto 
px-4 
mt-5
">


<div className="
relative
">


<FiSearch

className="
absolute 
left-4 
top-1/2 
-translate-y-1/2 
text-gray-400
"

/>


<input

value={search}

onChange={(e)=>
setSearch(e.target.value)
}

placeholder="Search dishes..."

className="
w-full 
bg-white 
border 
rounded-xl 
py-3.5 
pl-11 
pr-4 
outline-none
"

/>


</div>


</section>





{/* FOOD FILTER */}


{!vegOnly && (
  <section className="guest-food-filters" aria-label="Dietary filters">
    <div>
      {[{ id: "all", label: "All" }, { id: "veg", label: "Veg" }, { id: "nonveg", label: "Non-Veg" }].map((item) => (
        <button type="button" key={item.id} onClick={() => { setFoodFilter(item.id); if (item.id !== "veg") setHideEggDishes(false); }} className={foodFilter === item.id ? "is-active" : ""}>{item.label}</button>
      ))}
    </div>
    {foodFilter === "veg" && <label><input type="checkbox" checked={hideEggDishes} onChange={(event) => setHideEggDishes(event.target.checked)} /> Hide egg dishes</label>}
  </section>
)}





{/* FEATURED */}


{
!simpleMenu &&
!search &&
activeCategory==="All" &&


<FeaturedSection
dishes={specialDishes}
onAdd={addToCart}
onDecrease={decreaseQuantity}
onIncrease={increaseQuantity}
getQuantity={getCartQuantity}
orderingEnabled={orderingEnabled}
/>


}






{/* MENU */}


{simpleMenu ? (
<SimpleMenuSection

categories={categories}

dishes={filteredDishes}

activeCategory={activeCategory}

setActiveCategory={setActiveCategory}

getCartQuantity={getCartQuantity}

addToCart={addToCart}

decreaseQuantity={decreaseQuantity}

increaseQuantity={increaseQuantity}

orderingEnabled={orderingEnabled}

/>
) : (
<MenuSection

categories={categories}

dishes={filteredDishes}

activeCategory={activeCategory}

setActiveCategory={setActiveCategory}

getCartQuantity={getCartQuantity}

addToCart={addToCart}

decreaseQuantity={decreaseQuantity}

increaseQuantity={increaseQuantity}

orderingEnabled={orderingEnabled}

/>
)}






{/* BOTTOM CART */}


{
orderingEnabled && cartCount>0 &&


<div className="
fixed 
bottom-0 
left-0 
right-0 
z-50 
bg-white 
border-t 
p-3
">


<div className="
max-w-6xl 
mx-auto
">


<button

onClick={openCart}

className="
w-full 
bg-orange-500 
text-white 
rounded-xl 
px-5 
py-3 
flex 
items-center 
justify-between 
font-bold
"

>


<div className="
flex 
items-center 
gap-3
">


<FiShoppingBag/>


<div>

<p className="
text-xs
">

{cartCount} items

</p>


<p>

₹{cartFinalTotal.toFixed(2)}

</p>


</div>


</div>



<div className="
flex 
items-center 
gap-2
">

View Cart

<FiChevronRight/>

</div>


</button>


</div>


</div>


}






{/* SCHEDULE MODAL */}


<ScheduleModal

show={showScheduleInfo}

close={()=>
setShowScheduleInfo(false)
}

onContinue={()=>{

setShowScheduleInfo(false);

openCart();

}}


/>



</div>

);


}

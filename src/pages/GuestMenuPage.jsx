import { 
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../api/axios";

import GuestHeader from "../components/guestmenu/GuestHeader";
import HeroBanner from "../components/guestmenu/HeroBanner";
import MenuSection from "../components/guestmenu/MenuSection";
import SimpleMenuSection from "../components/guestmenu/SimpleMenuSection";
import FeaturedSection from "../components/guestmenu/FeaturedSection";
import ActiveOrder from "../components/guestmenu/ActiveOrder";
import ScheduleModal from "../components/guestmenu/ScheduleModal";
import { getDishPricing } from "../utils/pricing";
import { sortDishesForDisplay } from "../utils/menuOrdering";
import { getHotelThemeStyle } from "../utils/hotelTheme";
import { buildCategoryList, categoryKey } from "../utils/menuCategories";

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


// =====================================================
// HOTEL DATA
// =====================================================

const [hotel,setHotel]=useState(null);

const hostOrderingEnabled = hotel?.orderingEnabled !== false;
const [isOnline,setIsOnline]=useState(navigator.onLine);
const orderingEnabled = hostOrderingEnabled && isOnline;
const simpleMenu =
  hotel?.menuMode === "simple" ||
  hotel?.menuDisplayMode === "simple";

const [table,setTable]=useState(null);

const [dishes,setDishes]=useState([]);

const [loading,setLoading]=useState(true);

const [error,setError]=useState("");

useEffect(()=>{
const handleOnline=()=>setIsOnline(true);
const handleOffline=()=>setIsOnline(false);
window.addEventListener("online",handleOnline);
window.addEventListener("offline",handleOffline);
return()=>{
window.removeEventListener("online",handleOnline);
window.removeEventListener("offline",handleOffline);
};
},[]);


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

const [cart,setCart]=useState([]);


// =====================================================
// ORDERS
// =====================================================

const [
 activeOrders,
 setActiveOrders
]=useState([]);


const [
 orderLoading,
 setOrderLoading
]=useState(false);


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

try{

if (!silent) setLoading(true);

setError("");


const res=await api.get(
`/qr/menu/${qrId}`,
{skipAuth:true}
);


setHotel(
res.data?.hotel || null
);


setTable(
res.data?.table || null
);


setDishes(
res.data?.dishes || []
);

localStorage.setItem(
cacheKey,
JSON.stringify({
hotel: res.data?.hotel || null,
table: res.data?.table || null,
dishes: res.data?.dishes || [],
})
);


}
catch(err){

console.log(
"MENU ERROR",
err
);

try {
const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");

if (cached?.dishes) {
setHotel(cached.hotel || null);
setTable(cached.table || null);
setDishes(cached.dishes);
setError("");
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

if (!silent) setLoading(false);

}

},[qrId]);

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



// =====================================================
// FETCH ACTIVE ORDERS
// =====================================================


const fetchActiveOrders=useCallback(async()=>{


if(
!table?._id ||
!qrId
)return;



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



const active =
orders.filter(
(order)=>
order.status!=="delivered" &&
order.status!=="cancelled"
);



setActiveOrders(active);



localStorage.setItem(

`activeOrders_${qrId}`,

JSON.stringify(
active
)

);



}
catch(err){

console.log(
"ORDER FETCH ERROR",
err
);


try {
  const cached = JSON.parse(
    localStorage.getItem(`activeOrders_${qrId}`) || "[]"
  );
  setActiveOrders(Array.isArray(cached) ? cached : []);
} catch (cacheError) {
  console.warn("CACHED ORDER ERROR", cacheError);
  setActiveOrders([]);
}

}
finally{

setOrderLoading(false);

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
// LOAD CART
// =====================================================


useEffect(()=>{


if(!qrId)
return;


const saved =
localStorage.getItem(
`cart_${qrId}`
);



if(saved){

setCart(
JSON.parse(saved)
);

}
else{

setCart([]);

}


},[
qrId
]);



// =====================================================
// SAVE CART
// =====================================================


useEffect(()=>{


if(!qrId)
return;


localStorage.setItem(

`cart_${qrId}`,

JSON.stringify(cart)

);



},[
cart,
qrId
]);
// =====================================================
// FILTER DISHES
// =====================================================

const filteredDishes = useMemo(()=>{


const text =
search.trim().toLowerCase();



return sortDishesForDisplay(dishes
.filter((dish)=>dish.isAvailable !== false)
.filter((dish)=>{


let category =
dish.category;


if(
typeof category==="object"
){

category =
dish.category?.name;

}



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
// FEATURED DISHES
// =====================================================


const availableDish=(dish)=>
dish.isAvailable!==false;



const featured =
sortDishesForDisplay(dishes.filter(
(dish)=>
availableDish(dish) &&
dish.featured
));



const todaySpecial =
sortDishesForDisplay(dishes.filter(
(dish)=>
availableDish(dish) &&
dish.todaySpecial
));



const recommended =
sortDishesForDisplay(dishes.filter(
(dish)=>
availableDish(dish) &&
dish.isRecommended
));



const popular =
sortDishesForDisplay(dishes.filter(
(dish)=>
availableDish(dish) &&
dish.isPopular
));



const bestsellers =
sortDishesForDisplay(dishes.filter(
(dish)=>
availableDish(dish) &&
dish.isBestseller
));



const newArrivals =
sortDishesForDisplay(dishes.filter(
(dish)=>
availableDish(dish) &&
dish.isNewArrival
));



// =====================================================
// CART HELPERS
// =====================================================


const getCartQuantity=(dishId)=>{


const item =
cart.find(
(item)=>
item._id===dishId
);



return item?.quantity || 0;


};




// =====================================================
// ADD TO CART
// =====================================================


const addToCart=(dish)=>{


if(
dish.isAvailable===false
)
return;

const {
  basePrice,
  discountValue,
  finalPrice,
} = getDishPricing(dish);



setCart((prev)=>{


const existing =
prev.find(
(item)=>
item._id===dish._id
);



if(existing){


return prev.map(
(item)=>

item._id===dish._id

?

{
...item,
quantity:
item.quantity+1
}

:

item

);


}



return [

...prev,

{

_id:dish._id,

name:dish.name,

description:
dish.description,

price:finalPrice,
originalPrice:basePrice,
discountType:dish.discountType || "percentage",
discountValue,

image:dish.image,

foodType:
dish.foodType,

quantity:1

}

];



});


};




// =====================================================
// REMOVE / DECREASE
// =====================================================


const decreaseQuantity=(dishId)=>{


setCart((prev)=>{


const item =
prev.find(
(item)=>
item._id===dishId
);



if(!item)
return prev;



if(item.quantity<=1){


return prev.filter(
(item)=>
item._id!==dishId
);


}



return prev.map(
(item)=>

item._id===dishId

?

{
...item,
quantity:item.quantity-1
}

:

item

);



});


};





// =====================================================
// INCREASE
// =====================================================


const increaseQuantity=(dishId)=>{


const dish =
dishes.find(
(item)=>
item._id===dishId
);



if(dish){

addToCart(dish);

}


};




// =====================================================
// CART COUNT + TOTAL
// =====================================================


const cartCount =
cart.reduce(
(total,item)=>
total +
Number(item.quantity || 0),
0
);



const cartTotal =
cart.reduce(
(total,item)=>

total +

(
Number(item.price || 0)

*

Number(item.quantity || 0)

),

0
);

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
        : "Ordering is currently unavailable. You can still view the menu."}
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


<>


{
featured.length>0 &&

<FeaturedSection

title="Featured"

dishes={featured}

onAdd={addToCart}

onDecrease={decreaseQuantity}

onIncrease={increaseQuantity}

getQuantity={getCartQuantity}

orderingEnabled={orderingEnabled}

/>

}



{
todaySpecial.length>0 &&

<FeaturedSection

title="Today's Special"

dishes={todaySpecial}

onAdd={addToCart}

onDecrease={decreaseQuantity}

onIncrease={increaseQuantity}

getQuantity={getCartQuantity}

orderingEnabled={orderingEnabled}

/>

}



{
recommended.length>0 &&

<FeaturedSection

title="Recommended"

dishes={recommended}

onAdd={addToCart}

onDecrease={decreaseQuantity}

onIncrease={increaseQuantity}

getQuantity={getCartQuantity}

orderingEnabled={orderingEnabled}

/>

}

{
bestsellers.length>0 &&

<FeaturedSection
title="Best Sellers"
dishes={bestsellers}
onAdd={addToCart}
onDecrease={decreaseQuantity}
onIncrease={increaseQuantity}
getQuantity={getCartQuantity}
orderingEnabled={orderingEnabled}
/>
}

{
popular.length>0 &&

<FeaturedSection
title="Most Popular"
dishes={popular}
onAdd={addToCart}
onDecrease={decreaseQuantity}
onIncrease={increaseQuantity}
getQuantity={getCartQuantity}
orderingEnabled={orderingEnabled}
/>
}

{
newArrivals.length>0 &&

<FeaturedSection
title="New Arrivals"
dishes={newArrivals}
onAdd={addToCart}
onDecrease={decreaseQuantity}
onIncrease={increaseQuantity}
getQuantity={getCartQuantity}
orderingEnabled={orderingEnabled}
/>
}


</>


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

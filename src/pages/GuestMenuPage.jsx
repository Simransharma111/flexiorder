import { 
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
import FeaturedSection from "../components/guestmenu/FeaturedSection";
import ActiveOrder from "../components/guestmenu/ActiveOrder";
import ScheduleModal from "../components/guestmenu/ScheduleModal";

import {
  FiSearch,
  FiShoppingBag,
  FiCalendar,
  FiChevronRight,
  FiLoader,
} from "react-icons/fi";


export default function GuestMenuPage(){

const {
  qrId
}=useParams();


const navigate = useNavigate();


// =====================================================
// HOTEL DATA
// =====================================================

const [hotel,setHotel]=useState(null);

const orderingEnabled = hotel?.orderingEnabled !== false;

const [table,setTable]=useState(null);

const [dishes,setDishes]=useState([]);

const [loading,setLoading]=useState(true);

const [error,setError]=useState("");


// =====================================================
// FILTERS
// =====================================================

const [search,setSearch]=useState("");

const [foodFilter,setFoodFilter]=useState("all");

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


useEffect(()=>{

if(!qrId){

setError(
"QR information missing"
);

setLoading(false);

return;

}


fetchMenu();


},[qrId]);



const fetchMenu=async()=>{

try{

setLoading(true);

setError("");


const res=await api.get(
`/qr/menu/${qrId}`
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



}
catch(err){

console.log(
"MENU ERROR",
err
);


setError(
err?.response?.data?.message ||
"Unable to load menu"
);


}
finally{

setLoading(false);

}

};



// =====================================================
// FETCH ACTIVE ORDERS
// =====================================================


const fetchActiveOrders=async()=>{


if(
!table?._id ||
!qrId
)return;



try{


setOrderLoading(true);



const res=await api.get(
`/orders/table/${table._id}`
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
active.map(
(order)=>order._id
)
)

);



}
catch(err){

console.log(
"ORDER FETCH ERROR",
err
);


setActiveOrders([]);

}
finally{

setOrderLoading(false);

}


};



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



},[
table?._id
]);



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



return dishes.filter((dish)=>{


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
category===activeCategory;



const foodMatch =
foodFilter==="all" ||
dish.foodType===foodFilter;



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
searchMatch
);



});


},[
dishes,
search,
foodFilter,
activeCategory
]);



// =====================================================
// CATEGORIES
// =====================================================


const categories = useMemo(()=>{


const list =
dishes.map((dish)=>{


if(
typeof dish.category==="object"
){

return dish.category?.name;

}


return dish.category;


})
.filter(Boolean);



return [
"All",
...new Set(list)
];



},[
dishes
]);




// =====================================================
// FEATURED DISHES
// =====================================================


const availableDish=(dish)=>
dish.isAvailable!==false;



const featured =
dishes.filter(
(dish)=>
availableDish(dish) &&
dish.featured
);



const todaySpecial =
dishes.filter(
(dish)=>
availableDish(dish) &&
dish.todaySpecial
);



const recommended =
dishes.filter(
(dish)=>
availableDish(dish) &&
dish.isRecommended
);



const popular =
dishes.filter(
(dish)=>
availableDish(dish) &&
dish.isPopular
);



const bestsellers =
dishes.filter(
(dish)=>
availableDish(dish) &&
dish.isBestseller
);



const newArrivals =
dishes.filter(
(dish)=>
availableDish(dish) &&
dish.isNewArrival
);



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

price:Number(
dish.price || 0
),

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

<div className="
min-h-screen 
bg-gray-50 
pb-32
">



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

/>

{!orderingEnabled && (
  <div className="mx-auto mt-4 max-w-6xl px-4">
    <p className="rounded-xl bg-gray-100 px-4 py-3 text-center text-sm text-gray-500">
      Ordering is currently unavailable. You can still view the menu.
    </p>
  </div>
)}





{/* HERO */}

<HeroBanner

hotel={hotel}

table={table}

/>





{/* QUICK ACTIONS */}


<section className="
max-w-6xl 
mx-auto 
px-4 
mt-5
">


<div className="
grid 
grid-cols-2 
gap-3
">


<button

onClick={openSchedule}

className="
bg-white 
border 
border-gray-200 
rounded-xl 
p-4 
flex 
items-center 
gap-3 
text-left
"

>


<div className="
w-10 
h-10 
rounded-lg 
bg-orange-50 
text-orange-600 
flex 
items-center 
justify-center
">

<FiCalendar/>

</div>


<div>

<p className="
font-bold 
text-sm
">

Schedule

</p>


<p className="
text-xs 
text-gray-500
">

Order later

</p>


</div>


</button>




<button

onClick={openCart}

className="
bg-white 
border 
border-gray-200 
rounded-xl 
p-4 
flex 
items-center 
gap-3 
text-left
"

>


<div className="
w-10 
h-10 
rounded-lg 
bg-orange-50 
text-orange-600 
flex 
items-center 
justify-center
">

<FiShoppingBag/>

</div>


<div>

<p className="
font-bold 
text-sm
">

Cart

</p>


<p className="
text-xs 
text-gray-500
">

{cartCount} items

</p>


</div>


</button>



</div>


</section>





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


<section className="
max-w-6xl 
mx-auto 
px-4 
mt-4
">


<div className="
flex 
gap-2 
overflow-x-auto
">


{

[
{
id:"all",
label:"All"
},

{
id:"veg",
label:"🟢 Veg"
},

{
id:"nonveg",
label:"🔴 Non Veg"
}

].map(
(item)=>(


<button

key={item.id}

onClick={()=>
setFoodFilter(item.id)
}

className={`
px-4
py-2
rounded-full
text-sm
font-semibold
whitespace-nowrap
${
foodFilter===item.id

?

"bg-orange-500 text-white"

:

"bg-white border text-gray-600"

}
`}

>

{item.label}

</button>


)

)

}


</div>


</section>





{/* FEATURED */}


{
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


</>


}






{/* MENU */}


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

₹{cartTotal.toFixed(2)}

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

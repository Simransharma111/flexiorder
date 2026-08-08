import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FiMinus,
  FiPlus,
  FiShoppingCart,
  FiSearch,
} from "react-icons/fi";

import api from "../api/axios";
import {
  getPendingStaffOrders,
  getStaffOrdersNeedingAttention,
  queueStaffOrder,
  reconcileStaffOrderSync,
  recordStaffOrderFailure,
  retryStaffOrdersNeedingAttention,
} from "../utils/offlineOrders";


export default function StaffOrder({
  hotel,
}) {


const [menu,setMenu]=useState([]);

const [tables,setTables]=useState([]);

const [selectedTable,setSelectedTable]=useState("");
const [tableSearch,setTableSearch]=useState("");
const [orderType,setOrderType]=useState("dinein");

const [guestName,setGuestName]=useState("");
const [guestContact,setGuestContact]=useState("");

const [cart,setCart]=useState([]);

const [search,setSearch]=useState("");

const [loading,setLoading]=useState(false);
const [pendingSyncCount,setPendingSyncCount]=useState(0);
const [attentionCount,setAttentionCount]=useState(0);
const [isOnline,setIsOnline]=useState(navigator.onLine);
const syncInFlight=useRef(false);

const visibleTables=tables.filter((table)=>{
  if(!tableSearch.trim()) return true;
  return String(table.tableNumber || "")
    .toLowerCase()
    .includes(tableSearch.trim().toLowerCase());
});

const refreshPendingCount=useCallback(()=>{
  setPendingSyncCount(getPendingStaffOrders().length);
  setAttentionCount(getStaffOrdersNeedingAttention().length);
},[]);

const syncPendingOrders=useCallback(async()=>{
  if(syncInFlight.current) return;
  const pending=getPendingStaffOrders().filter((item)=>!item.requiresAttention);
  if(!pending.length || !navigator.onLine){
    refreshPendingCount();
    return;
  }

  syncInFlight.current=true;
  try{
    const remaining=[];
    for(const queued of pending){
      try{
        await api.post("/orders",queued.payload);
      }catch(error){
        remaining.push(recordStaffOrderFailure(queued,error));
      }
    }
    const reconciled=reconcileStaffOrderSync(pending,remaining);
    setPendingSyncCount(reconciled.length);
    setAttentionCount(getStaffOrdersNeedingAttention().length);
  }finally{
    syncInFlight.current=false;
  }
},[refreshPendingCount]);




/*
=========================
FETCH MENU
=========================
*/

const fetchMenu=useCallback(async()=>{

try{


if(!hotel?._id)
return;


const res=await api.get(
`/menu/${hotel._id}`
);


setMenu(
res.data || []
);
localStorage.setItem(
  `staff_menu_${hotel._id}`,
  JSON.stringify(res.data || [])
);


}
catch(error){

console.log(
"MENU ERROR",
error.response?.data || error.message
);

try{
  const cached=localStorage.getItem(`staff_menu_${hotel?._id}`);
  if(cached) setMenu(JSON.parse(cached));
}catch(cacheError){
  console.warn("Staff menu cache could not be read",cacheError);
}

}

},[hotel]);





/*
=========================
FETCH TABLES
=========================
*/

const fetchTables=useCallback(async()=>{

try{


const res=await api.get(
"/table"
);


setTables(
res.data.tables || []
);
localStorage.setItem(
  `staff_tables_${hotel?._id || "current"}`,
  JSON.stringify(res.data.tables || [])
);


}
catch(error){

console.log(
"TABLE ERROR",
error.response?.data || error.message
);

try{
  const cached=localStorage.getItem(`staff_tables_${hotel?._id || "current"}`);
  if(cached) setTables(JSON.parse(cached));
}catch(cacheError){
  console.warn("Staff table cache could not be read",cacheError);
}

}

},[hotel]);





useEffect(()=>{

if(hotel?._id){

fetchMenu();

fetchTables();

}

},[fetchMenu,fetchTables,hotel?._id]);

useEffect(()=>{
  const handleOnline=()=>setIsOnline(true);
  const handleOffline=()=>setIsOnline(false);
  window.addEventListener("online",handleOnline);
  window.addEventListener("offline",handleOffline);
  refreshPendingCount();
  syncPendingOrders();
  window.addEventListener("online",syncPendingOrders);
  const retryInterval=window.setInterval(syncPendingOrders,15000);
  return ()=>{
    window.removeEventListener("online",handleOnline);
    window.removeEventListener("offline",handleOffline);
    window.removeEventListener("online",syncPendingOrders);
    window.clearInterval(retryInterval);
  };
},[refreshPendingCount,syncPendingOrders]);






/*
=========================
FILTER MENU
=========================
*/

const filteredMenu =
useMemo(()=>{


if(!search)
return menu;


return menu.filter(
item=>

item.name
.toLowerCase()
.includes(
search.toLowerCase()
)

);


},[
menu,
search
]);









/*
=========================
ADD ITEM
=========================
*/


const addItem=(dish)=>{


const existing =
cart.find(
item=>item.menuId===dish._id
);


if(existing){

setCart(
cart.map(item=>

item.menuId===dish._id

?

{
...item,
quantity:item.quantity+1
}

:

item

)

);


}

else{


setCart([

...cart,

{
menuId:dish._id,
name:dish.name,
price:dish.price,
quantity:1
}

]);


}


};






/*
=========================
UPDATE QUANTITY
=========================
*/

const changeQty=(id,type)=>{


setCart(

cart.map(item=>{


if(item.menuId!==id)
return item;


let qty =
type==="plus"

?

item.quantity+1

:

item.quantity-1;



return {

...item,

quantity:
qty<1
?
1
:
qty

};


})

);


};







/*
=========================
TOTAL
=========================
*/

const total =

cart.reduce(

(sum,item)=>

sum+
(
item.price *
item.quantity
),

0

);








/*
=========================
PLACE ORDER
=========================
*/


const placeOrder=async()=>{


if(!selectedTable && orderType !== "takeaway"){

alert(
"Select table first"
);

return;

}



if(cart.length===0){

alert(
"Select dishes"
);

return;

}



try{


setLoading(true);

const orderPayload={
  tableId:orderType === "takeaway" ? null : selectedTable,
  orderType,
  guestName:guestName || "Guest",
  guestContact:guestContact || null,
  items:cart.map(item=>({
    menuId:item.menuId,
    quantity:item.quantity
  }))
};

if(!navigator.onLine){
  queueStaffOrder(orderPayload);
  refreshPendingCount();
  setCart([]);
  setGuestName("");
  setGuestContact("");
  return;
}



await api.post(
"/orders",
orderPayload

);



alert(
"Order sent to kitchen"
);



setCart([]);

setGuestName("");
setGuestContact("");



}

catch(error){

console.log(
"ORDER ERROR",
error.response?.data || error.message
);


if(!error.response){
  queueStaffOrder({
    tableId:orderType === "takeaway" ? null : selectedTable,
    orderType,
    guestName:guestName || "Guest",
    guestContact:guestContact || null,
    items:cart.map(item=>({
      menuId:item.menuId,
      quantity:item.quantity
    }))
  });
  refreshPendingCount();
  setCart([]);
  setGuestName("");
  setGuestContact("");
}else{
  alert("Failed to place order");
}


}

finally{

setLoading(false);

}



};







return (

<div
className="
space-y-6
"
>


{/* HEADER */}


<div>

<h1
className="
text-2xl
font-black
"
>

Staff Ordering

</h1>


<p
className="
opacity-60
"
>

Create order for guest

</p>

{(!isOnline || pendingSyncCount > 0) && (
  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-red-600">
    <span className="h-2 w-2 rounded-full bg-red-600" />
    <span>{!isOnline
      ? "Offline — orders save on this device"
      : attentionCount > 0
        ? `${attentionCount} order${attentionCount === 1 ? "" : "s"} need attention`
        : `${pendingSyncCount} order${pendingSyncCount === 1 ? "" : "s"} waiting to sync`}</span>
    {isOnline && attentionCount > 0 && (
      <button
        type="button"
        onClick={()=>{
          retryStaffOrdersNeedingAttention();
          refreshPendingCount();
          syncPendingOrders();
        }}
        className="rounded-lg border border-red-200 bg-white px-2 py-1"
      >
        Retry all
      </button>
    )}
  </div>
)}


</div>








{/* TOP SECTION */}


<div
className="
grid
md:grid-cols-3
gap-4
"
>


{/* TABLE */}


<div
className="
rounded-2xl
border
p-4
"
>


<label
className="
text-sm
font-bold
"
>

Select Table / Room

</label>


{tables.length > 12 && (
  <input
    value={tableSearch}
    onChange={(event) => setTableSearch(event.target.value)}
    placeholder="Search table or room"
    className="mt-2 w-full rounded-xl border bg-transparent p-3"
  />
)}

<div className="mt-3 grid max-h-48 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
  {visibleTables.map((table) => {
    const label = table.type === "room"
      ? `Room ${table.tableNumber}`
      : `Table ${table.tableNumber}`;
    return (
      <button
        key={table._id}
        type="button"
        onClick={() => {
          setSelectedTable(table._id);
          setOrderType("dinein");
        }}
        className={`rounded-xl border px-2 py-3 text-xs font-bold ${
          selectedTable === table._id
            ? "border-orange-500 bg-orange-500 text-white"
            : "border-gray-200 hover:bg-gray-50"
        }`}
      >
        {label}
      </button>
    );
  })}
</div>

<button
  type="button"
  onClick={() => {
    setOrderType("takeaway");
    setSelectedTable("");
  }}
  className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm font-bold ${
    orderType === "takeaway"
      ? "border-orange-500 bg-orange-50 text-orange-700"
      : "border-gray-200 text-gray-600"
  }`}
>
  Takeaway
</button>


</div>







{/* GUEST */}


<div
className="
rounded-2xl
border
p-4
"
>


<label
className="
text-sm
font-bold
"
>

Contact

</label>

<input
type="tel"
value={guestContact}
onChange={e=>setGuestContact(e.target.value)}
placeholder="Optional contact number"
className="
mt-2
w-full
rounded-xl
p-3
bg-transparent
border
"
/>

<label
className="
mt-4
block
text-sm
font-bold
"
>

Guest Name

</label>


<input

value={guestName}

onChange={
e=>setGuestName(e.target.value)
}

placeholder="Guest"

className="
mt-2
w-full
rounded-xl
p-3
bg-transparent
border
"

/>


</div>







{/* TOTAL */}

<div
className="
rounded-2xl
border
p-4
"
>


<p
className="
text-sm
font-bold
"
>
Total
</p>


<h2
className="
text-3xl
font-black
"
>

₹{total}

</h2>


</div>



</div>










<div
className="
grid
lg:grid-cols-3
gap-6
"
>





{/* MENU */}


<div
className="
lg:col-span-2
"
>


<div
className="
flex
items-center
gap-3
border
rounded-xl
px-4
py-3
mb-4
"
>

<FiSearch/>


<input

className="
bg-transparent
outline-none
w-full
"

placeholder="Search dish"

value={search}

onChange={
e=>setSearch(e.target.value)
}

/>


</div>





<div
className="
grid
sm:grid-cols-2
gap-4
"
>


{

filteredMenu.map(dish=>(


<div

key={dish._id}

className="
border
rounded-2xl
p-4
"

>


<h3
className="
font-bold
"
>

{dish.name}

</h3>


<p
className="
text-sm
opacity-60
"
>

₹{dish.price}

</p>



<button

onClick={()=>
addItem(dish)
}

className="
mt-3
w-full
bg-orange-500
text-white
rounded-xl
py-2
font-bold
"

>

Add

</button>


</div>


))


}


</div>


</div>








{/* CART */}


<div
className="
border
rounded-2xl
p-4
"
>


<div
className="
flex
gap-2
items-center
mb-4
"
>

<FiShoppingCart/>

<h2
className="
font-bold
"
>
Cart
</h2>

</div>





{

cart.length===0

?

<p
className="
opacity-50
"
>
No items
</p>


:


cart.map(item=>(


<div

key={item.menuId}

className="
flex
justify-between
items-center
border-b
py-3
"

>


<div>

<p
className="
font-bold
"
>

{item.name}

</p>


<p>
₹{item.price*item.quantity}
</p>

</div>





<div
className="
flex
items-center
gap-2
"
>


<button

onClick={()=>
changeQty(
item.menuId,
"minus"
)
}

>

<FiMinus/>

</button>


<span>
{item.quantity}
</span>


<button

onClick={()=>
changeQty(
item.menuId,
"plus"
)
}

>

<FiPlus/>

</button>



</div>


</div>


))


}







<button

onClick={placeOrder}

disabled={loading}

className="
mt-5
w-full
bg-green-500
text-white
rounded-xl
py-3
font-bold
"

>

{
loading
?
"Sending..."
:
"Place Order"
}

</button>


</div>





</div>



</div>

);


}

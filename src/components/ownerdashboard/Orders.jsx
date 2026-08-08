import React, {
  useMemo,
  useState,
} from "react";

import {
  FiSearch,
  FiShoppingBag,
} from "react-icons/fi";

import KitchenBoard from "../kitchen/KitchenBoard";
import OrderCard from "./OrderCard";



export default function Orders({

  orders = [],

  refresh,

  primaryColor,

}) {


const [activeView,setActiveView] = useState("kitchen");

const [search,setSearch] = useState("");
const [historyActionOrder,setHistoryActionOrder] = useState(null);







// ===============================
// UPDATE STATUS
// ===============================


const updateStatus = async(
  orderId,
  status,
  pauseReason=null
)=>{


try{


await fetch(

`${import.meta.env.VITE_API_URL}/kitchen/orders/${orderId}`,

{

method:"PUT",

headers:{

"Content-Type":"application/json",

Authorization:
`Bearer ${localStorage.getItem("token")}`

},


body:JSON.stringify({

status,

pauseReason

})


}

);


refresh();


}
catch(error){

console.log(
"Status update error",
error
);


}


};









// ===============================
// ACTIVE KITCHEN ORDERS
// ===============================


const kitchenOrders = useMemo(()=>{


return orders.filter(

order =>

![
"delivered",
"cancelled"
]

.includes(
order.status
)

);


},[orders]);









// ===============================
// KITCHEN COLUMNS
// ===============================


const newOrders =
kitchenOrders.filter(

order =>
order.status==="pending"

);




const preparingOrders =
kitchenOrders.filter(

order =>

[
"accepted",
"preparing"
]

.includes(
order.status
)

);




const readyOrders =
kitchenOrders.filter(

order =>
order.status==="ready"

);




const pausedOrders =
kitchenOrders.filter(

order =>
order.status==="paused"

);









// ===============================
// HISTORY
// ===============================


const historyOrders = useMemo(()=>{


return orders.filter(

order =>

[
"delivered",
"cancelled"

]

.includes(
order.status
)

);


},[orders]);







const filteredHistory =
historyOrders.filter(order=>{


if(!search.trim())
return true;


const value =
search.toLowerCase();



return (

String(order._id)
.toLowerCase()
.includes(value)


||


String(

order.locationNumber ||

order.roomNumber ||

""

)

.toLowerCase()

.includes(value)



||


(
order.guestName || ""

)

.toLowerCase()

.includes(value)


);


});

const restoreHistoryOrder = async()=>{
  if(!historyActionOrder) return;
  await updateStatus(historyActionOrder._id,"preparing");
  setHistoryActionOrder(null);
};









// ===============================
// HELPERS
// ===============================


const getLocation=(order)=>{


if(order.orderType==="takeaway"){
return "Takeaway";
}


if(order.locationType==="room"){


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








const waitingTime=(date)=>{


if(!date)
return 0;



return Math.floor(

(
Date.now()
-
new Date(date).getTime()

)

/60000

);


};











return (

<div className="space-y-6">






{/* HEADER */}

<div>

<h1 className="text-2xl font-bold">

Orders

</h1>


<p className="text-sm opacity-70">

Manage kitchen workflow and completed orders

</p>


</div>









{/* SWITCH */}

<div

className="
flex
gap-2
rounded-2xl
border
p-2
"

>


<button

onClick={()=>setActiveView("kitchen")}

className="
rounded-xl
px-5
py-2
text-sm
font-semibold
"

style={{

background:

activeView==="kitchen"

?

primaryColor

:

"transparent",


color:

activeView==="kitchen"

?

"#fff"

:

"inherit"


}}

>

Kitchen Board

</button>







<button

onClick={()=>setActiveView("history")}

className="
rounded-xl
px-5
py-2
text-sm
font-semibold
"

style={{

background:

activeView==="history"

?

primaryColor

:

"transparent",


color:

activeView==="history"

?

"#fff"

:

"inherit"


}}

>

History

</button>


</div>













{/* =========================
    KITCHEN
========================= */}



{
activeView==="kitchen"

&&

<KitchenBoard


newOrders={newOrders}


preparingOrders={preparingOrders}


readyOrders={readyOrders}


pausedOrders={pausedOrders}


updateStatus={updateStatus}


getLocation={getLocation}


getWaitingMinutes={waitingTime}


/>

}













{/* =========================
    HISTORY
========================= */}



{
activeView==="history"

&&

<div className="space-y-4">





<div

className="
flex
items-center
gap-3
rounded-xl
border
px-4
py-3
"

>


<FiSearch/>


<input

value={search}

onChange={
e=>setSearch(e.target.value)
}

placeholder="Search old orders"

className="
w-full
bg-transparent
outline-none
"

/>


</div>










{
filteredHistory.length===0


?

<div

className="
rounded-2xl
border
border-dashed
py-12
text-center
"

>


<FiShoppingBag

className="mx-auto"

size={30}

/>


<p className="mt-3">

No history found

</p>


</div>



:


<div className="space-y-3">


{
filteredHistory.map(order=>(


<OrderCard

key={order._id}

order={order}

onLongPress={setHistoryActionOrder}

/>


))

}


</div>


}



</div>

}





{historyActionOrder && (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
      <p className="font-bold">History actions</p>
      <p className="mt-1 text-sm text-gray-500">Restore this order?</p>
      <button
        type="button"
        onClick={restoreHistoryOrder}
        className="mt-4 w-full rounded-xl bg-orange-500 py-3 font-bold text-white"
      >
        Restore to Preparing
      </button>
      <button
        type="button"
        onClick={() => setHistoryActionOrder(null)}
        className="mt-2 w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-700"
      >
        Close
      </button>
    </div>
  </div>
)}


</div>

);


}

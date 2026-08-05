import React, { useMemo, useState } from "react";
import {
  FiSearch,
  FiFilter,
  FiShoppingBag,
} from "react-icons/fi";

import OrderCard from "./OrderCard";


export default function Orders({
  orders = [],
  orderStats,
  renderOrderCard,
  themeStyles,
  themeText,
  accentColor,
}) {


const [filter,setFilter] = useState("all");
const [search,setSearch] = useState("");



const filteredOrders = useMemo(()=>{


let data = [...orders];


// STATUS FILTER

if(filter !== "all"){

data = data.filter(
(order)=>
order.status === filter
);

}


// SEARCH

if(search.trim()){

const value =
search.toLowerCase();


data =
data.filter(order=>{


const table =
String(
order.locationNumber ||
order.roomNumber ||
""
)
.toLowerCase();



const guest =
(
order.guestName ||
""
)
.toLowerCase();



const id =
(
order._id ||
""
)
.toLowerCase();



return (
table.includes(value) ||
guest.includes(value) ||
id.includes(value)
);

});


}


return data;


},[
orders,
filter,
search
]);





const filters=[

{
key:"all",
label:"All"
},

{
key:"pending",
label:"New"
},

{
key:"accepted",
label:"Accepted"
},

{
key:"preparing",
label:"Preparing"
},

{
key:"ready",
label:"Ready"
},

{
key:"delivered",
label:"Completed"
},

{
key:"cancelled",
label:"Cancelled"
}

];




return (

<div className="space-y-5">



{/* HEADER */}

<div>

<h1 className="text-2xl font-bold">
Orders
</h1>

<p
className="text-sm"
style={{
color:themeStyles.mutedText
}}
>
Manage all restaurant orders
</p>

</div>





{/* SEARCH + FILTER */}

<div
className="
rounded-2xl
border
p-4
space-y-4
"

style={{

background:
themeStyles.surfaceBg,

borderColor:
themeStyles.borderColor

}}

>



<div
className="
flex
items-center
gap-3
rounded-xl
px-3
py-2
border
"

style={{

borderColor:
themeStyles.borderColor

}}

>

<FiSearch
style={{
color:themeStyles.mutedText
}}
/>


<input

value={search}

onChange={
(e)=>
setSearch(e.target.value)
}

placeholder="
Search table, guest or order id
"

className="
bg-transparent
outline-none
w-full
text-sm
"

/>


</div>





<div
className="
flex
gap-2
overflow-x-auto
pb-1
"

>


{
filters.map(item=>(


<button

key={item.key}

onClick={()=>
setFilter(item.key)
}

className="
px-4
py-2
rounded-xl
text-xs
font-semibold
whitespace-nowrap
"

style={{

background:
filter===item.key
?
accentColor
:
"transparent",


color:
filter===item.key
?
"#ffffff"
:
themeText,


border:
`1px solid ${themeStyles.borderColor}`

}}

>

{item.label}

</button>


))

}


</div>



</div>








{/* ORDER LIST */}


{
filteredOrders.length===0 ?


<div

className="
rounded-2xl
border
border-dashed
py-14
text-center
"

style={{

borderColor:
themeStyles.borderColor

}}

>


<FiShoppingBag

className="mx-auto"

size={32}

style={{

color:
themeStyles.mutedText

}}

/>


<p

className="mt-3 text-sm"

style={{

color:
themeStyles.mutedText

}}

>

No orders found

</p>


</div>



:


<div

className="
space-y-3
"

>


{
filteredOrders.map(
(order)=>
renderOrderCard(order)
)
}


</div>


}



</div>

);


}
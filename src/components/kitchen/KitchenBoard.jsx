import React, { useState } from "react";

export default function KitchenBoard({

  newOrders = [],
  preparingOrders = [],
  readyOrders = [],
  pausedOrders = [],

  updateStatus,
  getLocation,
  getWaitingMinutes,

}) {


const [pauseOrder,setPauseOrder] = useState(null);
const [reason,setReason] = useState("");



const handlePause = ()=>{

if(!reason.trim()) return;

updateStatus(
pauseOrder._id,
"paused",
reason
);

setPauseOrder(null);
setReason("");

};





const columns=[

{
title:"🔥 NEW",
orders:newOrders,
color:"text-red-400"
},

{
title:"👨‍🍳 PREPARING",
orders:preparingOrders,
color:"text-yellow-400"
},

{
title:"✅ READY",
orders:readyOrders,
color:"text-green-400"
},

{
title:"⏸ PAUSED",
orders:pausedOrders,
color:"text-orange-400"
}

];





const action=(order)=>{


switch(order.status){

case "pending":
return ["Accept","accepted"];

case "accepted":
return ["Prepare","preparing"];

case "preparing":
return ["Ready","ready"];

case "ready":
return ["Deliver","delivered"];

case "paused":
return ["Resume","preparing"];

default:
return null;

}

};






return (

<div
className="
grid
grid-cols-1
lg:grid-cols-2
2xl:grid-cols-4
gap-3
bg-slate-950
p-3
min-h-screen
text-white
"
>



{
columns.map(col=>(


<div
key={col.title}
className="
bg-slate-900
rounded-xl
border
border-slate-800
overflow-hidden
"
>



{/* HEADER */}

<div
className={`
px-3
py-2
font-black
text-lg
border-b
border-slate-800
${col.color}
`}
>

{col.title}

<span
className="
ml-2
bg-slate-800
text-white
rounded-full
px-2
py-0.5
text-xs
"
>
{col.orders.length}
</span>

</div>








{/* LIST */}


<div
className="
p-2
space-y-2
max-h-[calc(100vh-160px)]
overflow-y-auto
"
>


{
col.orders.length===0 ?


<div
className="
text-center
text-slate-500
text-sm
py-5
"
>
No orders
</div>


:


col.orders.map(order=>{


const btn=action(order);


return (

<div

key={order._id}

className="
bg-slate-950
border
border-slate-800
rounded-lg
p-2
"
>



<div
className="
flex
justify-between
"
>


<div>

<p className="font-bold text-sm">

#{order._id.slice(-5)}

</p>


<p className="text-xs font-semibold">

{getLocation(order)}

</p>


</div>



<p

className={

getWaitingMinutes(order.createdAt)>15

?

"text-red-400 text-xs font-bold"

:

"text-green-400 text-xs"

}

>

⏱ {getWaitingMinutes(order.createdAt)}m

</p>


</div>








<div
className="
mt-2
"
>

{
order.items?.slice(0,2)
.map((item,index)=>(


<p
key={index}
className="
text-xs
text-slate-300
truncate
"
>

{item.name} × {item.quantity}

</p>


))
}


{
order.items?.length>2 &&

<p className="text-[10px] text-slate-500">

+{order.items.length-2} more

</p>

}

</div>








<div
className="
flex
gap-2
mt-2
"
>


{
btn &&

<button

onClick={()=>updateStatus(
order._id,
btn[1]
)}

className="
flex-1
bg-white
text-black
rounded-md
py-1
text-xs
font-bold
"

>

{btn[0]}

</button>

}



{
![
"ready",
"delivered",
"paused"
]
.includes(order.status)

&&

<button

onClick={()=>setPauseOrder(order)}

className="
bg-orange-500
rounded-md
px-2
text-xs
font-bold
"

>
⏸
</button>

}


</div>




</div>

)


})

}



</div>



</div>


))

}









{
pauseOrder &&

<div
className="
fixed
inset-0
bg-black/60
flex
items-center
justify-center
z-50
"
>


<div
className="
bg-white
text-black
rounded-xl
p-5
w-80
"
>


<h2 className="font-bold">
Pause Order
</h2>


<textarea

className="
border
rounded-lg
w-full
mt-3
p-2
"

placeholder="Reason"

value={reason}

onChange={
e=>setReason(e.target.value)
}

/>



<div
className="
flex
gap-2
mt-3
"
>


<button

onClick={()=>{
setPauseOrder(null);
setReason("");
}}

className="
flex-1
bg-gray-200
rounded-lg
py-2
"
>
Cancel
</button>



<button

onClick={handlePause}

className="
flex-1
bg-orange-500
text-white
rounded-lg
py-2
"
>
Pause
</button>


</div>


</div>


</div>

}


</div>

);


}
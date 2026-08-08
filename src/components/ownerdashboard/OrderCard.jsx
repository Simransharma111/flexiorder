import React from "react";
import { FiClock } from "react-icons/fi";


export default function OrderCard({

order,
primaryColor="#2563eb",
onAction,
actionLabel,
onLongPress

}){

let pressTimer;

const startPress=()=>{
  if(!onLongPress) return;
  pressTimer=window.setTimeout(()=>onLongPress(order),550);
};

const endPress=()=>window.clearTimeout(pressTimer);


const location =
order.locationType==="room"
?
`Room ${order.locationNumber || order.roomNumber || "-"}`
:
`Table ${order.locationNumber || order.roomNumber || "-"}`;



const items =
order.items
?.slice(0,2)
.map(
item=>`${item.name} x${item.quantity}`
)
.join(" • ");




const waiting = order.createdAt
?
Math.floor(
(Date.now()-new Date(order.createdAt))
/60000
)
:
0;



return (

<div

className="
rounded-xl
border
px-3
py-2
bg-white
shadow-sm
"

style={{

borderColor:`${primaryColor}40`

}}

onPointerDown={startPress}
onPointerUp={endPress}
onPointerLeave={endPress}
onContextMenu={(event)=>{
  if(!onLongPress) return;
  event.preventDefault();
  onLongPress(order);
}}
title={onLongPress ? "Long press for actions" : undefined}

>


{/* LINE 1 */}

<div

className="
flex
justify-between
items-center
"

>


<div
className="
flex
gap-2
items-center
"
>


<span
className="
font-black
text-sm
"
>

#{order._id?.slice(-5)}

</span>


<span
className="
font-bold
text-sm
"
>

{location}

</span>


</div>



<span

className="
text-xs
flex
items-center
gap-1
opacity-70
"

>

<FiClock size={11}/>

{waiting}m

</span>


</div>





{/* LINE 2 */}


<div

className="
mt-1
flex
justify-between
items-center
"

>


<p

className="
text-xs
truncate
max-w-[70%]
"

>

{items || "No items"}

</p>




{
onAction &&

<button

onClick={()=>onAction(order)}

className="
px-3
py-1
rounded-lg
text-[11px]
font-bold
text-white
"

style={{

background:primaryColor

}}

>

{actionLabel}

</button>

}



</div>



</div>

);

}

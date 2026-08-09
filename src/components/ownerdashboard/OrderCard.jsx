import { useEffect, useRef } from "react";
import { FiClock, FiMoreVertical } from "react-icons/fi";
import { orderLocation } from "../../utils/orderModel";


export default function OrderCard({

order,
primaryColor="#2563eb",
onAction,
actionLabel,
onLongPress

}){

const pressTimer = useRef(null);

const startPress=()=>{
  if(!onLongPress) return;
  pressTimer.current=window.setTimeout(()=>onLongPress(order),550);
};

const endPress=()=>window.clearTimeout(pressTimer.current);

useEffect(() => () => window.clearTimeout(pressTimer.current), []);

const location = orderLocation(order);



const items =
(Array.isArray(order.items) ? order.items : [])
.slice(0,2)
.map(
item=>`${item.name} x${item.quantity}`
)
.join(" • ");




const orderTime = order.createdAt
  ? new Date(order.createdAt).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })
  : "";



return (

<article

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
aria-label={onLongPress ? `${location} history actions` : undefined}

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

<span className="text-xs opacity-60">
{orderTime}
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

{order.status === "cancelled" ? "Cancelled" : "Delivered"}

</span>

{onLongPress && (
  <button
    type="button"
    className="ops-history-more"
    aria-label={`More options for ${location}`}
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => {
      event.stopPropagation();
      onLongPress(order);
    }}
  >
    <FiMoreVertical />
  </button>
)}


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



</article>

);

}

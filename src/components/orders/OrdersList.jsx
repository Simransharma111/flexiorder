import React, { useState } from "react";
import {
  FiSearch,
  FiArrowRight,
} from "react-icons/fi";


export default function OrdersList({
  orders,
  statusConfig,
  formatTime,
  getLocationLabel,
  onManage,

  primaryColor,
  accentColor,

  themeText,
  mutedText,

  surfaceBg,
  borderColor,
}) {


const [search,setSearch]=useState("");



const filtered =
orders.filter(order=>{


const text = 
`${order.guestName || ""}
${order._id}
${getLocationLabel(order)}
`
.toLowerCase();



return text.includes(
search.toLowerCase()
);


});



return (

<div className="space-y-4">


{/* SEARCH */}

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
style={{
background:surfaceBg,
borderColor
}}
>


<FiSearch
style={{
color:mutedText
}}
/>


<input

value={search}

onChange={(e)=>
setSearch(e.target.value)
}

placeholder="Search orders..."

className="
w-full
bg-transparent
outline-none
text-sm
"

/>


</div>





{/* ORDER LIST */}


<div
className="
rounded-2xl
border
overflow-hidden
"
style={{
borderColor
}}
>


{
filtered.length===0 ?


<div
className="
p-10
text-center
"
style={{
color:mutedText
}}
>

No orders found


</div>



:


<div>


{
filtered.map(order=>{


const status =
statusConfig[order.status] ||
statusConfig.pending;


const StatusIcon =
status.icon;



return (

<div

key={order._id}

className="
flex
items-center
justify-between
gap-4
border-b
px-4
py-3
transition
hover:opacity-80
"

style={{

background:surfaceBg,

borderColor

}}

>


{/* LEFT */}

<div className="flex items-center gap-4">


<div

className="
h-10
w-10
rounded-xl
flex
items-center
justify-center
font-bold
"

style={{

background:
`${primaryColor}30`,

color:accentColor

}}

>

{order.items?.length || 0}

</div>




<div>


<p className="font-semibold">

{getLocationLabel(order)}

</p>



<p
className="text-xs"
style={{
color:mutedText
}}
>

{
order.guestName ||
"Guest"
}

&nbsp; • &nbsp;

{
formatTime(
order.createdAt
)
}

</p>


</div>


</div>







{/* CENTER */}

<div
className="
hidden
md:block
"
>


<p
className="text-sm"
>

₹
{
Number(
order.totalAmount||0
)
.toFixed(2)
}


</p>


<p
className="text-xs"
style={{
color:mutedText
}}
>

#
{
order._id?.slice(-6)
}

</p>


</div>







{/* STATUS */}

<div>


<span

className="
flex
items-center
gap-1
rounded-full
border
px-3
py-1
text-xs
"

style={{

borderColor:
`${accentColor}50`,

color:accentColor

}}

>


<StatusIcon size={12}/>


{
status.label
}


</span>


</div>








{/* ACTION */}

<button

onClick={()=>
onManage(order)
}

className="
flex
items-center
gap-1
rounded-lg
px-3
py-2
text-xs
font-semibold
"

style={{
color:accentColor
}}

>


Manage

<FiArrowRight size={13}/>


</button>



</div>

)


})

}


</div>


}


</div>


</div>


);

}
import React from "react";
import {
  FiClock,
  FiCheckCircle,
  FiActivity,
  FiAlertCircle,
} from "react-icons/fi";


const STATUS = {

pending:{
 label:"New",
 icon:FiClock,
 color:"#f59e0b"
},

accepted:{
 label:"Accepted",
 icon:FiCheckCircle,
 color:"#3b82f6"
},

preparing:{
 label:"Preparing",
 icon:FiActivity,
 color:"#f97316"
},

ready:{
 label:"Ready",
 icon:FiCheckCircle,
 color:"#22c55e"
},

delivered:{
 label:"Completed",
 icon:FiCheckCircle,
 color:"#64748b"
},

cancelled:{
 label:"Cancelled",
 icon:FiAlertCircle,
 color:"#ef4444"
}

};



export default function OrdersTable({

orders,
formatTime,
getLocationLabel,
themeText,
mutedText,
borderColor,
surfaceBg,
accentColor

}){


return (

<div
className="rounded-2xl border overflow-hidden"
style={{
background:surfaceBg,
borderColor
}}
>


<div className="overflow-x-auto">


<table className="w-full text-sm">


<thead>

<tr
className="border-b"
style={{
borderColor
}}
>

<th className="px-5 py-4 text-left">
Order
</th>


<th className="px-5 py-4 text-left">
Location
</th>


<th className="px-5 py-4 text-left">
Customer
</th>


<th className="px-5 py-4 text-left">
Items
</th>


<th className="px-5 py-4 text-left">
Status
</th>


<th className="px-5 py-4 text-right">
Amount
</th>


</tr>

</thead>



<tbody>


{
orders.map((order)=>{


const status =
STATUS[order.status] || STATUS.pending;


const StatusIcon=status.icon;



return (

<tr
key={order._id}
className="border-b hover:bg-white/5 transition"
style={{
borderColor
}}
>


<td className="px-5 py-4">

<div
className="font-semibold"
style={{
color:themeText
}}
>
#{order._id?.slice(-6)}
</div>


<p
className="text-xs"
style={{
color:mutedText
}}
>
{formatTime(order.createdAt)}
</p>

</td>



<td className="px-5 py-4">

{getLocationLabel(order)}

</td>




<td className="px-5 py-4">

{order.guestName || "Guest"}

</td>




<td className="px-5 py-4">

{order.items?.length || 0} items

</td>




<td className="px-5 py-4">


<span
className="flex items-center gap-1 w-fit rounded-full px-3 py-1 text-xs font-medium"
style={{
background:`${status.color}20`,
color:status.color
}}
>

<StatusIcon size={13}/>

{status.label}

</span>


</td>




<td
className="px-5 py-4 text-right font-bold"
style={{
color:accentColor
}}
>

₹{Number(order.totalAmount||0).toFixed(2)}

</td>



</tr>


)


})

}



</tbody>


</table>


</div>


</div>


)

}
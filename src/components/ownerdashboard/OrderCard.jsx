import React from "react";
import {
  FiArrowRight,
  FiClock,
} from "react-icons/fi";


export default function OrderCard({

  order,
  statusConfig,
  formatTime,
  getLocationLabel,
  onManage,

  primaryColor,
  accentColor,
  mutedText,
  themeText,
  surfaceBg,
  borderColor,
  itemBg,

}) {


const status =
statusConfig[order.status] ||
statusConfig.pending;


const StatusIcon =
status.icon;



return (

<div

className="
rounded-2xl
border
p-3
transition
hover:scale-[1.01]
"

style={{

background:surfaceBg,

borderColor,

color:themeText

}}

>





{/* TOP SECTION */}

<div

className="
flex
items-center
justify-between
gap-3
"

>


<div>


<div

className="
flex
items-center
gap-2
"

>


<h3
className="
font-bold
text-sm
"
>

{getLocationLabel(order)}

</h3>



<span

className="
flex
items-center
gap-1
rounded-full
px-2
py-1
text-[11px]
font-semibold
"

style={{

background:
`${accentColor}20`,

color:
accentColor

}}

>

<StatusIcon size={11}/>

{status.label}

</span>


</div>




<p

className="
mt-1
text-xs
flex
items-center
gap-1
"

style={{

color:mutedText

}}

>

<FiClock size={12}/>

{order.guestName || "Guest"}

&nbsp;•

&nbsp;

{formatTime(order.createdAt)}

</p>



</div>





<div className="text-right">


<p

className="
font-bold
text-base
"

style={{

color:accentColor

}}

>

₹{Number(
order.totalAmount || 0
).toFixed(2)}

</p>



<p

className="
text-[10px]
"

style={{

color:mutedText

}}

>

#{order._id?.slice(-6)}

</p>


</div>


</div>








{/* ITEMS */}

<div

className="
mt-3
space-y-1.5
"

>


{
order.items
?.slice(0,3)
.map(
(item,index)=>(


<div

key={index}

className="
flex
justify-between
items-center
rounded-lg
px-2.5
py-1.5
text-xs
"

style={{

background:itemBg

}}

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
flex
h-5
w-5
items-center
justify-center
rounded-md
text-[10px]
font-bold
"

style={{

background:
`${primaryColor}40`,

color:
accentColor

}}

>

{item.quantity}

</span>


<span>

{item.name}

</span>


</div>




<span

style={{

color:mutedText

}}

>

₹{
Number(
item.price *
item.quantity
)
.toFixed(0)
}

</span>



</div>


))


}



{
order.items?.length > 3 && (

<p

className="
text-[11px]
mt-1
"

style={{

color:mutedText

}}

>

+ {order.items.length - 3}
more items

</p>

)

}



</div>








{/* FOOTER */}

<div

className="
mt-3
pt-2
border-t
flex
justify-between
items-center
"

style={{

borderColor:
`${themeText}20`

}}

>


<p

className="
text-[11px]
"

style={{

color:mutedText

}}

>

{order.items?.length || 0} items

</p>




<button

onClick={onManage}

className="
flex
items-center
gap-1
text-xs
font-semibold
"

style={{

color:accentColor

}}

>

Manage

<FiArrowRight size={12}/>

</button>



</div>




</div>

);


}
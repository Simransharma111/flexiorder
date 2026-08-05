import React from "react";

import {
FiArrowRight,
FiShoppingBag
} from "react-icons/fi";


export default function RecentOrders({

orders,

renderOrderCard,

onViewAll,

themeStyles,

accentColor

}){


return (

<section>


<div className="
mb-3
flex
items-center
justify-between
">


<div>

<h2 className="text-lg font-bold">
Recent Orders
</h2>


<p

className="text-xs"

style={{
color:themeStyles.mutedText
}}

>

Latest activity

</p>


</div>



<button

onClick={onViewAll}

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

View all

<FiArrowRight size={13}/>


</button>


</div>



{
orders.length===0 ?

(

<div

className="
rounded-2xl
border
border-dashed
py-12
text-center
"

style={{

borderColor:
themeStyles.borderColor

}}

>


<FiShoppingBag

className="mx-auto"

size={28}

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

No orders yet

</p>


</div>

)

:

(

<div

className="
space-y-3
"

>


{

orders
.slice(0,6)
.map(order=>

<div key={order._id}>

{renderOrderCard(order)}

</div>

)

}


</div>

)

}


</section>


)


}
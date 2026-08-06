import React from "react";

import {
  FiCreditCard,
  FiShoppingBag,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";


export default function DashboardHome({

stats,

primaryColor,

accentColor,

}){


const cards=[

{
  title: "Revenue",
  value: `₹${Math.round(stats?.revenue || 0).toLocaleString("en-IN")}`,
  icon: FiCreditCard,
},
{
title:"Orders",
value:stats?.orders || 0,
icon:FiShoppingBag,
},

{
title:"Preparing",
value:stats?.preparing || 0,
icon:FiClock,
},

{
title:"Ready",
value:stats?.ready || 0,
icon:FiCheckCircle,
},

];





return (

<div

className="
space-y-6
"

>


{/* WELCOME */}


<div

className="
rounded-3xl
p-6
"

style={{

background:
`linear-gradient(135deg,${primaryColor},${accentColor})`,

color:"#fff"

}}

>


<h1

className="
text-2xl
font-bold
"

>

Welcome back 👋

</h1>


<p

className="
mt-2
text-sm
opacity-90
"

>

Here is today's hotel performance overview.

</p>


</div>









{/* KPI CARDS */}


<div

className="
grid
grid-cols-1
gap-4
sm:grid-cols-2
xl:grid-cols-4
"

>


{

cards.map((card)=>{


const Icon=card.icon;


return (

<div

key={card.title}

className="
rounded-3xl
border
p-5
shadow-sm
"

style={{

borderColor:`${primaryColor}30`

}}

>


<div

className="
flex
items-center
justify-between
"

>


<div>


<p

className="
text-sm
opacity-70
"

>

{card.title}

</p>



<h2

className="
mt-2
text-3xl
font-bold
"

>

{card.value}

</h2>



</div>



<div

className="
flex
h-12
w-12
items-center
justify-center
rounded-2xl
"

style={{

background:primaryColor,

color:"#fff"

}}

>

<Icon size={22}/>

</div>


</div>


</div>


);


})


}


</div>







{/* SUMMARY */}


<div

className="
grid
gap-4
md:grid-cols-3
"

>


<div

className="
rounded-3xl
border
p-5
"

style={{

borderColor:`${primaryColor}30`

}}

>

<p className="text-sm opacity-70">

Pending Orders

</p>


<h3 className="mt-2 text-2xl font-bold">

{
stats?.pending || 0
}

</h3>


</div>





<div

className="
rounded-3xl
border
p-5
"

style={{

borderColor:`${primaryColor}30`

}}

>

<p className="text-sm opacity-70">

Kitchen Status

</p>


<h3 className="mt-2 text-2xl font-bold">

{
(stats?.preparing || 0)
+
(stats?.ready || 0)
}

Active

</h3>


</div>






<div

className="
rounded-3xl
border
p-5
"

style={{

borderColor:`${primaryColor}30`

}}

>

<p className="text-sm opacity-70">

Today's Orders

</p>


<h3 className="mt-2 text-2xl font-bold">

{
stats?.orders || 0
}

</h3>


</div>



</div>



</div>

);


}
import React from "react";

import {
  FiActivity,
  FiArrowRight,
  FiPackage,
  FiShoppingBag,
  FiTable,
  FiUsers,
} from "react-icons/fi";


import StatGrid from "./StatGrid";



function hexToRgba(hex, alpha = 1) {

  if (!hex)
    return `rgba(255,255,255,${alpha})`;


  let h = hex.replace("#", "");


  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }


  const num = parseInt(h,16);


  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;


  return `rgba(${r},${g},${b},${alpha})`;

}




export default function Overview({

  hotel,

  orders = [],

  orderStats = {},

  onChangeTab,

  renderOrderCard,

  primaryColor,

  secondaryColor,

  accentColor,

  themeText,

  themeStyles,

  onViewAll,

}) {



const safeStats = {

total: orderStats.total || 0,

active: orderStats.active || 0,

pending: orderStats.pending || 0,

preparing: orderStats.preparing || 0,

revenue: orderStats.revenue || 0,

};




const heroBackground = hotel?.coverImage

?
`linear-gradient(
90deg,
${hexToRgba(secondaryColor,0.95)},
${hexToRgba(secondaryColor,0.65)}
),
url(${hotel.coverImage})`

:

`linear-gradient(
90deg,
${hexToRgba(secondaryColor,0.95)},
${hexToRgba(secondaryColor,0.65)}
)`;






return (

<div className="space-y-6">



{/* HERO */}

<div

className="
relative
overflow-hidden
rounded-3xl
border
p-6
"

style={{

backgroundImage:heroBackground,

backgroundSize:"cover",

backgroundPosition:"center",

borderColor:
themeStyles.borderColor,

color:themeText

}}

>



<div className="relative z-10">


<div className="
flex
items-center
gap-4
mb-5
">


{
hotel?.logo && (

<img

src={hotel.logo}

alt="Hotel"

className="
h-20
w-20
rounded-2xl
object-cover
border
border-white/30
"

/>

)

}



<div>

<h1 className="
text-3xl
font-bold
">

{hotel?.name || "FlexiOrder"}

</h1>


<p className="opacity-80">

{hotel?.tagline}

</p>


</div>


</div>



<p

className="
text-sm
font-semibold
"

style={{
color:accentColor
}}

>

Welcome back

</p>



<h2 className="
text-2xl
font-bold
mt-1
">

Manage your restaurant

</h2>



<p

className="
mt-2
text-sm
max-w-xl
leading-6
"

style={{
color:hexToRgba(themeText,0.75)
}}

>

Monitor orders, manage menu, coordinate kitchen and run your restaurant smoothly.

</p>





<div className="
mt-5
flex
gap-3
flex-wrap
">


<button

onClick={()=>onChangeTab("kitchen")}

className="
px-4
py-2.5
rounded-xl
font-semibold
flex
items-center
gap-2
text-sm
"

style={{

background:primaryColor,

color:themeText

}}

>

<FiActivity/>

Open Kitchen

</button>



<button

onClick={()=>onChangeTab("menu")}

className="
px-4
py-2.5
rounded-xl
border
font-semibold
flex
items-center
gap-2
text-sm
"

style={{

borderColor:
themeStyles.borderColor,

background:
hexToRgba(themeText,0.08),

color:themeText

}}

>

<FiPackage/>

Manage Menu

</button>



</div>



</div>


</div>








{/* STATS */}

<StatGrid

orderStats={safeStats}

theme={{

primaryColor,

accentColor,

mutedText:
themeStyles.mutedText,

surfaceBg:
themeStyles.surfaceBg,

borderColor:
themeStyles.borderColor,

themeText

}}

/>








{/* QUICK ACTIONS */}

<section>


<h2 className="
text-lg
font-bold
">

Quick Actions

</h2>


<p

className="
text-xs
mb-3
"

style={{
color:themeStyles.mutedText
}}

>

Manage your restaurant quickly

</p>





<div className="
grid
grid-cols-2
md:grid-cols-4
gap-3
">



{
[
{
key:"kitchen",
icon:FiActivity,
title:"Kitchen",
text:`${safeStats.active} active orders`
},

{
key:"menu",
icon:FiPackage,
title:"Menu",
text:"Manage dishes"
},

{
key:"staff",
icon:FiUsers,
title:"Staff",
text:"Manage team"
},

{
key:"tables",
icon:FiTable,
title:"QR Tables",
text:"Manage QR codes"
}

].map((item)=>{


const Icon=item.icon;


return (

<button

key={item.key}

onClick={()=>onChangeTab(item.key)}

className="
rounded-2xl
border
p-4
text-left
"

style={{

background:
themeStyles.surfaceBg,

borderColor:
themeStyles.borderColor,

color:themeText

}}

>


<div

className="
w-10
h-10
rounded-xl
flex
items-center
justify-center
mb-3
"

style={{

background:`${primaryColor}25`,

color:accentColor

}}

>

<Icon/>

</div>



<p className="font-semibold">

{item.title}

</p>


<p

className="
text-xs
mt-1
"

style={{
color:themeStyles.mutedText
}}

>

{item.text}

</p>



</button>

)

})

}


</div>


</section>









{/* RECENT ORDERS */}


<section>


<div className="
flex
justify-between
items-center
mb-3
">


<div>

<h2 className="
text-lg
font-bold
">

Recent Orders

</h2>


<p

className="
text-xs
"

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

<FiArrowRight/>

</button>



</div>





{
orders.length===0

?

<div

className="
border
border-dashed
rounded-2xl
py-12
text-center
"

style={{

borderColor:
themeStyles.borderColor

}}

>

<FiShoppingBag

size={28}

className="mx-auto"

/>


<p

className="
mt-3
text-sm
"

style={{
color:themeStyles.mutedText
}}

>

No orders yet

</p>


</div>



:


<div className="
space-y-3
">

{

orders
.slice(0,6)
.map(order=>

renderOrderCard(order)

)

}

</div>


}



</section>




</div>

);

}